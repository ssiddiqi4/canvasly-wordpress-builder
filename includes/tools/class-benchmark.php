<?php
/**
 * Repeatable performance benchmark.
 *
 * `wp sidcraft-page-builder benchmark` builds a temporary page with about
 * 200 units, then measures:
 *  - document save time and the number of database writes it makes;
 *  - server render time and peak memory for that page (in process, cold and
 *    warm unit cache);
 *  - a real front-end request (loopback HTTP): wall time, peak PHP memory,
 *    database writes during the request, and the CSS/JS the builder adds,
 *    in raw and gzip bytes;
 *  - the same request for a page without builder content (should add nothing);
 *  - the editor's own script and style bytes.
 * The temporary pages are deleted afterwards unless --keep is given.
 * Editor start-up time in a browser is measured by tools/bench-editor.mjs in
 * the source repository.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Tools;

use SidcraftPageBuilder\Document\DocumentManager;
use SidcraftPageBuilder\Rendering\FrontendRenderer;
use SidcraftPageBuilder\Rendering\OutputEscape;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Benchmark {

	const TOKEN  = 'sidcraft_page_builder_bench_token';
	const RESULT = 'sidcraft_page_builder_bench_result_';
	const MARK   = '_sidsyn_benchmark';

	/** @var array|null Request instrumentation state. */
	private static $probe = null;

	/**
	 * Hook the request probe as early as possible. It only activates on a
	 * request that carries the one-time token the CLI command just created.
	 */
	public static function init() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Compared with a one-time token below.
		if ( empty( $_GET['sidsyn_bench'] ) ) {
			return;
		}
		$token = (string) get_transient( self::TOKEN );
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$given = sanitize_text_field( wp_unslash( $_GET['sidsyn_bench'] ) );
		if ( $token === '' || ! hash_equals( $token, $given ) ) {
			return;
		}
		self::$probe = array(
			'token'  => $token,
			'start'  => isset( $_SERVER['REQUEST_TIME_FLOAT'] ) ? (float) $_SERVER['REQUEST_TIME_FLOAT'] : microtime( true ),
			'writes' => array(),
			'assets' => array(),
		);
		add_filter( 'query', array( self::class, 'watch_query' ) );
		add_action( 'wp_print_footer_scripts', array( self::class, 'collect_assets' ), PHP_INT_MAX );
		add_action( 'shutdown', array( self::class, 'finish' ), PHP_INT_MAX );
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}
	}

	/**
	 * @param string $sql
	 * @return string
	 */
	public static function watch_query( $sql ) {
		if ( self::$probe && preg_match( '/^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i', (string) $sql ) ) {
			self::$probe['writes'][] = substr( preg_replace( '/\s+/', ' ', (string) $sql ), 0, 160 );
		}
		return $sql;
	}

	/**
	 * Styles and scripts printed on this page that come from Sidcraft plugins.
	 */
	public static function collect_assets() {
		if ( ! self::$probe ) {
			return;
		}
		$out = array();
		foreach ( array(
			'css' => wp_styles(),
			'js'  => wp_scripts(),
		) as $kind => $deps ) {
			foreach ( (array) $deps->done as $handle ) {
				$reg = $deps->registered[ $handle ] ?? null;
				if ( ! $reg ) {
					continue;
				}
				$src    = is_string( $reg->src ) ? $reg->src : '';
				$inline = '';
				if ( $kind === 'css' ) {
					$inline = implode( '', (array) $deps->get_data( $handle, 'after' ) );
				} else {
					$inline = (string) $deps->get_data( $handle, 'data' ) . implode( '', (array) $deps->get_data( $handle, 'before' ) ) . implode( '', (array) $deps->get_data( $handle, 'after' ) );
				}
				$ours = strpos( $handle, 'sidcraft' ) !== false || strpos( $src, '/sidcraft-' ) !== false || strpos( $src, '/uploads/sidcraft-page-builder/' ) !== false;
				if ( ! $ours ) {
					continue;
				}
				$out[] = array(
					'kind'   => $kind,
					'handle' => $handle,
					'src'    => $src,
					'inline' => $inline,
				);
			}
		}
		self::$probe['assets'] = $out;
	}

	public static function finish() {
		if ( ! self::$probe ) {
			return;
		}
		$p = self::$probe;
		self::$probe = null;
		remove_filter( 'query', array( self::class, 'watch_query' ) );
		$assets = array();
		foreach ( $p['assets'] as $a ) {
			$file  = self::src_to_path( $a['src'] );
			$body  = $file && is_readable( $file ) ? (string) file_get_contents( $file ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			$total = $body . (string) $a['inline'];
			$assets[] = array(
				'kind'   => $a['kind'],
				'handle' => $a['handle'],
				'file'   => $file ? str_replace( ABSPATH, '', $file ) : '',
				'bytes'  => strlen( $total ),
				'gzip'   => $total !== '' && function_exists( 'gzencode' ) ? strlen( (string) gzencode( $total, 6 ) ) : 0,
				'inline' => strlen( (string) $a['inline'] ),
			);
		}
		set_transient(
			self::RESULT . $p['token'],
			array(
				'ms'       => round( ( microtime( true ) - $p['start'] ) * 1000, 1 ),
				'peak_mb'  => round( memory_get_peak_usage( true ) / 1048576, 1 ),
				'writes'   => $p['writes'],
				'assets'   => $assets,
				'queries'  => function_exists( 'get_num_queries' ) ? get_num_queries() : 0,
				'opcache'  => function_exists( 'opcache_get_status' ) && is_array( @opcache_get_status( false ) ) ? 'on' : 'off', // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
				'sapi'     => PHP_SAPI,
			),
			600
		);
	}

	/**
	 * @param string $src
	 * @return string
	 */
	private static function src_to_path( $src ) {
		if ( $src === '' ) {
			return '';
		}
		$path = (string) wp_parse_url( $src, PHP_URL_PATH );
		$maps = array(
			(string) wp_parse_url( content_url(), PHP_URL_PATH ) => WP_CONTENT_DIR,
			(string) wp_parse_url( site_url(), PHP_URL_PATH ) . '/' => ABSPATH,
		);
		foreach ( $maps as $url => $dir ) {
			if ( $url !== '' && strpos( $path, $url ) === 0 ) {
				$file = rtrim( $dir, '/' ) . '/' . ltrim( substr( $path, strlen( $url ) ), '/' );
				return file_exists( $file ) ? $file : '';
			}
		}
		return '';
	}

	/**
	 * A layout with `$count` units: containers of nine common units each.
	 *
	 * @param int $count
	 * @return array
	 */
	public static function layout( $count = 200 ) {
		$kids = array(
			array( 'heading', array( 'text' => 'Section heading', 'tag' => 'h2' ) ),
			array( 'text', array( 'text' => '<p>Paragraph with <strong>bold</strong> and a <a href="https://example.com">link</a>. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>' ) ),
			array( 'image', array() ),
			array( 'button', array( 'text' => 'Call to action' ) ),
			array( 'icon_list', array() ),
			array( 'divider', array() ),
			array( 'counter', array() ),
			array( 'accordion', array() ),
			array( 'testimonial', array() ),
		);
		$root = array();
		$n    = 0;
		$s    = 0;
		while ( $n < $count ) {
			++$s;
			$children = array();
			++$n;
			foreach ( $kids as $i => $k ) {
				if ( $n >= $count ) {
					break;
				}
				$children[] = array(
					'id'       => 'b' . $s . '_' . $i,
					'type'     => $k[0],
					'settings' => $k[1],
				);
				++$n;
			}
			$root[] = array(
				'id'       => 'b' . $s,
				'type'     => 'container',
				'settings' => array(),
				'children' => $children,
			);
		}
		return array(
			'version'  => DocumentManager::SCHEMA,
			'settings' => array(),
			'root'     => $root,
		);
	}

	/**
	 * @param array $doc
	 * @return int
	 */
	public static function count_nodes( array $doc ) {
		$n    = 0;
		$walk = function ( $nodes ) use ( &$walk, &$n ) {
			foreach ( (array) $nodes as $node ) {
				++$n;
				$walk( $node['children'] ?? array() );
			}
		};
		foreach ( array( 'root', 'header', 'footer' ) as $part ) {
			$walk( $doc[ $part ] ?? array() );
		}
		return $n;
	}

	/**
	 * Run everything.
	 *
	 * @param array $args {units:int, keep:bool, runs:int}
	 * @return array
	 */
	public static function run( array $args = array() ) {
		global $wpdb;
		$count = max( 10, min( 2000, absint( $args['units'] ?? 200 ) ) );
		$runs  = max( 1, min( 20, absint( $args['runs'] ?? 5 ) ) );
		$out   = array(
			'environment' => array(
				'plugin'    => defined( 'SIDCRAFT_PAGE_BUILDER_VERSION' ) ? SIDCRAFT_PAGE_BUILDER_VERSION : '',
				'pro'       => defined( 'SIDCRAFT_BUILDER_PRO_VERSION' ) ? SIDCRAFT_BUILDER_PRO_VERSION : '',
				'wordpress' => get_bloginfo( 'version' ),
				'php'       => PHP_VERSION,
				'theme'     => get_stylesheet(),
				'object_cache' => wp_using_ext_object_cache() ? 'persistent' : 'none',
				'cli_opcache' => function_exists( 'opcache_get_status' ) && is_array( @opcache_get_status( false ) ) ? 'on' : 'off', // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			),
		);

		$doc  = self::layout( $count );
		$page = wp_insert_post(
			array(
				'post_type'   => 'page',
				'post_status' => 'publish',
				'post_title'  => 'Sidcraft benchmark (temporary)',
			),
			true
		);
		$bare = wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => 'Sidcraft benchmark, no builder (temporary)',
				'post_content' => '<!-- wp:paragraph --><p>Plain page.</p><!-- /wp:paragraph -->',
			),
			true
		);
		if ( is_wp_error( $page ) || is_wp_error( $bare ) ) {
			return array( 'error' => 'Could not create the benchmark pages.' );
		}
		update_post_meta( $page, self::MARK, 1 );
		update_post_meta( $bare, self::MARK, 1 );

		try {
			// Save: first write, then an unchanged re-save.
			$writes = 0;
			$count_writes = function ( $sql ) use ( &$writes ) {
				if ( preg_match( '/^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i', (string) $sql ) ) {
					++$writes;
				}
				return $sql;
			};
			add_filter( 'query', $count_writes );
			$t     = microtime( true );
			$saved = DocumentManager::save( $page, $doc );
			$save_ms     = ( microtime( true ) - $t ) * 1000;
			$save_writes = $writes;
			$writes      = 0;
			$t           = microtime( true );
			DocumentManager::save( $page, $saved );
			$resave_ms     = ( microtime( true ) - $t ) * 1000;
			$resave_writes = $writes;
			remove_filter( 'query', $count_writes );
			$doc   = is_array( $saved ) ? $saved : $doc;
			$nodes = self::count_nodes( $doc );
			$out['page'] = array(
				'units'               => $nodes,
				'document_json_kb'    => round( strlen( (string) wp_json_encode( $doc ) ) / 1024, 1 ),
				'save_ms'             => round( $save_ms, 1 ),
				'save_db_writes'      => $save_writes,
				'unchanged_save_ms'   => round( $resave_ms, 1 ),
				'unchanged_save_db_writes' => $resave_writes,
			);

			// In-process render.
			$render = function () use ( $doc, $page ) {
				return OutputEscape::render(
					function () use ( $doc, $page ) {
						return FrontendRenderer::render_document( $doc, $page );
					}
				);
			};
			if ( class_exists( '\\SidcraftPageBuilder\\Design\\Optimize' ) && method_exists( '\\SidcraftPageBuilder\\Design\\Optimize', 'flush_all' ) ) {
				\SidcraftPageBuilder\Design\Optimize::flush_all();
			}
			$GLOBALS['post'] = get_post( $page ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			$mem0  = memory_get_usage();
			$peak0 = memory_get_peak_usage();
			$q0    = $wpdb->num_queries;
			$t     = microtime( true );
			$html  = (string) $render();
			$cold  = ( microtime( true ) - $t ) * 1000;
			$cold_q = $wpdb->num_queries - $q0;
			$times = array();
			for ( $i = 0; $i < $runs; $i++ ) {
				$t       = microtime( true );
				$render();
				$times[] = ( microtime( true ) - $t ) * 1000;
			}
			sort( $times );
			$out['render'] = array(
				'cold_ms'          => round( $cold, 1 ),
				'warm_ms_median'   => round( $times[ (int) floor( count( $times ) / 2 ) ], 1 ),
				'cold_db_queries'  => $cold_q,
				'html_kb'          => round( strlen( $html ) / 1024, 1 ),
				'memory_added_mb'  => round( max( 0, memory_get_usage() - $mem0 ) / 1048576, 2 ),
				'peak_growth_mb'   => round( max( 0, memory_get_peak_usage() - $peak0 ) / 1048576, 2 ),
			);

			// Real requests.
			$out['frontend']      = self::http_probe( $page, 2 );
			$out['frontend_bare'] = self::http_probe( $bare, 2 );
			$out['editor']        = self::editor_assets();
		} finally {
			if ( empty( $args['keep'] ) ) {
				wp_delete_post( $page, true );
				wp_delete_post( $bare, true );
			} else {
				$out['kept'] = array( 'page' => get_permalink( $page ), 'bare' => get_permalink( $bare ) );
			}
		}
		return $out;
	}

	/**
	 * Request a page `$times` times; report the last request.
	 *
	 * @param int $post_id
	 * @param int $times
	 * @return array
	 */
	private static function http_probe( $post_id, $times = 2 ) {
		$res = array();
		for ( $i = 0; $i < $times; $i++ ) {
			$token = wp_generate_password( 24, false );
			set_transient( self::TOKEN, $token, 300 );
			$url   = add_query_arg( 'sidsyn_bench', $token, get_permalink( $post_id ) );
			$t     = microtime( true );
			$resp  = wp_remote_get(
				$url,
				array(
					'timeout'   => 60,
					'sslverify' => false,
					'headers'   => array( 'Cache-Control' => 'no-cache' ),
				)
			);
			$wall  = ( microtime( true ) - $t ) * 1000;
			delete_transient( self::TOKEN );
			if ( is_wp_error( $resp ) ) {
				return array( 'error' => 'Loopback request failed: ' . $resp->get_error_message() );
			}
			$data = get_transient( self::RESULT . $token );
			delete_transient( self::RESULT . $token );
			if ( ! is_array( $data ) ) {
				return array( 'error' => 'The page answered (' . (int) wp_remote_retrieve_response_code( $resp ) . ') but the probe did not run. A page cache may have served it.' );
			}
			$css = 0;
			$js  = 0;
			$cgz = 0;
			$jgz = 0;
			foreach ( $data['assets'] as $a ) {
				if ( $a['kind'] === 'css' ) {
					$css += $a['bytes'];
					$cgz += $a['gzip'];
				} else {
					$js += $a['bytes'];
					$jgz += $a['gzip'];
				}
			}
			$res = array(
				'run'              => $i + 1,
				'wall_ms'          => round( $wall, 1 ),
				'server_ms'        => $data['ms'],
				'peak_memory_mb'   => $data['peak_mb'],
				'server_opcache'   => $data['opcache'] ?? '',
				'server_sapi'      => $data['sapi'] ?? '',
				'db_queries'       => $data['queries'],
				'db_writes'        => count( $data['writes'] ),
				'write_queries'    => array_slice( $data['writes'], 0, 10 ),
				'html_kb'          => round( strlen( (string) wp_remote_retrieve_body( $resp ) ) / 1024, 1 ),
				'builder_css_kb'   => round( $css / 1024, 1 ),
				'builder_css_gzip_kb' => round( $cgz / 1024, 1 ),
				'builder_js_kb'    => round( $js / 1024, 1 ),
				'builder_js_gzip_kb'  => round( $jgz / 1024, 1 ),
				'assets'           => $data['assets'],
			);
		}
		return $res;
	}

	/**
	 * Script and style files the editor loads from this plugin.
	 *
	 * @return array
	 */
	private static function editor_assets() {
		$base  = defined( 'SIDCRAFT_PAGE_BUILDER_PATH' ) ? SIDCRAFT_PAGE_BUILDER_PATH : '';
		$files = array( 'assets/js/editor.js', 'assets/css/editor.css', 'assets/js/xeditor.js' );
		$out   = array();
		$raw   = 0;
		$gz    = 0;
		foreach ( $files as $f ) {
			$path = $base . $f;
			if ( ! is_readable( $path ) ) {
				continue;
			}
			$body  = (string) file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			$g     = function_exists( 'gzencode' ) ? strlen( (string) gzencode( $body, 6 ) ) : 0;
			$raw  += strlen( $body );
			$gz   += $g;
			$out[] = array(
				'file'    => $f,
				'kb'      => round( strlen( $body ) / 1024, 1 ),
				'gzip_kb' => round( $g / 1024, 1 ),
			);
		}
		return array(
			'files'      => $out,
			'total_kb'   => round( $raw / 1024, 1 ),
			'total_gzip_kb' => round( $gz / 1024, 1 ),
		);
	}
}
