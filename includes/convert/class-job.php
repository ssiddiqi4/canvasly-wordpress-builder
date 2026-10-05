<?php
/**
 * Batched, resumable conversion job.
 *
 * Large sites cannot convert every page in one request. A job stores the
 * list of posts and a cursor in one option, and each step converts a small
 * batch inside a time and memory budget, saving the cursor after every post
 * (the checkpoint). Closing the browser, a timeout or a fatal error never
 * loses progress: the next step - from the Tools screen, the REST API or
 * WP-CLI - carries on from the checkpoint.
 *
 * Every failure is recorded with the post and the source element where it
 * stopped (for example "section#4f2a > column#9c1d > slides#77ab"). A page
 * that fails is never half-written: conversion happens in memory and is only
 * saved when it completed.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Convert;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Job {

	const OPTION = 'sidcraft_page_builder_convert_job';
	const LOCK   = 'sidcraft_page_builder_convert_lock';
	const MODES  = array( 'dry', 'stage', 'in_place', 'copy' );

	/** @var array|null Job being stepped, for the shutdown handler. */
	private static $running = null;

	public static function init() {
		add_action( 'sidcraft_page_builder_rest_register_routes', array( self::class, 'routes' ) );
	}

	public static function can_manage() {
		return current_user_can( 'manage_options' );
	}

	/* ------------------------------------------------------------------ */
	/* State                                                               */
	/* ------------------------------------------------------------------ */

	/**
	 * @return array|null
	 */
	public static function get() {
		$job = get_option( self::OPTION, null );
		return is_array( $job ) && ! empty( $job['id'] ) ? $job : null;
	}

	/**
	 * @param array $job
	 */
	private static function put( array $job ) {
		$job['updated'] = time();
		update_option( self::OPTION, $job, false );
	}

	/**
	 * Start a job. Replaces a finished or cancelled one; refuses while one is
	 * still running so two people cannot convert the same pages at once.
	 *
	 * @param array $args {ids:int[], mode:string, force:bool, stage_target:string, batch:int}
	 * @return array|\WP_Error
	 */
	public static function start( array $args ) {
		$current = self::get();
		if ( $current && in_array( $current['status'], array( 'running', 'paused' ), true ) && empty( $args['replace'] ) ) {
			return new \WP_Error( 'job_exists', __( 'A conversion is already in progress. Resume or cancel it first.', 'sidcraft-page-builder' ), array( 'job' => self::public_view( $current ) ) );
		}
		$mode = in_array( $args['mode'] ?? '', self::MODES, true ) ? $args['mode'] : 'stage';
		$ids  = Tool::ids_from( $args['ids'] ?? array() );
		if ( ! $ids ) {
			$ids = Converter::candidate_ids();
		}
		if ( ! $ids ) {
			return new \WP_Error( 'no_candidates', __( 'No pages with convertible builder data were found.', 'sidcraft-page-builder' ) );
		}
		$job = array(
			'id'           => function_exists( 'wp_generate_uuid4' ) ? wp_generate_uuid4() : uniqid( 'job', true ),
			'status'       => 'running',
			'mode'         => $mode,
			'force'        => ! empty( $args['force'] ),
			'stage_target' => ( $args['stage_target'] ?? '' ) === 'copy' ? 'copy' : 'in_place',
			'batch'        => max( 1, min( 50, absint( $args['batch'] ?? 5 ) ) ),
			'ids'          => $ids,
			'total'        => count( $ids ),
			'cursor'       => 0,
			'current'      => null,
			'counts'       => array(
				'converted' => 0,
				'staged'    => 0,
				'skipped'   => 0,
				'errors'    => 0,
				'mapped'    => 0,
				'nodes'     => 0,
				'dynamic'   => 0,
			),
			'unmapped'     => array(),
			'items'        => array(),
			'failures'     => array(),
			'by'           => get_current_user_id(),
			'created'      => time(),
			'updated'      => time(),
			'steps'        => 0,
		);
		self::put( $job );
		return self::public_view( $job );
	}

	/**
	 * Convert the next batch.
	 *
	 * @param float $budget Seconds this step may use (stops after the post in progress).
	 * @return array|\WP_Error
	 */
	public static function step( $budget = 0.0 ) {
		$job = self::get();
		if ( ! $job ) {
			return new \WP_Error( 'no_job', __( 'There is no conversion job.', 'sidcraft-page-builder' ) );
		}
		if ( $job['status'] === 'paused' ) {
			$job['status'] = 'running';
		}
		if ( $job['status'] !== 'running' ) {
			return self::public_view( $job );
		}
		if ( ! self::lock() ) {
			return new \WP_Error( 'job_busy', __( 'Another request is converting the next batch. Try again in a moment.', 'sidcraft-page-builder' ), array( 'status' => 409 ) );
		}
		$budget = $budget > 0 ? (float) $budget : self::default_budget();
		$start  = microtime( true );
		try {
			// A step that died mid-post (fatal error, timeout) left its checkpoint.
			if ( ! empty( $job['current'] ) ) {
				$job = self::record_crash( $job, $job['current'] );
			}
			self::$running = $job;
			register_shutdown_function( array( self::class, 'on_shutdown' ) );
			$done = 0;
			while ( $job['cursor'] < $job['total'] && $done < $job['batch'] ) {
				if ( $done > 0 && ( microtime( true ) - $start ) > $budget ) {
					break;
				}
				if ( $done > 0 && self::memory_tight() ) {
					break;
				}
				$id             = (int) $job['ids'][ $job['cursor'] ];
				$job['current'] = array(
					'post'    => $id,
					'started' => time(),
				);
				self::put( $job ); // Checkpoint before the post.
				self::$running = $job;
				$job           = self::convert_one( $job, $id );
				++$job['cursor'];
				$job['current'] = null;
				self::put( $job ); // Checkpoint after the post.
				self::$running = $job;
				++$done;
				if ( function_exists( 'wp_cache_flush_runtime' ) ) {
					wp_cache_flush_runtime();
				}
			}
			++$job['steps'];
			if ( $job['cursor'] >= $job['total'] ) {
				$job['status'] = 'done';
			}
			self::put( $job );
			self::$running = null;
		} finally {
			self::unlock();
		}
		return self::public_view( $job );
	}

	/**
	 * @param array $job
	 * @param int   $id
	 * @return array
	 */
	private static function convert_one( array $job, $id ) {
		$conv   = new Converter();
		$target = $id;
		$args   = array(
			'dry_run' => $job['mode'] === 'dry',
			'force'   => $job['mode'] === 'copy' ? true : ! empty( $job['force'] ),
		);
		if ( $job['mode'] === 'stage' ) {
			$args['stage']        = true;
			$args['stage_target'] = $job['stage_target'];
		}
		try {
			if ( $job['mode'] === 'copy' ) {
				// Convert first (in memory), copy only when it worked.
				$check = $conv->convert_post( $id, array( 'dry_run' => true ) );
				if ( is_wp_error( $check ) ) {
					return self::add_result( $job, $id, $check );
				}
				$target = Tool::duplicate_as_copy( $id );
				if ( ! $target ) {
					return self::add_result( $job, $id, new \WP_Error( 'copy_failed', __( 'The copy could not be created.', 'sidcraft-page-builder' ) ) );
				}
			}
			$one = $conv->convert_post( $target, $args );
		} catch ( \Throwable $e ) {
			$at  = $conv->failure();
			$one = new \WP_Error(
				'convert_failed',
				$e->getMessage(),
				array(
					'node' => $at['node'] ?? '',
					'type' => $at['type'] ?? '',
					'path' => $at['path'] ?? '',
				)
			);
		}
		return self::add_result( $job, $id, $one, $target !== $id ? $target : 0 );
	}

	/**
	 * @param array           $job
	 * @param int             $id
	 * @param array|\WP_Error $one
	 * @param int             $copy
	 * @return array
	 */
	private static function add_result( array $job, $id, $one, $copy = 0 ) {
		$title = get_the_title( $id );
		if ( is_wp_error( $one ) ) {
			$data = (array) $one->get_error_data();
			++$job['counts']['errors'];
			$job['failures'][] = array(
				'post'    => $id,
				'title'   => $title,
				'node'    => (string) ( $data['node'] ?? '' ),
				'type'    => (string) ( $data['type'] ?? '' ),
				'path'    => (string) ( $data['path'] ?? '' ),
				'message' => $one->get_error_message(),
			);
			$job['failures'] = array_slice( $job['failures'], -1000 );
			$row             = array(
				'id'     => $id,
				'title'  => $title,
				'status' => 'error',
				'error'  => $one->get_error_message(),
				'path'   => (string) ( $data['path'] ?? '' ),
			);
		} else {
			$status = (string) ( $one['status'] ?? '' );
			$rep    = (array) ( $one['report'] ?? array() );
			if ( $status === 'skipped' ) {
				++$job['counts']['skipped'];
			} elseif ( $status === 'staged' ) {
				++$job['counts']['staged'];
			} else {
				++$job['counts']['converted'];
			}
			$job['counts']['mapped']  += (int) ( $rep['mapped'] ?? 0 );
			$job['counts']['nodes']   += (int) ( $rep['nodes'] ?? 0 );
			$job['counts']['dynamic'] += count( (array) ( $rep['dynamic'] ?? array() ) );
			foreach ( (array) ( $rep['unmapped'] ?? array() ) as $t => $n ) {
				$job['unmapped'][ $t ] = (int) ( $job['unmapped'][ $t ] ?? 0 ) + (int) $n;
			}
			$row = array(
				'id'       => $id,
				'title'    => $title,
				'status'   => $status,
				'reason'   => (string) ( $one['reason'] ?? '' ),
				'copy'     => (int) $copy,
				'mapped'   => (int) ( $rep['mapped'] ?? 0 ),
				'unmapped' => array_sum( array_map( 'intval', (array) ( $rep['unmapped'] ?? array() ) ) ),
				'dynamic'  => count( (array) ( $rep['dynamic'] ?? array() ) ),
			);
		}
		$job['items'][] = $row;
		$job['items']   = array_slice( $job['items'], -500 );
		return $job;
	}

	/**
	 * The previous step stopped inside a post: report it and move past it.
	 *
	 * @param array $job
	 * @param array $current
	 * @param array $path Source element path, when known.
	 * @param string $why
	 * @return array
	 */
	private static function record_crash( array $job, array $current, array $path = array(), $why = '' ) {
		$id = (int) ( $current['post'] ?? 0 );
		if ( ! $path && ! empty( $current['path'] ) ) {
			$path = (array) $current['path'];
		}
		$last = $path ? (string) end( $path ) : '';
		$node = $last !== '' && strpos( $last, '#' ) !== false ? substr( $last, strpos( $last, '#' ) + 1 ) : '';
		$msg  = $why !== '' ? $why : __( 'The request stopped while this page was being converted (time limit or fatal error). The page was not changed; it was skipped so the job could continue.', 'sidcraft-page-builder' );
		$job  = self::add_result(
			$job,
			$id,
			new \WP_Error(
				'convert_stopped',
				$msg,
				array(
					'node' => $node,
					'type' => $last !== '' ? strtok( $last, '#' ) : '',
					'path' => implode( ' > ', $path ),
				)
			)
		);
		if ( isset( $job['ids'][ $job['cursor'] ] ) && (int) $job['ids'][ $job['cursor'] ] === $id ) {
			++$job['cursor'];
		}
		$job['current'] = null;
		if ( $job['cursor'] >= $job['total'] ) {
			$job['status'] = 'done';
		}
		return $job;
	}

	/**
	 * Fatal error or timeout during a step: write down where it stopped.
	 */
	public static function on_shutdown() {
		$job = self::$running;
		if ( ! $job || empty( $job['current'] ) ) {
			return;
		}
		$err = error_get_last();
		if ( ! $err || ! in_array( $err['type'], array( E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR ), true ) ) {
			return;
		}
		$where = Converter::current();
		$path  = (int) ( $where['post'] ?? 0 ) === (int) $job['current']['post'] ? (array) ( $where['path'] ?? array() ) : array();
		$why   = sprintf(
			/* translators: %s: PHP error message */
			__( 'Stopped by a PHP error: %s. The page was not changed.', 'sidcraft-page-builder' ),
			wp_strip_all_tags( (string) $err['message'] )
		);
		$job = self::record_crash( $job, $job['current'], $path, $why );
		self::put( $job );
		self::unlock();
	}

	/**
	 * @return bool
	 */
	private static function memory_tight() {
		$limit = function_exists( 'wp_convert_hr_to_bytes' ) ? wp_convert_hr_to_bytes( (string) ini_get( 'memory_limit' ) ) : 0;
		if ( $limit <= 0 ) {
			return false;
		}
		return memory_get_usage( true ) > $limit * 0.75;
	}

	/**
	 * @return float
	 */
	private static function default_budget() {
		$max = (int) ini_get( 'max_execution_time' );
		// Leave headroom under the PHP limit; WP-CLI has none.
		$budget = $max > 0 ? max( 2, min( 15, $max / 3 ) ) : 15;
		return (float) apply_filters( 'sidcraft_page_builder_convert_step_seconds', $budget );
	}

	private static function lock() {
		$now  = time();
		$held = (int) get_option( self::LOCK, 0 );
		if ( $held && $now - $held < 120 ) {
			return false;
		}
		if ( $held ) {
			delete_option( self::LOCK );
		}
		return add_option( self::LOCK, $now, '', false );
	}

	private static function unlock() {
		delete_option( self::LOCK );
	}

	/**
	 * @return bool
	 */
	public static function cancel() {
		$job = self::get();
		if ( ! $job ) {
			return false;
		}
		$job['status']  = $job['status'] === 'done' ? 'done' : 'cancelled';
		$job['current'] = null;
		self::put( $job );
		self::unlock();
		return true;
	}

	/**
	 * @return bool
	 */
	public static function pause() {
		$job = self::get();
		if ( ! $job || $job['status'] !== 'running' ) {
			return false;
		}
		$job['status'] = 'paused';
		self::put( $job );
		return true;
	}

	/**
	 * Job state without the full ID list.
	 *
	 * @param array $job
	 * @return array
	 */
	public static function public_view( array $job ) {
		$out = $job;
		unset( $out['ids'] );
		$out['remaining'] = max( 0, (int) $job['total'] - (int) $job['cursor'] );
		$out['percent']   = $job['total'] ? (int) floor( 100 * $job['cursor'] / $job['total'] ) : 100;
		$out['stalled']   = $job['status'] === 'running' && time() - (int) $job['updated'] > 120;
		$out['review']    = $job['mode'] === 'stage' && class_exists( Review::class ) ? Review::url() : '';
		$out['items']     = array_slice( (array) $job['items'], -50 );
		return $out;
	}

	/**
	 * The job as a convert_posts()-style report for Tool::render_report().
	 *
	 * @param array $job
	 * @return array
	 */
	public static function as_report( array $job ) {
		return array(
			'posts'     => (int) $job['cursor'],
			'converted' => (int) $job['counts']['converted'],
			'staged'    => (int) $job['counts']['staged'],
			'skipped'   => (int) $job['counts']['skipped'],
			'errors'    => (int) $job['counts']['errors'],
			'mapped'    => (int) $job['counts']['mapped'],
			'nodes'     => (int) $job['counts']['nodes'],
			'globals'   => 0,
			'unmapped'  => (array) $job['unmapped'],
			'warnings'  => array(),
			'dry_run'   => $job['mode'] === 'dry',
			'items'     => (array) $job['items'],
		);
	}

	/* ------------------------------------------------------------------ */
	/* REST                                                                */
	/* ------------------------------------------------------------------ */

	/**
	 * @param string $namespace
	 */
	public static function routes( $namespace ) {
		$ns    = $namespace !== '' ? $namespace : 'sidcraft-page-builder/v1';
		$perm  = array( self::class, 'can_manage' );
		$route = function ( $path, $method, $cb ) use ( $ns, $perm ) {
			register_rest_route(
				$ns,
				$path,
				array(
					'methods'             => $method,
					'callback'            => $cb,
					'permission_callback' => $perm,
				)
			);
		};
		$route( '/convert/job', 'GET', array( self::class, 'rest_get' ) );
		$route( '/convert/job', 'POST', array( self::class, 'rest_start' ) );
		$route( '/convert/job/step', 'POST', array( self::class, 'rest_step' ) );
		$route( '/convert/job/pause', 'POST', array( self::class, 'rest_pause' ) );
		$route( '/convert/job/cancel', 'POST', array( self::class, 'rest_cancel' ) );
	}

	public static function rest_get() {
		$job = self::get();
		return rest_ensure_response( array( 'job' => $job ? self::public_view( $job ) : null ) );
	}

	/**
	 * @param \WP_REST_Request $req
	 */
	public static function rest_start( $req ) {
		$d   = (array) $req->get_json_params();
		$job = self::start(
			array(
				'ids'          => $d['ids'] ?? array(),
				'mode'         => sanitize_key( (string) ( $d['mode'] ?? 'stage' ) ),
				'force'        => ! empty( $d['force'] ),
				'stage_target' => sanitize_key( (string) ( $d['stage_target'] ?? 'in_place' ) ),
				'batch'        => absint( $d['batch'] ?? 5 ),
				'replace'      => ! empty( $d['replace'] ),
			)
		);
		return is_wp_error( $job ) ? $job : rest_ensure_response( array( 'job' => $job ) );
	}

	public static function rest_step() {
		$job = self::step();
		return is_wp_error( $job ) ? $job : rest_ensure_response( array( 'job' => $job ) );
	}

	public static function rest_pause() {
		self::pause();
		return self::rest_get();
	}

	public static function rest_cancel() {
		self::cancel();
		return self::rest_get();
	}
}
