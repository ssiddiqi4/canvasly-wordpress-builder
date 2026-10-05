<?php
namespace SidcraftPageBuilder\Cli;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * `wp sidcraft-page-builder` subcommands.
 *
 * Methods are named for WP-CLI (underscores become hyphens).
 */
class Command {

	/**
	 * Rebuild compiled CSS files (global.css and per-post files).
	 *
	 * ## OPTIONS
	 *
	 * [--scope=<scope>]
	 * : What to rebuild.
	 * ---
	 * default: all
	 * options:
	 *   - all
	 *   - global
	 *   - post
	 * ---
	 *
	 * [--id=<id>]
	 * : Post ID when --scope=post.
	 *
	 * [--ids=<ids>]
	 * : Comma-separated post IDs to rebuild.
	 *
	 * [--limit=<limit>]
	 * : Max posts when rebuilding everything.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sidcraft-page-builder regenerate-css
	 *     wp sidcraft-page-builder regenerate-css --scope=global
	 *     wp sidcraft-page-builder regenerate-css --scope=post --id=12
	 *
	 * @when after_wp_load
	 *
	 * @param array $args
	 * @param array $assoc_args
	 */
	public function regenerate_css( $args, $assoc_args ) {
		$assoc_args = is_array( $assoc_args ) ? $assoc_args : array();
		$params     = array(
			'scope' => $assoc_args['scope'] ?? 'all',
		);
		if ( ! empty( $assoc_args['id'] ) ) {
			$params['id'] = $assoc_args['id'];
		}
		if ( ! empty( $assoc_args['ids'] ) ) {
			$params['ids'] = $assoc_args['ids'];
		}
		if ( ! empty( $assoc_args['limit'] ) ) {
			$params['limit'] = $assoc_args['limit'];
		}
		$out = Cli::regenerate_css( $params );
		if ( is_wp_error( $out ) ) {
			self::fail( $out->get_error_message() );
			return;
		}
		$written = (int) ( $out['written'] ?? 0 );
		$failed  = (int) ( $out['failed'] ?? 0 );
		$posts   = (int) ( $out['posts'] ?? 0 );
		self::ok(
			sprintf(
				/* translators: 1: files written, 2: posts processed, 3: failures */
				__( 'Regenerated CSS (%1$d written, %2$d posts, %3$d failed).', 'sidcraft-page-builder' ),
				$written,
				$posts,
				$failed
			)
		);
	}

	/**
	 * Flush the unit fragment cache and purge page-cache plugins.
	 *
	 * ## OPTIONS
	 *
	 * [--id=<id>]
	 * : Limit the flush to one post. Omit for a site-wide flush.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sidcraft-page-builder flush-cache
	 *     wp sidcraft-page-builder flush-cache --id=12
	 *
	 * @when after_wp_load
	 *
	 * @param array $args
	 * @param array $assoc_args
	 */
	public function flush_cache( $args, $assoc_args ) {
		$assoc_args = is_array( $assoc_args ) ? $assoc_args : array();
		$out        = Cli::flush_cache( array( 'id' => $assoc_args['id'] ?? 0 ) );
		$id         = (int) ( $out['id'] ?? 0 );
		if ( $id ) {
			self::ok(
				sprintf(
					/* translators: %d: post ID */
					__( 'Flushed Sidcraft Page Builder caches for post %d.', 'sidcraft-page-builder' ),
					$id
				)
			);
			return;
		}
		self::ok( __( 'Flushed Sidcraft Page Builder caches site-wide.', 'sidcraft-page-builder' ) );
	}

