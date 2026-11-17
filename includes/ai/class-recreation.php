<?php
/**
 * Recreation runs: the context contract for rebuilding a design as blocks.
 *
 * A run keeps everything an AI recreation depends on as separate, versioned
 * artifacts instead of one large prompt:
 *
 * - source:     the screenshot or mockup being recreated (a media attachment).
 * - tokens:     the site's design variables and classes the tree was built with.
 * - viewport:   the breakpoints (name and width) the result is checked at.
 * - tree:       the generated block tree (an editor plan or a document).
 * - validation: structural checks plus layout and visual checks per breakpoint.
 *
 * Each artifact carries a revision and a SHA-256 hash. Validation records the
 * hashes it checked, so a tree or token change makes it stale, and a run is
 * accepted only when a current validation passes at every breakpoint (see
 * acceptance()). Any client - the editor chat, the REST API, or an MCP agent
 * through Sidcraft Builder Pro - reads only the artifacts it needs.
 *
 * Runs are stored as post meta on the page they are for; the newest MAX_RUNS
 * runs per page are kept.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Ai;

use SidcraftPageBuilder\Document\DocumentManager;
use SidcraftPageBuilder\Settings\Breakpoints;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Recreation {
	const NS           = 'sidcraft-page-builder/v1';
	const INDEX        = '_sidsyn_ai_runs';
	const PREFIX       = '_sidsyn_ai_run_';
	const KINDS        = array( 'source', 'tokens', 'viewport', 'tree', 'validation' );
	const MAX_RUNS     = 5;
	const MAX_BYTES    = 1572864; // 1.5 MB per artifact.
	const RUN_RE       = '[a-z0-9-]{8,40}';
	const PREVIEW_VAR  = 'sidsyn_recreate';
	const PREVIEW_TTL  = 900;
	const DESKTOP_WIDE = 1440; // Width used for desktop, whose editor preview is "100%".

	/**
	 * @return void
	 */
	public static function init() {
		add_action( 'sidcraft_page_builder_rest_register_routes', array( self::class, 'routes' ) );
		add_action( 'template_redirect', array( self::class, 'maybe_preview' ), 0 );
	}

	/* ------------------------------------------------------------------ *
	 * Runs
	 * ------------------------------------------------------------------ */

	/**
	 * Start a run. Tokens and viewport are captured from the site now, so the
	 * run can be reproduced later even if the site's design changes.
	 *
	 * @param int   $post_id
	 * @param array $args { source?: array, tree?: array, breakpoints?: array, label?: string, client?: string }.
	 * @return array|\WP_Error Manifest.
	 */
	public static function create( $post_id, array $args = array() ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || ! get_post( $post_id ) ) {
			return new \WP_Error( 'sidcraft_page_builder_run_post', __( 'That page does not exist.', 'sidcraft-page-builder' ), array( 'status' => 404 ) );
		}
		$run   = strtolower( gmdate( 'YmdHis' ) . '-' . wp_generate_password( 8, false, false ) );
		$index = self::index( $post_id );
		$index[] = $run;
		while ( count( $index ) > self::MAX_RUNS ) {
			self::delete_run( $post_id, array_shift( $index ) );
		}
		update_post_meta( $post_id, self::INDEX, $index );
		self::write(
			$post_id,
			$run,
			'manifest',
			array(
				'run'     => $run,
				'post_id' => $post_id,
				'status'  => 'draft',
				'created' => gmdate( 'c' ),
				'by'      => get_current_user_id(),
				'label'   => sanitize_text_field( (string) ( $args['label'] ?? '' ) ),
				'client'  => sanitize_key( (string) ( $args['client'] ?? 'editor' ) ),
			)
		);
		self::put( $post_id, $run, 'tokens', array() );
		self::put( $post_id, $run, 'viewport', array( 'breakpoints' => $args['breakpoints'] ?? null ) );
		foreach ( array( 'source', 'tree' ) as $kind ) {
			if ( ! empty( $args[ $kind ] ) && is_array( $args[ $kind ] ) ) {
				$res = self::put( $post_id, $run, $kind, $args[ $kind ] );
				if ( is_wp_error( $res ) ) {
					return $res;
				}
			}
		}
		return self::manifest( $post_id, $run );
	}

	/**
	 * @param int $post_id
	 * @return string[]
	 */
	public static function index( $post_id ) {
		$raw = get_post_meta( absint( $post_id ), self::INDEX, true );
		return is_array( $raw ) ? array_values( array_filter( $raw, array( self::class, 'valid_run' ) ) ) : array();
	}

	/**
	 * @param mixed $run
	 * @return bool
	 */
	public static function valid_run( $run ) {
		return is_string( $run ) && (bool) preg_match( '/^' . self::RUN_RE . '$/', $run );
	}

	/**
	 * @param int    $post_id
	 * @param string $run
	 * @return bool
	 */
	public static function exists( $post_id, $run ) {
		return self::valid_run( $run ) && in_array( $run, self::index( $post_id ), true );
	}

	/**
	 * @param int    $post_id
	 * @param string $run
	 * @return void
	 */
	private static function delete_run( $post_id, $run ) {
		if ( ! self::valid_run( $run ) ) {
			return;
		}
		foreach ( array_merge( self::KINDS, array( 'manifest' ) ) as $kind ) {
			delete_post_meta( $post_id, self::PREFIX . $run . '_' . $kind );
		}
	}

	/* ------------------------------------------------------------------ *
	 * Artifacts
	 * ------------------------------------------------------------------ */

	/**
	 * Store a new revision of one artifact.
	 *
	 * @param int    $post_id
	 * @param string $run
	 * @param string $kind
	 * @param array  $data
	 * @return array|\WP_Error The stored envelope.
	 */
	public static function put( $post_id, $run, $kind, array $data ) {
		if ( ! self::exists( $post_id, $run ) ) {
			return new \WP_Error( 'sidcraft_page_builder_run_missing', __( 'That recreation run does not exist.', 'sidcraft-page-builder' ), array( 'status' => 404 ) );
		}
		if ( ! in_array( $kind, self::KINDS, true ) ) {
			return new \WP_Error( 'sidcraft_page_builder_run_kind', __( 'Unknown artifact.', 'sidcraft-page-builder' ), array( 'status' => 400 ) );
		}
		switch ( $kind ) {
			case 'source':
				$clean = self::clean_source( $data );
				break;
			case 'tokens':
				$clean = self::tokens_snapshot();
				break;
			case 'viewport':
				$clean = self::clean_viewport( $data['breakpoints'] ?? null );
				break;
			case 'tree':
				$clean = self::clean_tree( $data );
				break;
			default:
				$clean = $data;
		}
		if ( is_wp_error( $clean ) ) {
			return $clean;
		}
		$json = (string) wp_json_encode( $clean );
		if ( strlen( $json ) > self::MAX_BYTES ) {
			return new \WP_Error( 'sidcraft_page_builder_run_size', __( 'That artifact is too large.', 'sidcraft-page-builder' ), array( 'status' => 413 ) );
		}
		$prev     = self::get( $post_id, $run, $kind );
		$envelope = array(
			'kind'    => $kind,
			'rev'     => $prev ? (int) $prev['rev'] + 1 : 1,
			'hash'    => hash( 'sha256', $json ),
			'created' => gmdate( 'c' ),
			'by'      => get_current_user_id(),
			'bytes'   => strlen( $json ),
			'data'    => $clean,
		);
		self::write( $post_id, $run, $kind, $envelope );
		if ( in_array( $kind, array( 'tree', 'tokens', 'viewport' ), true ) ) {
			// Inputs changed: an accepted run goes back to draft until it is validated again.
			$m = self::read( $post_id, $run, 'manifest' );
			if ( is_array( $m ) && 'draft' !== ( $m['status'] ?? '' ) ) {
				$m['status'] = 'draft';
				unset( $m['accepted'] );
				self::write( $post_id, $run, 'manifest', $m );
			}
		}
		return $envelope;
	}

	/**
	 * @param int    $post_id
	 * @param string $run
	 * @param string $kind
	 * @return array|null Envelope { kind, rev, hash, created, by, bytes, data }.
	 */
	public static function get( $post_id, $run, $kind ) {
		if ( ! self::exists( $post_id, $run ) || ! in_array( $kind, self::KINDS, true ) ) {
			return null;
		}
		$env = self::read( $post_id, $run, $kind );
		return is_array( $env ) && isset( $env['data'] ) ? $env : null;
	}

	/**
	 * What a run holds, without the artifact bodies, plus its acceptance status.
	 *
	 * @param int    $post_id
	 * @param string $run
	 * @return array|\WP_Error
	 */
	public static function manifest( $post_id, $run ) {
		if ( ! self::exists( $post_id, $run ) ) {
			return new \WP_Error( 'sidcraft_page_builder_run_missing', __( 'That recreation run does not exist.', 'sidcraft-page-builder' ), array( 'status' => 404 ) );
		}
		$m         = (array) self::read( $post_id, $run, 'manifest' );
		$artifacts = array();
		foreach ( self::KINDS as $kind ) {
			$env = self::get( $post_id, $run, $kind );
			if ( $env ) {
				$artifacts[ $kind ] = array(
					'rev'     => (int) $env['rev'],
					'hash'    => (string) $env['hash'],
					'created' => (string) $env['created'],
					'bytes'   => (int) $env['bytes'],
				);
			}
		}
		$tokens            = self::get( $post_id, $run, 'tokens' );
		$m['artifacts']    = $artifacts;
		$m['tokens_drift'] = $tokens && ! hash_equals( (string) $tokens['hash'], hash( 'sha256', (string) wp_json_encode( self::tokens_snapshot() ) ) );
		$m['acceptance']   = self::acceptance( $post_id, $run );
		return $m;
	}

	/* ------------------------------------------------------------------ *
	 * Validation and acceptance
	 * ------------------------------------------------------------------ */

	/**
	 * Check the tree and store a new validation artifact. Layout results from
	 * the editor (measured on the canvas at each breakpoint) are added when
	 * given; layout and visual results measured against an older tree are
	 * dropped.
	 *
	 * @param int        $post_id
	 * @param string     $run
	 * @param array|null $layout { breakpoint: { width, errors[], warnings[], boxes? } }.
	 * @return array|\WP_Error Validation artifact data.
	 */
	public static function validate( $post_id, $run, $layout = null ) {
		$tree = self::get( $post_id, $run, 'tree' );
		if ( ! $tree ) {
			return new \WP_Error( 'sidcraft_page_builder_run_tree', __( 'The run has no block tree yet.', 'sidcraft-page-builder' ), array( 'status' => 409 ) );
		}
		$tokens   = self::get( $post_id, $run, 'tokens' );
		$viewport = self::get( $post_id, $run, 'viewport' );
		$prev     = self::get( $post_id, $run, 'validation' );
		$against  = self::against( $tree, $tokens, $viewport );
		$keep     = $prev && ( $prev['data']['against'] ?? array() ) === $against ? $prev['data'] : array();
		$data     = array(
			'against'    => $against,
			'at'         => gmdate( 'c' ),
			'structural' => RecreationValidator::check( $tree['data'], $tokens ? $tokens['data'] : array(), $viewport ? $viewport['data'] : array(), $post_id ),
			'layout'     => (array) ( $keep['layout'] ?? array() ),
			'visual'     => (array) ( $keep['visual'] ?? array() ),
		);
		if ( is_array( $layout ) ) {
			$names = self::viewport_names( $viewport );
			foreach ( $layout as $bp => $row ) {
				$bp = sanitize_key( (string) $bp );
				if ( in_array( $bp, $names, true ) && is_array( $row ) ) {
					$data['layout'][ $bp ] = self::clean_layout_row( $row );
				}
			}
		}
		$res = self::put( $post_id, $run, 'validation', $data );
		return is_wp_error( $res ) ? $res : $data;
	}

	/**
	 * Add one breakpoint's visual comparison to the current validation. Called
	 * by add-ons that render the tree and compare it with a baseline image
	 * (Sidcraft Builder Pro does). Not exposed over REST.
	 *
	 * @param int    $post_id
	 * @param string $run
	 * @param string $breakpoint
	 * @param array  $result { mismatch: float, threshold: float, pass: bool, baseline: string, ... }.
	 * @return array|\WP_Error Validation artifact data.
	 */
	public static function record_visual( $post_id, $run, $breakpoint, array $result ) {
		$val = self::get( $post_id, $run, 'validation' );
		if ( ! $val ) {
			$val = self::validate( $post_id, $run );
			if ( is_wp_error( $val ) ) {
				return $val;
			}
			$data = $val;
		} else {
			$data = $val['data'];
		}
		$against = self::against( self::get( $post_id, $run, 'tree' ), self::get( $post_id, $run, 'tokens' ), self::get( $post_id, $run, 'viewport' ) );
		if ( ( $data['against'] ?? array() ) !== $against ) {
			$data = self::validate( $post_id, $run );
			if ( is_wp_error( $data ) ) {
				return $data;
			}
		}
		$bp = sanitize_key( (string) $breakpoint );
		if ( ! in_array( $bp, self::viewport_names( self::get( $post_id, $run, 'viewport' ) ), true ) ) {
			return new \WP_Error( 'sidcraft_page_builder_run_breakpoint', __( 'That breakpoint is not in the run\'s viewport.', 'sidcraft-page-builder' ), array( 'status' => 400 ) );
		}
		$data['visual'][ $bp ] = array(
			'mismatch'  => round( (float) ( $result['mismatch'] ?? 1 ), 5 ),
			'threshold' => round( (float) ( $result['threshold'] ?? 0 ), 5 ),
			'pass'      => ! empty( $result['pass'] ),
			'baseline'  => sanitize_key( (string) ( $result['baseline'] ?? '' ) ),
			'regions'   => array_slice( array_values( (array) ( $result['regions'] ?? array() ) ), 0, 12 ),
			'render'    => esc_url_raw( (string) ( $result['render'] ?? '' ) ),
			'at'        => gmdate( 'c' ),
		);
		$res = self::put( $post_id, $run, 'validation', $data );
		return is_wp_error( $res ) ? $res : $data;
	}

	/**
	 * Whether the run may be accepted, and why not.
	 *
	 * @param int    $post_id
	 * @param string $run
	 * @return array{ok:bool,reasons:array,requirements:array,breakpoints:string[]}
	 */
	public static function acceptance( $post_id, $run ) {
		$req = self::requirements( $post_id, $run );
		$out = array(
			'ok'           => false,
			'reasons'      => array(),
			'requirements' => $req,
			'breakpoints'  => array(),
		);
		$tree = self::get( $post_id, $run, 'tree' );
		if ( ! $tree ) {
			$out['reasons'][] = array(
				'code'    => 'no_tree',
				'message' => __( 'No block tree yet.', 'sidcraft-page-builder' ),
			);
			return $out;
		}
		$tokens         = self::get( $post_id, $run, 'tokens' );
		$viewport       = self::get( $post_id, $run, 'viewport' );
		$val            = self::get( $post_id, $run, 'validation' );
		$names          = self::viewport_names( $viewport );
		$out['breakpoints'] = $names;
		if ( ! $val ) {
			$out['reasons'][] = array(
				'code'    => 'not_validated',
				'message' => __( 'The tree has not been validated.', 'sidcraft-page-builder' ),
			);
			return $out;
		}
		$data = $val['data'];
		if ( ( $data['against'] ?? array() ) !== self::against( $tree, $tokens, $viewport ) ) {
			$out['reasons'][] = array(
				'code'    => 'stale',
				'message' => __( 'The tree, tokens or viewport changed after validation. Validate again.', 'sidcraft-page-builder' ),
			);
			return $out;
		}
		if ( empty( $data['structural']['ok'] ) ) {
			$out['reasons'][] = array(
				'code'    => 'structural',
				/* translators: %d: number of errors. */
				'message' => sprintf( __( 'The tree has %d structural errors.', 'sidcraft-page-builder' ), count( (array) ( $data['structural']['errors'] ?? array() ) ) ),
			);
		}
		foreach ( $names as $bp ) {
			if ( $req['layout'] ) {
				$row = $data['layout'][ $bp ] ?? null;
				if ( ! is_array( $row ) ) {
					$out['reasons'][] = array(
						'code'       => 'layout_missing',
						'breakpoint' => $bp,
						/* translators: %s: breakpoint name. */
						'message'    => sprintf( __( 'No layout check at %s.', 'sidcraft-page-builder' ), $bp ),
					);
				} elseif ( ! empty( $row['errors'] ) ) {
					$out['reasons'][] = array(
						'code'       => 'layout',
						'breakpoint' => $bp,
						/* translators: 1: breakpoint name, 2: first problem. */
						'message'    => sprintf( __( 'Layout problem at %1$s: %2$s', 'sidcraft-page-builder' ), $bp, (string) ( $row['errors'][0]['message'] ?? '' ) ),
					);
				}
			}
			if ( $req['visual'] ) {
				$row = $data['visual'][ $bp ] ?? null;
				if ( ! is_array( $row ) ) {
					$out['reasons'][] = array(
						'code'       => 'visual_missing',
						'breakpoint' => $bp,
						/* translators: %s: breakpoint name. */
						'message'    => sprintf( __( 'No visual comparison at %s.', 'sidcraft-page-builder' ), $bp ),
					);
				} elseif ( empty( $row['pass'] ) ) {
					$out['reasons'][] = array(
						'code'       => 'visual',
						'breakpoint' => $bp,
						/* translators: 1: breakpoint name, 2: percent of pixels that differ, 3: allowed percent. */
						'message'    => sprintf( __( 'At %1$s, %2$s%% of the render differs from the baseline (allowed: %3$s%%).', 'sidcraft-page-builder' ), $bp, number_format_i18n( 100 * (float) $row['mismatch'], 1 ), number_format_i18n( 100 * (float) $row['threshold'], 1 ) ),
					);
				}
			}
		}
		$out['ok'] = ! $out['reasons'];
		return $out;
	}

	/**
	 * Mark a run accepted. Without $override the acceptance checks must pass.
	 * A document tree can be staged for the owner's side-by-side review
	 * (Sidcraft Page Builder → Review Conversions) instead of being written.
	 *
	 * @param int    $post_id
	 * @param string $run
	 * @param array  $args { override?: bool, stage?: bool, remember?: string }.
	 * @return array|\WP_Error Manifest.
	 */
	public static function accept( $post_id, $run, array $args = array() ) {
		$check = self::acceptance( $post_id, $run );
		$force = ! empty( $args['override'] );
		if ( ! $check['ok'] && ( ! $force || ! self::can_override() ) ) {
			return new \WP_Error( 'sidcraft_page_builder_run_rejected', __( 'The run did not pass its checks.', 'sidcraft-page-builder' ), array( 'status' => 409, 'reasons' => $check['reasons'] ) );
		}
		$tree = self::get( $post_id, $run, 'tree' );
		if ( ! empty( $args['stage'] ) && 'document' === ( $tree['data']['format'] ?? '' ) && class_exists( '\\SidcraftPageBuilder\\Convert\\Review' ) ) {
			$doc    = self::with_root( $post_id, (array) $tree['data']['root'] );
			$val    = self::get( $post_id, $run, 'validation' );
			$staged = \SidcraftPageBuilder\Convert\Review::stage(
				$post_id,
				$doc,
				array(
					'nodes'    => (int) ( $val['data']['structural']['stats']['nodes'] ?? 0 ),
					'warnings' => array_map(
						static function ( $w ) {
							return (string) ( $w['message'] ?? '' );
						},
						(array) ( $val['data']['structural']['warnings'] ?? array() )
					),
				)
			);
			if ( is_wp_error( $staged ) ) {
				return $staged;
			}
		}
		$m             = (array) self::read( $post_id, $run, 'manifest' );
		$m['status']   = $check['ok'] ? 'accepted' : 'accepted_override';
		$m['accepted'] = array(
			'at'      => gmdate( 'c' ),
			'by'      => get_current_user_id(),
			'tree'    => (string) $tree['hash'],
			'reasons' => $check['ok'] ? array() : $check['reasons'],
			'staged'  => ! empty( $staged ),
		);
		self::write( $post_id, $run, 'manifest', $m );
		/**
		 * A recreation run was accepted.
		 *
		 * @param int    $post_id
		 * @param string $run
		 * @param array  $m       Manifest.
		 */
		do_action( 'sidcraft_page_builder_ai_recreation_accepted', $post_id, $run, $m );
		$note = trim( (string) ( $args['remember'] ?? '' ) );
		if ( '' === $note ) {
			$note = self::decision_text( $tree['data'] );
		}
		if ( '' !== $note && class_exists( LayoutMemory::class ) ) {
			LayoutMemory::record(
				$note,
				array(
					'post_id' => $post_id,
					'scope'   => (string) ( $tree['data']['scope'] ?? 'page' ),
					'run'     => $run,
					'tags'    => self::decision_tags( $tree['data'] ),
				)
			);
		}
		return self::manifest( $post_id, $run );
	}

	/**
	 * Which checks acceptance needs. Layout checks come from the editor;
	 * visual comparisons need an add-on that renders, so they are off unless
	 * one turns them on.
	 *
	 * @param int    $post_id
	 * @param string $run
	 * @return array{layout:bool,visual:bool}
	 */
	public static function requirements( $post_id = 0, $run = '' ) {
		$req = array(
			'layout' => true,
			'visual' => false,
		);
		/**
		 * Filter the checks a recreation run needs before it can be accepted.
		 *
		 * @param array{layout:bool,visual:bool} $req
		 * @param int                            $post_id
		 * @param string                         $run     Run id ('' outside a run).
		 * @param string                         $client  Who started the run: editor, rest or mcp.
		 */
		$req = apply_filters( 'sidcraft_page_builder_ai_recreation_requirements', $req, (int) $post_id, (string) $run, $run ? self::client( $post_id, $run ) : '' );
		return array(
			'layout' => ! empty( $req['layout'] ),
			'visual' => ! empty( $req['visual'] ),
		);
	}

	/**
	 * Who started a run (editor, rest, mcp).
	 *
	 * @param int    $post_id
	 * @param string $run
	 * @return string
	 */
	public static function client( $post_id, $run ) {
		$m = self::exists( $post_id, $run ) ? self::read( $post_id, $run, 'manifest' ) : null;
		return is_array( $m ) ? (string) ( $m['client'] ?? '' ) : '';
	}

	/**
	 * @return bool
	 */
	public static function can_override() {
		return current_user_can( 'manage_options' );
	}

	/* ------------------------------------------------------------------ *
	 * Snapshots and cleaning
	 * ------------------------------------------------------------------ */

	/**
	 * Theme tokens: XEditor variables and classes, and the global colors and
	 * typography.
	 *
	 * @return array
	 */
	public static function tokens_snapshot() {
		$out = array(
			'variables' => array(),
			'classes'   => array(),
			'globals'   => array(),
		);
		if ( class_exists( '\\SidcraftPageBuilder\\XEditor\\XEditorClassesManager' ) ) {
			$design = \SidcraftPageBuilder\XEditor\XEditorClassesManager::get();
			foreach ( (array) ( $design['variables'] ?? array() ) as $v ) {
				$out['variables'][] = array(
					'name'   => (string) ( $v['name'] ?? '' ),
					'type'   => (string) ( $v['type'] ?? '' ),
					'value'  => (string) ( $v['value'] ?? '' ),
					'values' => (array) ( $v['values'] ?? array() ),
				);
			}
			foreach ( (array) ( $design['classes'] ?? array() ) as $c ) {
				$out['classes'][] = array(
					'name'   => (string) ( $c['name'] ?? '' ),
					'styles' => (array) ( $c['styles'] ?? array() ),
				);
			}
		}
		if ( class_exists( '\\SidcraftPageBuilder\\Design\\Variables' ) ) {
			$out['globals'] = (array) \SidcraftPageBuilder\Design\Variables::all();
		}
		return $out;
	}

	/**
	 * @param mixed $list Breakpoint names, or { name, width } rows; null for the enabled ones.
	 * @return array{breakpoints:array}
	 */
	public static function clean_viewport( $list ) {
		$enabled = class_exists( Breakpoints::class ) ? Breakpoints::enabled() : array(
			'desktop' => array( 'preview' => 0 ),
			'tablet'  => array( 'preview' => 1024 ),
			'mobile'  => array( 'preview' => 390 ),
		);
		$width   = static function ( $name, $b ) {
			$w = (int) ( $b['preview'] ?? 0 );
			return $w > 0 ? $w : ( 'desktop' === $name ? self::DESKTOP_WIDE : (int) ( $b['value'] ?? self::DESKTOP_WIDE ) );
		};
		$rows    = array();
		foreach ( is_array( $list ) && $list ? $list : array_keys( $enabled ) as $item ) {
			$name = sanitize_key( is_array( $item ) ? (string) ( $item['name'] ?? '' ) : (string) $item );
			if ( ! isset( $enabled[ $name ] ) || isset( $rows[ $name ] ) ) {
				continue;
			}
			$w             = is_array( $item ) && ! empty( $item['width'] ) ? (int) $item['width'] : $width( $name, $enabled[ $name ] );
			$rows[ $name ] = array(
				'name'  => $name,
				'width' => max( 240, min( 3840, $w ) ),
			);
		}
		if ( ! $rows ) {
			$rows['desktop'] = array(
				'name'  => 'desktop',
				'width' => self::DESKTOP_WIDE,
			);
		}
		usort(
			$rows,
			static function ( $a, $b ) {
				return $b['width'] <=> $a['width'];
			}
		);
		return array( 'breakpoints' => array_values( $rows ) );
	}

	/**
	 * @param array $data { attachment_id, breakpoint?, variants?: { breakpoint: attachment_id } }.
	 * @return array|\WP_Error
	 */
	public static function clean_source( array $data ) {
		$main = self::attachment( $data['attachment_id'] ?? 0 );
		if ( is_wp_error( $main ) ) {
			return $main;
		}
		$main['breakpoint'] = sanitize_key( (string) ( $data['breakpoint'] ?? 'desktop' ) );
		$out                = array(
			'image'    => $main,
			'variants' => array(),
			'note'     => sanitize_textarea_field( (string) ( $data['note'] ?? '' ) ),
		);
		foreach ( (array) ( $data['variants'] ?? array() ) as $bp => $id ) {
			$bp  = sanitize_key( (string) $bp );
			$img = self::attachment( $id );
			if ( '' !== $bp && ! is_wp_error( $img ) ) {
				$out['variants'][ $bp ] = $img;
			}
		}
		return $out;
	}

	/**
	 * @param mixed $id
	 * @return array|\WP_Error
	 */
	private static function attachment( $id ) {
		$id = absint( $id );
		if ( ! $id || 'attachment' !== get_post_type( $id ) || ! wp_attachment_is_image( $id ) ) {
			return new \WP_Error( 'sidcraft_page_builder_run_source', __( 'The source must be an image in the media library.', 'sidcraft-page-builder' ), array( 'status' => 400 ) );
		}
		if ( ! current_user_can( 'read_post', $id ) ) {
			return new \WP_Error( 'rest_forbidden', __( 'You cannot use that image.', 'sidcraft-page-builder' ), array( 'status' => 403 ) );
		}
		$meta = wp_get_attachment_metadata( $id );
		$file = get_attached_file( $id );
		return array(
			'attachment_id' => $id,
			'url'           => (string) wp_get_attachment_url( $id ),
			'mime'          => (string) get_post_mime_type( $id ),
			'width'         => (int) ( $meta['width'] ?? 0 ),
			'height'        => (int) ( $meta['height'] ?? 0 ),
			'sha256'        => $file && is_readable( $file ) ? (string) hash_file( 'sha256', $file ) : '',
		);
	}

	/**
	 * @param array $data { format: plan|document, title?, summary?, scope?, ops?|root? }.
	 * @return array|\WP_Error
	 */
	public static function clean_tree( array $data ) {
		$format = (string) ( $data['format'] ?? ( isset( $data['root'] ) ? 'document' : 'plan' ) );
		$base   = array(
			'format'  => $format,
			'title'   => sanitize_text_field( (string) ( $data['title'] ?? '' ) ),
			'summary' => sanitize_textarea_field( (string) ( $data['summary'] ?? '' ) ),
			'scope'   => in_array( $data['scope'] ?? '', array( 'selected', 'page', 'site' ), true ) ? $data['scope'] : 'page',
		);
		if ( 'plan' === $format ) {
			$plan = AiChat::clean_plan( $data );
			if ( ! $plan ) {
				return new \WP_Error( 'sidcraft_page_builder_run_tree', __( 'The plan has no operations.', 'sidcraft-page-builder' ), array( 'status' => 400 ) );
			}
			$base['ops'] = $plan['ops'];
			return $base;
		}
		if ( 'document' === $format ) {
			$root = $data['root'] ?? null;
			if ( ! is_array( $root ) || array_values( $root ) !== $root ) {
				return new \WP_Error( 'sidcraft_page_builder_run_tree', __( 'A document tree needs a root list of nodes.', 'sidcraft-page-builder' ), array( 'status' => 400 ) );
			}
			// Kept as sent: sanitizing here would silently drop unknown units before
			// validation could report them. It is sanitized where it is rendered or staged.
			$base['root'] = $root;
			return $base;
		}
		return new \WP_Error( 'sidcraft_page_builder_run_tree', __( 'The tree format must be "plan" or "document".', 'sidcraft-page-builder' ), array( 'status' => 400 ) );
	}

	/**
	 * The page's document (header, footer, settings) with a run's tree as its
	 * content, sanitized like a saved document.
	 *
	 * @param int   $post_id
	 * @param array $root
	 * @return array
	 */
	private static function with_root( $post_id, array $root ) {
		$doc         = DocumentManager::get( $post_id );
		$doc         = is_array( $doc ) ? $doc : DocumentManager::empty();
		$doc['root'] = $root;
		return DocumentManager::sanitize( $doc );
	}

	/**
	 * @param array $row
	 * @return array
	 */
	private static function clean_layout_row( array $row ) {
		$issues = static function ( $list ) {
			$out = array();
			foreach ( array_slice( (array) $list, 0, 50 ) as $i ) {
				if ( is_array( $i ) ) {
					$out[] = array(
						'code'    => sanitize_key( (string) ( $i['code'] ?? '' ) ),
						'message' => sanitize_text_field( (string) ( $i['message'] ?? '' ) ),
						'id'      => sanitize_text_field( (string) ( $i['id'] ?? '' ) ),
					);
				}
			}
			return $out;
		};
		$boxes = array();
		foreach ( array_slice( (array) ( $row['boxes'] ?? array() ), 0, 400 ) as $b ) {
			if ( is_array( $b ) && isset( $b['id'] ) ) {
				$boxes[] = array(
					'id' => sanitize_text_field( (string) $b['id'] ),
					'x'  => (int) ( $b['x'] ?? 0 ),
					'y'  => (int) ( $b['y'] ?? 0 ),
					'w'  => (int) ( $b['w'] ?? 0 ),
					'h'  => (int) ( $b['h'] ?? 0 ),
				);
			}
		}
		return array(
			'width'    => (int) ( $row['width'] ?? 0 ),
			'errors'   => $issues( $row['errors'] ?? array() ),
			'warnings' => $issues( $row['warnings'] ?? array() ),
			'boxes'    => $boxes,
			'at'       => gmdate( 'c' ),
		);
	}

	/**
	 * @param array|null $tree
	 * @param array|null $tokens
	 * @param array|null $viewport
	 * @return array
	 */
	private static function against( $tree, $tokens, $viewport ) {
		return array(
			'tree'     => $tree ? (string) $tree['hash'] : '',
			'tokens'   => $tokens ? (string) $tokens['hash'] : '',
			'viewport' => $viewport ? (string) $viewport['hash'] : '',
		);
	}

	/**
	 * @param array|null $viewport
	 * @return string[]
	 */
	public static function viewport_names( $viewport ) {
		$names = array();
		foreach ( (array) ( $viewport['data']['breakpoints'] ?? array() ) as $b ) {
			$names[] = (string) ( $b['name'] ?? '' );
		}
		return array_values( array_filter( $names ) );
	}

	/**
	 * One-line note for layout memory.
	 *
	 * @param array $tree
	 * @return string
	 */
	private static function decision_text( array $tree ) {
		$tags = self::decision_tags( $tree );
		$text = trim( (string) ( $tree['title'] ?? '' ) );
		if ( '' !== ( $tree['summary'] ?? '' ) ) {
			$text .= ( '' !== $text ? ': ' : '' ) . $tree['summary'];
		}
		if ( $tags ) {
			$text .= ' (' . implode( ', ', array_slice( $tags, 0, 8 ) ) . ')';
		}
		return $text;
	}

	/**
	 * Classes and variables a tree defines or uses.
	 *
	 * @param array $tree
	 * @return string[]
	 */
	private static function decision_tags( array $tree ) {
		$tags = array();
		foreach ( (array) ( $tree['ops'] ?? array() ) as $op ) {
			if ( is_array( $op ) && in_array( $op['op'] ?? '', array( 'class', 'var' ), true ) && ! empty( $op['name'] ) ) {
				$tags[] = ( 'var' === $op['op'] ? '--' : '.' ) . RecreationValidator::slug( $op['name'] );
			}
		}
		return array_values( array_unique( $tags ) );
	}

	/* ------------------------------------------------------------------ *
	 * Storage
	 * ------------------------------------------------------------------ */

	/**
	 * @return void
	 */
	private static function write( $post_id, $run, $kind, array $value ) {
		DocumentManager::write_json_meta( $post_id, self::PREFIX . $run . '_' . $kind, $value );
	}

	/**
	 * @return array|null
	 */
	private static function read( $post_id, $run, $kind ) {
		$raw = get_post_meta( absint( $post_id ), self::PREFIX . $run . '_' . $kind, true );
		if ( is_array( $raw ) ) {
			return $raw;
		}
		$data = is_string( $raw ) && '' !== $raw ? json_decode( $raw, true ) : null;
		return is_array( $data ) ? $data : null;
	}

	/* ------------------------------------------------------------------ *
	 * Preview for renderers
	 * ------------------------------------------------------------------ */

	/**
	 * Signed, short-lived URLs that render a run's document tree, one per
	 * breakpoint, for a headless browser to capture. They need no login.
	 *
	 * @param int    $post_id
	 * @param string $run
	 * @return array|\WP_Error { expires, urls: [{ breakpoint, width, url }] }
	 */
	public static function preview_urls( $post_id, $run ) {
		$tree = self::get( $post_id, $run, 'tree' );
		if ( ! $tree || 'document' !== ( $tree['data']['format'] ?? '' ) ) {
			return new \WP_Error( 'sidcraft_page_builder_run_preview', __( 'Only a document tree can be rendered outside the editor.', 'sidcraft-page-builder' ), array( 'status' => 409 ) );
		}
		$exp  = time() + self::PREVIEW_TTL;
		$sig  = self::signature( $post_id, $run, $exp, (string) $tree['hash'] );
		$base = add_query_arg(
			array(
				self::PREVIEW_VAR => $run,
				'sidsyn_post'     => (int) $post_id,
				'exp'             => $exp,
				'sig'             => $sig,
			),
			home_url( '/' )
		);
		$urls = array();
		$view = self::get( $post_id, $run, 'viewport' );
		foreach ( (array) ( $view['data']['breakpoints'] ?? array() ) as $b ) {
			$urls[] = array(
				'breakpoint' => (string) $b['name'],
				'width'      => (int) $b['width'],
				'url'        => $base,
			);
		}
		return array(
			'expires' => gmdate( 'c', $exp ),
			'urls'    => $urls,
		);
	}

	/**
	 * @return string
	 */
	private static function signature( $post_id, $run, $exp, $tree_hash ) {
		return hash_hmac( 'sha256', (int) $post_id . '|' . $run . '|' . (int) $exp . '|' . $tree_hash, wp_salt( 'auth' ) );
	}

	/**
	 * Render a run's document tree on a signed URL: a standalone page with the
	 * site's styles, no admin bar, not cached or indexed. Nothing is saved.
	 *
	 * @return void
	 */
	public static function maybe_preview() {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Verified with an HMAC signature below.
		if ( empty( $_GET[ self::PREVIEW_VAR ] ) || empty( $_GET['sidsyn_post'] ) ) {
			return;
		}
		$run     = sanitize_key( wp_unslash( $_GET[ self::PREVIEW_VAR ] ) );
		$post_id = absint( wp_unslash( $_GET['sidsyn_post'] ) );
		$exp     = isset( $_GET['exp'] ) ? absint( wp_unslash( $_GET['exp'] ) ) : 0;
		$sig     = isset( $_GET['sig'] ) ? sanitize_key( wp_unslash( $_GET['sig'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended
		$tree = self::get( $post_id, $run, 'tree' );
		if ( ! $tree || $exp < time() || 'document' !== ( $tree['data']['format'] ?? '' ) || ! hash_equals( self::signature( $post_id, $run, $exp, (string) $tree['hash'] ), $sig ) ) {
			return;
		}
		nocache_headers();
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound -- Standard constant read by page-cache plugins.
		}
		add_filter( 'show_admin_bar', '__return_false' );
		header( 'X-Robots-Tag: noindex, nofollow', true );
		header( 'Content-Type: text/html; charset=UTF-8' );
		DocumentManager::preview( $post_id, self::with_root( $post_id, (array) $tree['data']['root'] ) );
		$render = static function () use ( $post_id ) {
			return \SidcraftPageBuilder\Rendering\FrontendRenderer::render_document( DocumentManager::get( $post_id ), $post_id );
		};
		$html = class_exists( '\\SidcraftPageBuilder\\Rendering\\OutputEscape' ) ? (string) \SidcraftPageBuilder\Rendering\OutputEscape::render( $render ) : (string) $render();
		$css  = (string) DocumentManager::compiled_css( $post_id );
		if ( class_exists( '\\SidcraftPageBuilder\\XEditor\\XEditorClassesManager' ) ) {
			$css = \SidcraftPageBuilder\XEditor\XEditorClassesManager::css() . "\n" . $css;
		}
		?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<?php wp_head(); ?>
<style id="sidsyn-recreate-css"><?php echo str_ireplace( '</style', '<\/style', $css ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Compiled builder CSS; a closing style tag cannot end the block. ?></style>
</head>
<body <?php body_class( 'sidsyn-recreate-preview' ); ?>>
<?php
echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered by the builder's escaping renderer.
wp_footer();
?>
</body>
</html>
		<?php
		exit;
	}

	/* ------------------------------------------------------------------ *
	 * REST
	 * ------------------------------------------------------------------ */

	/**
	 * @param string $ns
	 * @return void
	 */
	public static function routes( $ns = self::NS ) {
		$ns   = is_string( $ns ) && '' !== $ns ? $ns : self::NS;
		$base = '/ai-recreation/(?P<post>\d+)';
		$run  = $base . '/(?P<run>' . self::RUN_RE . ')';
		$can  = array( self::class, 'can_use' );
		register_rest_route(
			$ns,
			$base,
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'rest_list' ),
					'permission_callback' => $can,
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'rest_create' ),
					'permission_callback' => $can,
				),
			)
		);
		register_rest_route(
			$ns,
			$run,
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'rest_manifest' ),
				'permission_callback' => $can,
			)
		);
		register_rest_route(
			$ns,
			$run . '/(?P<kind>source|tokens|viewport|tree|validation)',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'rest_get' ),
					'permission_callback' => $can,
				),
				array(
					'methods'             => 'PUT',
					'callback'            => array( self::class, 'rest_put' ),
					'permission_callback' => $can,
				),
			)
		);
		foreach ( array( 'validate', 'accept', 'preview' ) as $action ) {
			register_rest_route(
				$ns,
				$run . '/' . $action,
				array(
					'methods'             => 'preview' === $action ? 'GET' : 'POST',
					'callback'            => array( self::class, 'rest_' . $action ),
					'permission_callback' => $can,
				)
			);
		}
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return bool
	 */
	public static function can_use( $request ) {
		if ( class_exists( '\\SidcraftPageBuilder\\Settings\\Roles' ) && ! \SidcraftPageBuilder\Settings\Roles::can_edit() ) {
			return false;
		}
		return current_user_can( 'edit_post', absint( $request['post'] ) );
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response
	 */
	public static function rest_list( $request ) {
		$post_id = absint( $request['post'] );
		$runs    = array();
		foreach ( array_reverse( self::index( $post_id ) ) as $run ) {
			$m = self::manifest( $post_id, $run );
			if ( ! is_wp_error( $m ) ) {
				$runs[] = $m;
			}
		}
		return rest_ensure_response( array( 'runs' => $runs ) );
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function rest_create( $request ) {
		$res = self::create(
			absint( $request['post'] ),
			array(
				'source'      => $request->get_param( 'source' ),
				'tree'        => $request->get_param( 'tree' ),
				'breakpoints' => $request->get_param( 'breakpoints' ),
				'label'       => (string) $request->get_param( 'label' ),
				'client'      => 'editor' === $request->get_param( 'client' ) ? 'editor' : 'rest',
			)
		);
		return is_wp_error( $res ) ? $res : rest_ensure_response( $res );
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function rest_manifest( $request ) {
		$res = self::manifest( absint( $request['post'] ), (string) $request['run'] );
		return is_wp_error( $res ) ? $res : rest_ensure_response( $res );
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function rest_get( $request ) {
		$env = self::get( absint( $request['post'] ), (string) $request['run'], (string) $request['kind'] );
		if ( ! $env ) {
			return new \WP_Error( 'sidcraft_page_builder_run_artifact', __( 'That artifact is not in the run.', 'sidcraft-page-builder' ), array( 'status' => 404 ) );
		}
		return rest_ensure_response( $env );
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function rest_put( $request ) {
		$kind = (string) $request['kind'];
		if ( 'validation' === $kind ) {
			return new \WP_Error( 'sidcraft_page_builder_run_kind', __( 'Validation is written by the validate action.', 'sidcraft-page-builder' ), array( 'status' => 405 ) );
		}
		$body = $request->get_json_params();
		$res  = self::put( absint( $request['post'] ), (string) $request['run'], $kind, is_array( $body ) ? $body : array() );
		return is_wp_error( $res ) ? $res : rest_ensure_response( $res );
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function rest_validate( $request ) {
		$layout = $request->get_param( 'layout' );
		$res    = self::validate( absint( $request['post'] ), (string) $request['run'], is_array( $layout ) ? $layout : null );
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		return rest_ensure_response(
			array(
				'validation' => $res,
				'acceptance' => self::acceptance( absint( $request['post'] ), (string) $request['run'] ),
			)
		);
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function rest_accept( $request ) {
		$res = self::accept(
			absint( $request['post'] ),
			(string) $request['run'],
			array(
				'override' => (bool) $request->get_param( 'override' ),
				'stage'    => (bool) $request->get_param( 'stage' ),
				'remember' => (string) $request->get_param( 'remember' ),
			)
		);
		return is_wp_error( $res ) ? $res : rest_ensure_response( $res );
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function rest_preview( $request ) {
		$res = self::preview_urls( absint( $request['post'] ), (string) $request['run'] );
		return is_wp_error( $res ) ? $res : rest_ensure_response( $res );
	}
}