	/**
	 * Rewrite a site URL inside document JSON and compiled CSS cache.
	 *
	 * ## OPTIONS
	 *
	 * <from>
	 * : Old URL, including the protocol.
	 *
	 * <to>
	 * : New URL, including the protocol.
	 *
	 * [--dry-run]
	 * : Count matches without writing.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sidcraft-page-builder replace-url https://staging.example.com https://www.example.com
	 *     wp sidcraft-page-builder replace-url https://old.test https://new.test --dry-run
	 *
	 * @when after_wp_load
	 *
	 * @param array $args
	 * @param array $assoc_args
	 */
	public function replace_url( $args, $assoc_args ) {
		$args       = is_array( $args ) ? $args : array();
		$assoc_args = is_array( $assoc_args ) ? $assoc_args : array();
		$from       = isset( $args[0] ) ? (string) $args[0] : '';
		$to         = isset( $args[1] ) ? (string) $args[1] : '';
		$out        = Cli::replace_url(
			$from,
			$to,
			array( 'dry_run' => ! empty( $assoc_args['dry-run'] ) )
		);
		if ( is_wp_error( $out ) ) {
			self::fail( $out->get_error_message() );
			return;
		}
		$count = (int) ( $out['replacements'] ?? 0 );
		$posts = (int) ( $out['posts'] ?? 0 );
		if ( ! empty( $out['dry_run'] ) ) {
			self::ok(
				sprintf(
					/* translators: 1: replacement count, 2: post count */
					_n(
						'Dry run: %1$d replacement across %2$d item.',
						'Dry run: %1$d replacements across %2$d items.',
						$count,
						'sidcraft-page-builder'
					),
					$count,
					$posts
				)
			);
			return;
		}
		self::ok(
			sprintf(
				/* translators: 1: replacement count, 2: post count */
				_n(
					'Replaced %1$d occurrence across %2$d item.',
					'Replaced %1$d occurrences across %2$d items.',
					$count,
					'sidcraft-page-builder'
				),
				$count,
				$posts
			)
		);
	}

	/**
	 * Import a kit ZIP or JSON file.
	 *
	 * ## OPTIONS
	 *
	 * <file>
	 * : Path to a .zip or .json kit.
	 *
	 * [--mode=<mode>]
	 * : Conflict handling.
	 * ---
	 * default: merge
	 * options:
	 *   - merge
	 *   - replace
	 * ---
	 *
	 * [--include-content]
	 * : Import pages/posts bundled in the kit. Default: true.
	 *
	 * [--skip-content]
	 * : Skip bundled pages/posts.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sidcraft-page-builder import ./sidcraft-page-builder-kit.zip
	 *     wp sidcraft-page-builder import ./kit.json --mode=replace --skip-content
	 *
	 * @when after_wp_load
	 *
	 * @param array $args
	 * @param array $assoc_args
	 */
	public function import( $args, $assoc_args ) {
		$args       = is_array( $args ) ? $args : array();
		$assoc_args = is_array( $assoc_args ) ? $assoc_args : array();
		$file       = isset( $args[0] ) ? (string) $args[0] : '';
		$include    = empty( $assoc_args['skip-content'] );
		if ( array_key_exists( 'include-content', $assoc_args ) ) {
			$include = ! empty( $assoc_args['include-content'] );
		}
		$out = Cli::import(
			$file,
			array(
				'mode'            => $assoc_args['mode'] ?? 'merge',
				'include_content' => $include,
			)
		);
		if ( is_wp_error( $out ) ) {
			self::fail( $out->get_error_message() );
			return;
		}
		self::ok(
			sprintf(
				/* translators: 1: templates, 2: content items, 3: mode */
				__( 'Imported kit (%1$d templates, %2$d content, mode: %3$s).', 'sidcraft-page-builder' ),
				(int) ( $out['templates'] ?? 0 ),
				(int) ( $out['content'] ?? 0 ),
				(string) ( $out['mode'] ?? 'merge' )
			)
		);
	}

	/**
	 * Export a site kit ZIP.
	 *
	 * ## OPTIONS
	 *
	 * [<name>]
	 * : File name for the ZIP. It is always written to wp-content/uploads/sidcraft-page-builder/kits/, with a random suffix added. Defaults to a generated name.
	 *
	 * [--templates]
	 * : Include saved templates. Default: true.
	 *
	 * [--skip-templates]
	 * : Omit saved templates.
	 *
	 * [--content]
	 * : Include selected pages/posts.
	 *
	 * [--content-ids=<ids>]
	 * : Comma-separated post IDs to include as content.
	 *
	 * [--media]
	 * : Copy referenced media into the ZIP. Default: true.
	 *
	 * [--skip-media]
	 * : Omit media files.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sidcraft-page-builder export
	 *     wp sidcraft-page-builder export my-kit.zip --content --content-ids=12,15
	 *
	 * @when after_wp_load
	 *
	 * @param array $args
	 * @param array $assoc_args
	 */
	public function export( $args, $assoc_args ) {
		$args       = is_array( $args ) ? $args : array();
		$assoc_args = is_array( $assoc_args ) ? $assoc_args : array();
		$dest       = isset( $args[0] ) ? (string) $args[0] : '';
		$templates  = empty( $assoc_args['skip-templates'] );
		$media      = empty( $assoc_args['skip-media'] );
		$out        = Cli::export(
			$dest,
			array(
				'include_templates' => $templates,
				'include_content'   => ! empty( $assoc_args['content'] ) || ! empty( $assoc_args['content-ids'] ),
				'include_media'     => $media,
				'content_ids'       => Cli::ids_from( $assoc_args['content-ids'] ?? array() ),
			)
		);
		if ( is_wp_error( $out ) ) {
			self::fail( $out->get_error_message() );
			return;
		}
		self::ok(
			sprintf(
				/* translators: %s: file path */
				__( 'Exported kit to %s.', 'sidcraft-page-builder' ),
				(string) ( $out['path'] ?? '' )
			)
		);
	}

	/**
	 * Convert stored third-party builder JSON into Sidcraft Page Builder documents.
	 *
	 * ## OPTIONS
	 *
	 * [--ids=<ids>]
	 * : Comma-separated post IDs. Omit to convert every candidate.
	 *
	 * [--dry-run]
	 * : Report mapping without saving.
	 *
	 * [--force]
	 * : Overwrite an existing Sidcraft Page Builder document on the same post.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sidcraft-page-builder convert --dry-run
	 *     wp sidcraft-page-builder convert --ids=12,15 --force
	 *
	 * @when after_wp_load
	 *
	 * @param array $args
	 * @param array $assoc_args
	 */
	public function convert( $args, $assoc_args ) {
		$assoc_args = is_array( $assoc_args ) ? $assoc_args : array();
		$out        = Cli::convert(
			array(
				'ids'     => $assoc_args['ids'] ?? array(),
				'dry_run' => ! empty( $assoc_args['dry-run'] ),
				'force'   => ! empty( $assoc_args['force'] ),
			)
		);
		if ( is_wp_error( $out ) ) {
			self::fail( $out->get_error_message() );
			return;
		}
		$count = (int) ( $out['converted'] ?? 0 );
		if ( ! empty( $out['dry_run'] ) ) {
			self::ok(
				sprintf(
					/* translators: %d: number of posts */
					_n( 'Dry run finished for %d item.', 'Dry run finished for %d items.', $count, 'sidcraft-page-builder' ),
					$count
				)
			);
			return;
		}
		self::ok(
			sprintf(
				/* translators: %d: number of converted posts */
				_n( 'Converted %d item.', 'Converted %d items.', $count, 'sidcraft-page-builder' ),
				$count
			)
		);
	}

	/**
	 * Convert pages in resumable batches.
	 *
	 * Progress is saved after every page, so an interrupted run continues
	 * where it stopped with --resume.
	 *
	 * ## OPTIONS
	 *
	 * [--ids=<ids>]
	 * : Comma-separated post IDs. Omit to convert every page with Elementor data.
	 *
	 * [--mode=<mode>]
	 * : stage (wait for review), dry, copy or in_place.
	 * ---
	 * default: stage
	 * options:
	 *   - stage
	 *   - dry
	 *   - copy
	 *   - in_place
	 * ---
	 *
	 * [--batch=<n>]
	 * : Pages per batch.
	 * ---
	 * default: 10
	 * ---
	 *
	 * [--force]
	 * : With in_place, overwrite an existing Sidcraft Page Builder document.
	 *
	 * [--resume]
	 * : Continue the current job instead of starting a new one.
	 *
	 * [--status]
	 * : Show the current job and exit.
	 *
	 * [--cancel]
	 * : Cancel the current job and exit.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sidcraft-page-builder convert-batch --mode=stage
	 *     wp sidcraft-page-builder convert-batch --resume
	 *     wp sidcraft-page-builder convert-batch --status
	 *
	 * @subcommand convert-batch
	 * @when after_wp_load
	 *
	 * @param array $args
	 * @param array $assoc_args
	 */
	public function convert_batch( $args, $assoc_args ) {
		$assoc_args = is_array( $assoc_args ) ? $assoc_args : array();
		if ( ! class_exists( '\\SidcraftPageBuilder\\Convert\\Job' ) ) {
			self::fail( __( 'The converter is not available.', 'sidcraft-page-builder' ) );
			return;
		}
		if ( ! get_current_user_id() ) {
			$admins = get_users( array( 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ) );
			if ( $admins ) {
				wp_set_current_user( (int) $admins[0] );
			}
		}
		if ( ! empty( $assoc_args['cancel'] ) ) {
			\SidcraftPageBuilder\Convert\Job::cancel();
			self::ok( __( 'Job cancelled.', 'sidcraft-page-builder' ) );
			return;
		}
		if ( ! empty( $assoc_args['status'] ) ) {
			$job = \SidcraftPageBuilder\Convert\Job::get();
			if ( ! $job ) {
				self::ok( __( 'No conversion job.', 'sidcraft-page-builder' ) );
				return;
			}
			self::print_job( \SidcraftPageBuilder\Convert\Job::public_view( $job ) );
			return;
		}
		if ( empty( $assoc_args['resume'] ) ) {
			$job = \SidcraftPageBuilder\Convert\Job::start(
				array(
					'ids'     => Cli::ids_from( $assoc_args['ids'] ?? array() ),
					'mode'    => (string) ( $assoc_args['mode'] ?? 'stage' ),
					'force'   => ! empty( $assoc_args['force'] ),
					'batch'   => absint( $assoc_args['batch'] ?? 10 ),
					'replace' => false,
				)
			);
			if ( is_wp_error( $job ) ) {
				self::fail( $job->get_error_message() . ' ' . __( 'Use --resume, or --cancel first.', 'sidcraft-page-builder' ) );
				return;
			}
		}
		$seen = 0;
		do {
			$job = \SidcraftPageBuilder\Convert\Job::step();
			if ( is_wp_error( $job ) ) {
				self::fail( $job->get_error_message() );
				return;
			}
			foreach ( array_slice( (array) $job['failures'], $seen ) as $f ) {
				self::line( sprintf( 'FAILED #%d %s | at: %s | node: %s | %s', (int) $f['post'], $f['title'], $f['path'] !== '' ? $f['path'] : '-', $f['node'] !== '' ? $f['node'] : '-', $f['message'] ) );
			}
			$seen = count( (array) $job['failures'] );
			self::line( sprintf( '%d/%d (%d%%)', (int) $job['cursor'], (int) $job['total'], (int) $job['percent'] ) );
		} while ( $job['status'] === 'running' );
		self::print_job( $job );
	}

	/**
	 * Write readable fallback HTML for every existing layout.
	 *
	 * The copy goes into post_content, so pages stay readable if the builder
	 * is ever switched off.
	 *
	 * ## OPTIONS
	 *
	 * [--batch=<n>]
	 * : Posts per batch.
	 * ---
	 * default: 50
	 * ---
	 *
	 * [--restore]
	 * : Instead, put back the post_content each page had before its first fallback copy.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sidcraft-page-builder fallback
	 *     wp sidcraft-page-builder fallback --restore
	 *
	 * @when after_wp_load
	 *
	 * @param array $args
	 * @param array $assoc_args
	 */
	public function fallback( $args, $assoc_args ) {
		$assoc_args = is_array( $assoc_args ) ? $assoc_args : array();
		$fc         = '\\SidcraftPageBuilder\\Document\\FallbackContent';
		if ( ! class_exists( $fc ) ) {
			self::fail( __( 'Fallback content is not available.', 'sidcraft-page-builder' ) );
			return;
		}
		$admins = get_users( array( 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ) );
		if ( ! get_current_user_id() && $admins ) {
			wp_set_current_user( (int) $admins[0] );
		}
		if ( ! empty( $assoc_args['restore'] ) ) {
			global $wpdb;
			$ids = $wpdb->get_col( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s", $fc::ORIGINAL_META ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$n   = 0;
			foreach ( (array) $ids as $id ) {
				$n += $fc::restore_original( (int) $id ) ? 1 : 0;
			}
			/* translators: %d: number of posts */
			self::ok( sprintf( __( 'Restored the original post content of %d posts.', 'sidcraft-page-builder' ), $n ) );
			return;
		}
		$next    = 0;
		$total   = 0;
		$written = 0;
		do {
			$r        = $fc::backfill( $next, absint( $assoc_args['batch'] ?? 50 ) );
			$next     = (int) $r['next'];
			$total   += (int) $r['processed'];
			$written += (int) $r['written'];
			self::line( sprintf( '%d checked, %d written', $total, $written ) );
		} while ( ! $r['done'] );
		/* translators: 1: written, 2: checked */
		self::ok( sprintf( __( 'Wrote fallback content for %1$d of %2$d documents.', 'sidcraft-page-builder' ), $written, $total ) );
	}

	/**
	 * Measure save, render, front-end and editor cost on a ~200-unit page.
	 *
	 * Creates two temporary published pages (one with a builder layout, one
	 * without), measures them, and deletes them again.
	 *
	 * ## OPTIONS
	 *
	 * [--units=<n>]
	 * : Units on the test page.
	 * ---
	 * default: 200
	 * ---
	 *
	 * [--runs=<n>]
	 * : Warm render repetitions (median is reported).
	 * ---
	 * default: 5
	 * ---
	 *
	 * [--keep]
	 * : Keep the temporary pages.
	 *
	 * [--format=<format>]
	 * : table or json.
	 * ---
	 * default: table
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp sidcraft-page-builder benchmark
	 *     wp sidcraft-page-builder benchmark --units=500 --format=json
	 *
	 * @when after_wp_load
	 *
	 * @param array $args
	 * @param array $assoc_args
	 */
	public function benchmark( $args, $assoc_args ) {
		$assoc_args = is_array( $assoc_args ) ? $assoc_args : array();
		if ( ! class_exists( '\\SidcraftPageBuilder\\Tools\\Benchmark' ) ) {
			self::fail( __( 'The benchmark is not available.', 'sidcraft-page-builder' ) );
			return;
		}
		if ( ! get_current_user_id() ) {
			$admins = get_users( array( 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ) );
			if ( $admins ) {
				wp_set_current_user( (int) $admins[0] );
			}
		}
		$r = \SidcraftPageBuilder\Tools\Benchmark::run(
			array(
				'units' => absint( $assoc_args['units'] ?? 200 ),
				'runs'  => absint( $assoc_args['runs'] ?? 5 ),
				'keep'  => ! empty( $assoc_args['keep'] ),
			)
		);
		if ( ( $assoc_args['format'] ?? 'table' ) === 'json' ) {
			self::line( (string) wp_json_encode( $r, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
			return;
		}
		if ( ! empty( $r['error'] ) ) {
			self::fail( $r['error'] );
			return;
		}
		$rows = array();
		$add  = function ( $group, $metric, $value ) use ( &$rows ) {
			$rows[] = array(
				'group'  => $group,
				'metric' => $metric,
				'value'  => is_scalar( $value ) ? (string) $value : wp_json_encode( $value ),
			);
		};
		foreach ( $r['environment'] as $k => $v ) {
			$add( 'environment', $k, $v );
		}
		foreach ( $r['page'] as $k => $v ) {
			$add( 'save', $k, $v );
		}
		foreach ( $r['render'] as $k => $v ) {
			$add( 'render (in process)', $k, $v );
		}
		foreach ( array( 'frontend' => 'front end, builder page', 'frontend_bare' => 'front end, page without builder' ) as $key => $label ) {
			foreach ( (array) $r[ $key ] as $k => $v ) {
				if ( in_array( $k, array( 'assets', 'write_queries', 'run' ), true ) ) {
					continue;
				}
				$add( $label, $k, $v );
			}
		}
		$add( 'editor', 'total_kb', $r['editor']['total_kb'] );
		$add( 'editor', 'total_gzip_kb', $r['editor']['total_gzip_kb'] );
		if ( function_exists( '\WP_CLI\Utils\format_items' ) ) {
			\WP_CLI\Utils\format_items( 'table', $rows, array( 'group', 'metric', 'value' ) );
		}
		if ( ! empty( $r['frontend']['write_queries'] ) ) {
			self::line( 'Writes during the front-end request:' );
			foreach ( $r['frontend']['write_queries'] as $q ) {
				self::line( '  ' . $q );
			}
		}
	}

	/**
	 * Print the JSON Schema of the saved document format.
	 *
	 * Generated from the units registered on this site, so add-on units are
	 * included. The same schema is served at /wp-json/sidcraft-page-builder/v1/schema.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sidcraft-page-builder schema > sidcraft-document.schema.json
	 *
	 * @when after_wp_load
	 *
	 * @param array $args
	 * @param array $assoc_args
	 */
	public function schema( $args, $assoc_args ) {
		if ( ! class_exists( '\\SidcraftPageBuilder\\Document\\Schema' ) ) {
			self::fail( __( 'The schema is not available.', 'sidcraft-page-builder' ) );
			return;
		}
		self::line( (string) wp_json_encode( \SidcraftPageBuilder\Document\Schema::json_schema(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
	}

	/**
	 * @param array $job
	 */
	private static function print_job( array $job ) {
		$c = (array) $job['counts'];
		self::line( sprintf( 'Job %s: %s, mode %s, %d/%d pages', $job['id'], $job['status'], $job['mode'], (int) $job['cursor'], (int) $job['total'] ) );
		self::line( sprintf( 'converted %d, staged %d, skipped %d, failed %d, dynamic fields %d', (int) $c['converted'], (int) $c['staged'], (int) $c['skipped'], (int) $c['errors'], (int) $c['dynamic'] ) );
		if ( ! empty( $job['review'] ) && (int) $c['staged'] > 0 ) {
			self::line( 'Review: ' . $job['review'] );
		}
	}

	/**
	 * @param string $message
	 */
	private static function line( $message ) {
		if ( class_exists( '\WP_CLI' ) ) {
			\WP_CLI::line( $message );
		}
	}

	/**
	 * @param string $message
	 */
	private static function ok( $message ) {
		if ( class_exists( '\WP_CLI' ) ) {
			\WP_CLI::success( $message );
		}
	}

	/**
	 * @param string $message
	 */
	private static function fail( $message ) {
		if ( class_exists( '\WP_CLI' ) ) {
			\WP_CLI::error( $message );
		}
	}
}
