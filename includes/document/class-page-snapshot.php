<?php
/**
 * Full-page copy of each builder page, served while the builder is off.
 *
 * FallbackContent keeps a clean, readable copy in post_content for search,
 * feeds and the block editor; it drops styling, scripts, forms and embeds by
 * design. This class keeps a second copy for visitors: the complete page as
 * WordPress sent it, with the builder's layout, styles, fonts, forms, buttons,
 * video, audio, iframes, maps and sliders.
 *
 * While the builder runs, each published builder page is rendered as a guest
 * through a signed loopback request and the finished HTML is stored as a file
 * in uploads/sidcraft-page-builder/html-copies/, with a small record in post
 * meta. Keeping the HTML out of post meta matters: WordPress loads all of a
 * post's meta on every view, so a copy stored there would be read on every
 * request. A must-use plugin (copied into wp-content/mu-plugins) serves that copy
 * whenever Sidcraft Page Builder is not running. The CSS and JS the page links
 * stay on disk in the deactivated plugin folder and in uploads.
 *
 * Copies refresh after each save, on a background sweep, after a template
 * change, and for any stale page right before the plugin is deactivated. A
 * copy is served only while it matches the saved layout and the post has not
 * been edited since; otherwise the page falls back to post_content.
 *
 * Add-ons that render part of the page (Sidcraft Builder Pro) register on
 * `sidcraft_page_builder_snapshot_addons`. Each copy records which add-ons
 * were running, so an add-on can serve these copies itself while it is off,
 * and a copy made with an add-on is not replaced by one made after the add-on
 * was switched off unless the layout itself changed.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Document;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PageSnapshot {

	const META        = '_sidsyn_page_snapshot';
	const KEY         = 'sidcraft_page_builder_snapshot_key';
	const CURSOR      = 'sidcraft_page_builder_snapshot_cursor';
	const STALE       = 'sidcraft_page_builder_snapshot_stale_before';
	const QUERY_VAR   = 'sidcraft_page_builder_snapshot';
	const EVENT_POST  = 'sidcraft_page_builder_snapshot_post';
	const EVENT_SWEEP = 'sidcraft_page_builder_snapshot_sweep';
	const MU_FILE     = 'sidcraft-page-builder-page-snapshot.php';
	const MU_HEADER   = 'Sidcraft Page Builder Page Fallback';
	const OPTION_MU   = 'sidcraft_page_builder_page_fallback_mu';
	const CLEANUP     = 'sidcraft_page_builder_mu_cleanup_version';
	const MAX_BYTES   = 5242880;
	const STATUS      = 'sidcraft_page_builder_snapshot_status';
	const LOCK        = 'sidsyn_snapshot_lock_';
	const COVERAGE    = 'sidsyn_snapshot_coverage';
	const CHECKED     = 'sidsyn_snapshot_checked';
	const DIR         = 'sidcraft-page-builder/html-copies';

	/** @var int|null Output buffer level of the capture buffer. */
	private static $level = null;

	/** @var int Post being captured. */
	private static $capturing = 0;

	/**
	 * @return void
	 */
	public static function init() {
		add_action( 'template_redirect', array( self::class, 'maybe_capture' ), 0 );
		add_action( 'sidcraft_page_builder_document_after_save', array( self::class, 'on_document_save' ), 20, 1 );
		add_action( 'save_post', array( self::class, 'on_save_post' ), 20, 2 );
		add_action( self::EVENT_POST, array( self::class, 'refresh' ) );
		add_action( self::EVENT_SWEEP, array( self::class, 'sweep' ) );
		add_action( 'deactivate_plugin', array( self::class, 'before_deactivate' ), 10, 1 );
		if ( is_admin() ) {
			add_action( 'admin_init', array( self::class, 'maintain' ) );
			add_action( 'admin_notices', array( self::class, 'admin_notice' ) );
			add_action( 'admin_post_sidcraft_page_builder_snapshot_now', array( self::class, 'handle_save_now' ) );
			add_action( 'admin_post_sidcraft_page_builder_fallback_toggle', array( self::class, 'handle_fallback_toggle' ) );
			add_action( 'sidcraft_page_builder_tools_screen', array( self::class, 'tools_screen' ), 25 );
			add_filter( 'plugin_action_links_' . plugin_basename( SIDCRAFT_PAGE_BUILDER_FILE ), array( self::class, 'action_links' ) );
		}
	}

	/**
	 * Whether the feature is on. Default on.
	 *
	 * @return bool
	 */
	public static function enabled() {
		/**
		 * Filter whether Sidcraft Page Builder keeps full-page copies to serve while it is off.
		 *
		 * @param bool $enabled
		 */
		return (bool) apply_filters( 'sidcraft_page_builder_page_snapshot_enabled', true );
	}

	/**
	 * Whether the fallback must-use plugin was explicitly installed.
	 *
	 * Copies can still be saved while this is off; the mu-plugin is only needed
	 * to serve them after the builder is deactivated.
	 *
	 * @return bool
	 */
	public static function mu_enabled() {
		return (bool) get_option( self::OPTION_MU, 0 );
	}

	/**
	 * Add-ons running on this request that render part of builder pages.
	 *
	 * @return array<string,string> Slug => version.
	 */
	public static function addons() {
		/**
		 * Filter the add-ons recorded with each page copy.
		 *
		 * @param array<string,string> $addons Slug => version.
		 */
		$addons = apply_filters( 'sidcraft_page_builder_snapshot_addons', array() );
		$out    = array();
		foreach ( is_array( $addons ) ? $addons : array() as $slug => $version ) {
			$slug = sanitize_key( (string) $slug );
			if ( '' !== $slug ) {
				$out[ $slug ] = sanitize_text_field( (string) $version );
			}
		}
		ksort( $out );
		return $out;
	}

	/**
	 * Refresh every missing or stale copy now, within a time budget. Used right
	 * before this plugin or an add-on is deactivated.
	 *
	 * @param int $budget Seconds to spend.
	 * @return void
	 */
	public static function refresh_stale( $budget = 90 ) {
		if ( ! self::enabled() ) {
			return;
		}
		if ( self::mu_enabled() ) {
			self::install_mu_plugin();
		}
		update_option( self::CURSOR, 0, false );
		self::sweep( self::time_budget( $budget ), PHP_INT_MAX );
	}

	/**
	 * Seconds a sweep may spend in this request: `$wanted`, cut to what PHP's
	 * max_execution_time leaves after one more page render (a loopback request
	 * times out after 20 seconds). The limit itself is never changed; pages left
	 * over are picked up by the scheduled sweep.
	 *
	 * @param int $wanted
	 * @return int
	 */
	public static function time_budget( $wanted ) {
		$wanted = max( 0, (int) $wanted );
		$limit  = (int) ini_get( 'max_execution_time' );
		if ( $limit <= 0 ) {
			return $wanted;
		}
		$started = isset( $_SERVER['REQUEST_TIME_FLOAT'] ) ? (float) $_SERVER['REQUEST_TIME_FLOAT'] : microtime( true );
		$left    = $limit - (int) ceil( microtime( true ) - $started ) - 25;
		return max( 0, min( $wanted, $left ) );
	}

	/**
	 * Start the first sweep. The fallback mu-plugin is installed only on request.
	 *
	 * @return void
	 */
	public static function activate() {
		if ( ! self::enabled() ) {
			return;
		}
		self::cleanup_mu_plugins();
		self::schedule_sweep( 10 );
	}

	/**
	 * Clear scheduled refreshes. Copies and the must-use plugin stay so pages keep
	 * their look while the plugin is off.
	 *
	 * @return void
	 */
	public static function deactivate() {
		wp_clear_scheduled_hook( self::EVENT_SWEEP );
		wp_unschedule_hook( self::EVENT_POST );
	}

	/**
	 * Remove the copies, options and must-use plugin. Called from uninstall.php.
	 *
	 * @return void
	 */
	public static function uninstall() {
		self::deactivate();
		self::remove_mu_plugins();
		delete_option( self::OPTION_MU );
		delete_option( self::CLEANUP );
		delete_option( self::KEY );
		delete_option( self::CURSOR );
		delete_option( self::STALE );
		delete_option( self::STATUS );
		delete_transient( self::COVERAGE );
		delete_transient( self::CHECKED );
		delete_post_meta_by_key( self::META );
		$dir = self::dir();
		if ( '' !== $dir && is_dir( $dir ) ) {
			foreach ( (array) glob( $dir . '/{,.}*.{html,tmp,php,htaccess}', GLOB_BRACE ) as $file ) {
				wp_delete_file( $file );
			}
			@rmdir( $dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.file_system_operations_rmdir -- Empty folder we created.
		}
	}

	/**
	 * Right before this plugin leaves active_plugins, refresh every missing or
	 * stale copy within a time budget. WordPress updates active_plugins after
	 * `deactivate_plugin`, so the loopback requests still render with the builder on.
	 *
	 * @param string $plugin Plugin basename being deactivated.
	 * @return void
	 */
	public static function before_deactivate( $plugin ) {
		if ( plugin_basename( SIDCRAFT_PAGE_BUILDER_FILE ) !== $plugin ) {
			return;
		}
		self::refresh_stale( 90 );
	}

	/**
	 * Remove duplicate mu-plugins once per version and keep the sweep scheduled.
	 *
	 * @return void
	 */
	public static function maintain() {
		if ( ! self::enabled() || ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		// Any admin screen, not only the builder's own: an update by zip upload
		// skips the activation hook.
		if ( wp_doing_ajax() ) {
			return;
		}
		if ( get_option( self::CLEANUP ) !== SIDCRAFT_PAGE_BUILDER_VERSION ) {
			// Remove duplicates left by older builds once per plugin version.
			self::cleanup_mu_plugins();
			update_option( self::CLEANUP, SIDCRAFT_PAGE_BUILDER_VERSION, false );
		}
		// Check the files on the Plugins screen (where plugins are replaced and
		// deactivated) and otherwise twice a day, not on every admin request.
		$checked = get_transient( self::CHECKED );
		if ( 'plugins.php' !== ( $GLOBALS['pagenow'] ?? '' ) && $checked ) {
			return;
		}
		if ( ! $checked ) {
			set_transient( self::CHECKED, 1, 12 * HOUR_IN_SECONDS );
		}
		// The mu-plugin is opt-in, but copies stay fresh whether or not it is installed.
		if ( ! wp_next_scheduled( self::EVENT_SWEEP ) ) {
			self::schedule_sweep( 60 );
		}
	}

	/**
	 * @param int $delay Seconds from now.
	 * @return void
	 */
	private static function schedule_sweep( $delay ) {
		wp_clear_scheduled_hook( self::EVENT_SWEEP );
		wp_schedule_single_event( time() + max( 1, (int) $delay ), self::EVENT_SWEEP );
	}

	/**
	 * Templates (header, footer, single, popups) appear on many pages: refresh all
	 * copies. Pages refresh themselves.
	 *
	 * @param int $post_id
	 * @return void
	 */
	public static function on_document_save( $post_id ) {
		delete_transient( self::COVERAGE );
		$post_id = absint( $post_id );
		if ( ! $post_id || ! self::enabled() ) {
			return;
		}
		if ( 'sidsyn_template' === get_post_type( $post_id ) || 'sidsyn_component' === get_post_type( $post_id ) ) {
			self::mark_all_stale();
			return;
		}
		self::queue( $post_id );
	}

	/**
	 * Title, slug, status and template changes made outside the builder.
	 *
	 * @param int      $post_id
	 * @param \WP_Post $post
	 * @return void
	 */
	public static function on_save_post( $post_id, $post ) {
		if ( ! self::enabled() || wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) || ! is_object( $post ) ) {
			return;
		}
		if ( in_array( $post->post_type, array( 'sidsyn_template', 'sidsyn_component' ), true ) ) {
			self::mark_all_stale();
			return;
		}
		self::queue( $post_id );
	}

	/**
	 * @return void
	 */
	private static function mark_all_stale() {
		delete_transient( self::COVERAGE );
		update_option( self::STALE, time(), false );
		update_option( self::CURSOR, 0, false );
		self::schedule_sweep( 60 );
	}

	/**
	 * @param int $post_id
	 * @return void
	 */
	private static function queue( $post_id ) {
		if ( ! self::eligible( $post_id ) ) {
			return;
		}
		$args = array( (int) $post_id );
		if ( ! wp_next_scheduled( self::EVENT_POST, $args ) ) {
			wp_schedule_single_event( time() + 30, self::EVENT_POST, $args );
		}
	}

	/**
	 * Refresh stale copies in post ID order, a batch at a time.
	 *
	 * @param int $budget Seconds to spend.
	 * @param int $limit  Pages to render at most.
	 * @return void
	 */
	public static function sweep( $budget = 20, $limit = 10 ) {
		if ( ! self::enabled() ) {
			return;
		}
		$start    = microtime( true );
		$rendered = 0;
		$cursor   = (int) get_option( self::CURSOR, 0 );
		$done     = false;
		while ( microtime( true ) - $start < $budget && $rendered < $limit ) {
			$ids = self::batch( $cursor, 100 );
			if ( ! $ids ) {
				$done = true;
				break;
			}
			foreach ( $ids as $id ) {
				if ( microtime( true ) - $start >= $budget || $rendered >= $limit ) {
					break 2;
				}
				$cursor = (int) $id;
				if ( ! self::eligible( $id ) || ! self::stale( $id ) ) {
					continue;
				}
				self::refresh( $id );
				++$rendered;
			}
		}
		update_option( self::CURSOR, $done ? 0 : $cursor, false );
		// Keep going soon while there is work; otherwise check again tomorrow.
		self::schedule_sweep( $done ? DAY_IN_SECONDS : 120 );
	}

	/**
	 * Published posts that carry a builder document, after `$after`.
	 *
	 * @param int $after
	 * @param int $count
	 * @return int[]
	 */
	private static function batch( $after, $count ) {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT DISTINCT p.ID FROM {$wpdb->posts} p INNER JOIN {$wpdb->postmeta} m ON m.post_id = p.ID AND m.meta_key = %s WHERE p.ID > %d AND p.post_status = 'publish' ORDER BY p.ID ASC LIMIT %d",
				DocumentManager::META,
				absint( $after ),
				absint( $count )
			)
		);
		return array_map( 'intval', (array) $ids );
	}

	/**
	 * A published, public, unprotected page with a builder layout.
	 *
	 * @param int $post_id
	 * @return bool
	 */
	public static function eligible( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post || 'publish' !== $post->post_status || '' !== (string) $post->post_password ) {
			return false;
		}
		if ( in_array( $post->post_type, FallbackContent::SKIP_TYPES, true ) ) {
			return false;
		}
		$type = get_post_type_object( $post->post_type );
		if ( ! $type || empty( $type->public ) ) {
			return false;
		}
		return DocumentManager::has( (int) $post_id );
	}

	/**
	 * Fingerprint of what the copy was made from: the layout hash plus the
	 * post's own last edit. The must-use plugin compares the same two values.
	 *
	 * @param int $post_id
	 * @return array{layout:string,modified:string}
	 */
	public static function fingerprint( $post_id ) {
		return array(
			'layout'   => (string) get_post_meta( $post_id, DocumentManager::HASH, true ),
			'modified' => (string) get_post_field( 'post_modified_gmt', $post_id ),
		);
	}

	/**
	 * @param int $post_id
	 * @return bool
	 */
	public static function stale( $post_id ) {
		$snap = get_post_meta( $post_id, self::META, true );
		if ( ! is_array( $snap ) || '' === self::copy_path( $snap ) ) {
			return true;
		}
		$now = self::fingerprint( $post_id );
		if ( (string) ( $snap['layout'] ?? '' ) !== $now['layout'] || (string) ( $snap['modified'] ?? '' ) !== $now['modified'] ) {
			return true;
		}
		// An add-on running now that the copy was made without (for example Pro activated later).
		if ( array_diff_key( self::addons(), (array) ( $snap['addons'] ?? array() ) ) ) {
			return true;
		}
		return (int) ( $snap['time'] ?? 0 ) < (int) get_option( self::STALE, 0 );
	}

	/**
	 * Render one page as a guest and store it. Drops the copy when the page no
	 * longer qualifies.
	 *
	 * @param int $post_id
	 * @return bool Whether a current copy is stored afterwards.
	 */
	public static function refresh( $post_id ) {
		$post_id = absint( $post_id );
		if ( ! self::enabled() ) {
			return false;
		}
		if ( ! self::eligible( $post_id ) ) {
			self::forget( $post_id );
			return false;
		}
		if ( ! get_permalink( $post_id ) ) {
			return false;
		}
		$response = wp_remote_get(
			self::capture_url( $post_id ),
			array(
				'timeout'     => 20,
				// Follow http→https and canonical redirects; the signed parameter is kept.
				'redirection' => 5,
				'sslverify'   => apply_filters( 'https_local_ssl_verify', false ), // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Core loopback filter.
				'headers'     => array( 'Cache-Control' => 'no-cache' ),
			)
		);
		// The loopback request stored the copy itself.
		wp_cache_delete( $post_id, 'post_meta' );
		$ok = ! self::stale( $post_id );
		if ( $ok ) {
			$result = 'ok';
		} elseif ( is_wp_error( $response ) ) {
			$result = $response->get_error_message();
		} else {
			$code   = (int) wp_remote_retrieve_response_code( $response );
			$result = 200 === $code
				/* translators: Shown when the site's request to its own page succeeded but no copy was stored. */
				? __( 'the page answered, but no copy was saved (a page cache or security plugin may have answered instead of WordPress)', 'sidcraft-page-builder' )
				/* translators: %d: HTTP status code. */
				: sprintf( __( 'the page answered with HTTP status %d', 'sidcraft-page-builder' ), $code );
		}
		update_option(
			self::STATUS,
			array(
				'time'   => time(),
				'post'   => $post_id,
				'result' => $result,
			),
			false
		);
		return $ok;
	}

	/**
	 * Signed URL that makes a guest request for the page save its copy.
	 *
	 * @param int $post_id
	 * @return string
	 */
	public static function capture_url( $post_id ) {
		$url = get_permalink( $post_id );
		return $url ? add_query_arg( self::QUERY_VAR, rawurlencode( self::key() ), $url ) : '';
	}

	/**
	 * Secret that marks this plugin's own loopback requests.
	 *
	 * @return string
	 */
	private static function key() {
		$key = (string) get_option( self::KEY, '' );
		if ( ! preg_match( '/^[a-f0-9]{32}$/', $key ) ) {
			$key = bin2hex( random_bytes( 16 ) );
			update_option( self::KEY, $key, false );
		}
		return $key;
	}

	/**
	 * Buffer the whole page and store it at shutdown, on a signed request or on an
	 * ordinary visitor's view of a page whose copy is missing or stale. Only
	 * logged-out views are stored: a logged-in page carries that user's nonces and
	 * admin bar, which must never be shown to visitors.
	 *
	 * @return void
	 */
	public static function maybe_capture() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Authenticated by the shared secret below.
		$given  = isset( $_GET[ self::QUERY_VAR ] ) ? sanitize_text_field( wp_unslash( $_GET[ self::QUERY_VAR ] ) ) : '';
		$signed = '' !== $given && hash_equals( self::key(), $given );
		$method = isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( sanitize_key( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) ) : 'GET';
		if ( ! self::enabled() || 'GET' !== $method || ! is_singular() || is_user_logged_in() || is_preview() ) {
			return;
		}
		$post_id = (int) get_queried_object_id();
		if ( ! self::eligible( $post_id ) ) {
			return;
		}
		if ( ! $signed ) {
			// Plain visit: no query string (paging, search and form results differ),
			// copy actually needed, and one capture per page at a time.
			if ( ! empty( $_GET ) || ! self::stale( $post_id ) || get_transient( self::LOCK . $post_id ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Only checks that there is no query string.
				return;
			}
			set_transient( self::LOCK . $post_id, 1, MINUTE_IN_SECONDS );
		}
		if ( $signed ) {
			if ( ! defined( 'DONOTCACHEPAGE' ) ) {
				define( 'DONOTCACHEPAGE', true ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound -- Standard constant read by page-cache plugins.
			}
			nocache_headers();
		}
		self::$capturing = $post_id;
		ob_start();
		self::$level = ob_get_level();
		add_action( 'shutdown', array( self::class, 'finish_capture' ), 0 );
	}

	/**
	 * @return void
	 */
	public static function finish_capture() {
		if ( null === self::$level || ob_get_level() < self::$level ) {
			return;
		}
		while ( ob_get_level() > self::$level ) {
			ob_end_flush();
		}
		$html = (string) ob_get_clean();
		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Page output passed through unchanged.
		self::$level = null;
		if ( 200 !== http_response_code() || strlen( $html ) > self::MAX_BYTES || false === stripos( $html, '</html>' ) ) {
			return;
		}
		$id     = self::$capturing;
		$print  = self::fingerprint( $id );
		$addons = self::addons();
		$old    = get_post_meta( $id, self::META, true );
		// Same layout, but an add-on that rendered the stored copy is off now: keep
		// that copy, which still shows the page as designed.
		if ( is_array( $old ) && '' !== self::copy_path( $old ) && (string) ( $old['layout'] ?? '' ) === $print['layout'] && (string) ( $old['modified'] ?? '' ) === $print['modified'] && array_diff_key( (array) ( $old['addons'] ?? array() ), $addons ) ) {
			$old['time'] = time();
			update_post_meta( $id, self::META, wp_slash( $old ) );
			return;
		}
		$file = self::write_copy( $id, self::scrub( $html ) );
		if ( '' === $file ) {
			return;
		}
		$snap = array_merge(
			$print,
			array(
				'file'    => $file,
				'time'    => time(),
				'version' => SIDCRAFT_PAGE_BUILDER_VERSION,
				'addons'  => $addons,
			)
		);
		update_post_meta( $id, self::META, wp_slash( $snap ) );
		// The record now points at the new file; drop the one it replaced.
		if ( is_array( $old ) && ! empty( $old['file'] ) && $old['file'] !== $file ) {
			$prev = self::copy_path( $old );
			if ( '' !== $prev ) {
				wp_delete_file( $prev );
			}
		}
		delete_transient( self::COVERAGE );
	}

	/**
	 * Folder holding the HTML copies, or an empty string when uploads is unavailable.
	 *
	 * @return string
	 */
	public static function dir() {
		$uploads = wp_upload_dir( null, false );
		if ( ! empty( $uploads['error'] ) || empty( $uploads['basedir'] ) ) {
			return '';
		}
		return untrailingslashit( $uploads['basedir'] ) . '/' . self::DIR;
	}

	/**
	 * Absolute path of a record's HTML file, or an empty string when it is missing.
	 *
	 * @param array $snap
	 * @return string
	 */
	public static function copy_path( $snap ) {
		$file = is_array( $snap ) ? (string) ( $snap['file'] ?? '' ) : '';
		if ( ! preg_match( '/^\d+-[a-f0-9]{16}\.html$/', $file ) ) {
			return '';
		}
		$path = self::dir() . '/' . $file;
		return is_readable( $path ) ? $path : '';
	}

	/**
	 * Write a page's HTML to a new file (written whole, then renamed into place).
	 *
	 * @param int    $post_id
	 * @param string $html
	 * @return string File name, or an empty string on failure.
	 */
	private static function write_copy( $post_id, $html ) {
		$dir = self::dir();
		if ( '' === $dir || ( ! is_dir( $dir ) && ! wp_mkdir_p( $dir ) ) ) {
			return '';
		}
		// No listing and no direct access: the must-use plugin reads the files.
		if ( ! file_exists( $dir . '/index.php' ) ) {
			file_put_contents( $dir . '/index.php', "<?php\n// Silence is golden.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents( $dir . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		}
		$name = absint( $post_id ) . '-' . substr( hash_hmac( 'sha256', $post_id . '|' . microtime( true ), self::key() ), 0, 16 ) . '.html';
		$tmp  = $dir . '/' . $name . '.tmp';
		if ( false === file_put_contents( $tmp, $html, LOCK_EX ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			return '';
		}
		if ( ! @rename( $tmp, $dir . '/' . $name ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.rename_rename
			wp_delete_file( $tmp );
			return '';
		}
		return $name;
	}

	/**
	 * Delete a page's record and its HTML file.
	 *
	 * @param int $post_id
	 * @return void
	 */
	private static function forget( $post_id ) {
		$path = self::copy_path( get_post_meta( $post_id, self::META, true ) );
		if ( '' !== $path ) {
			wp_delete_file( $path );
		}
		delete_post_meta( $post_id, self::META );
		delete_transient( self::COVERAGE );
	}

	/**
	 * Remove the loopback secret wherever the page echoed the request URL.
	 *
	 * @param string $html
	 * @return string
	 */
	public static function scrub( $html ) {
		$key  = preg_quote( self::key(), '/' );
		$var  = preg_quote( self::QUERY_VAR, '/' );
		$html = preg_replace( '/\?' . $var . '(?:=|%3D)' . $key . '(?:&amp;|&|&#038;)/i', '?', (string) $html );
		$html = preg_replace( '/(?:\?|&amp;|&#038;|&)' . $var . '(?:=|%3D)' . $key . '/i', '', (string) $html );
		return str_replace( self::key(), '', (string) $html );
	}

	/**
	 * Published builder pages and the ones without a current copy.
	 *
	 * @param int $max Pages to check at most.
	 * @return array{total:int,ids:int[],missing:int[]}
	 */
	public static function coverage( $max = 500, $fresh = false ) {
		$cached = $fresh ? false : get_transient( self::COVERAGE );
		if ( is_array( $cached ) && isset( $cached['total'], $cached['ids'], $cached['missing'] ) ) {
			return $cached;
		}
		$ids     = self::batch( 0, $max );
		if ( $ids ) {
			// Two queries for every page instead of several per page.
			_prime_post_caches( $ids, false, false );
		}
		$missing = array();
		$pages   = array();
		$total   = 0;
		if ( $ids ) {
			update_meta_cache( 'post', $ids );
		}
		foreach ( $ids as $id ) {
			if ( ! self::eligible( $id ) ) {
				continue;
			}
			++$total;
			$pages[] = $id;
			if ( self::stale( $id ) ) {
				$missing[] = $id;
			}
		}
		$result = array(
			'total'   => $total,
			'ids'     => $pages,
			'missing' => $missing,
		);
		set_transient( self::COVERAGE, $result, 6 * HOUR_IN_SECONDS ); // Cleared whenever a copy is saved, so a long lifetime avoids repeated scans and writes.
		return $result;
	}

	/**
	 * Where the HTML copies section lives: Sidcraft Page Builder → Tools.
	 *
	 * @return string
	 */
	public static function tools_url() {
		return admin_url( 'admin.php?page=sidcraft-page-builder-tools#sidsyn-html-copies' );
	}

	/**
	 * "Save HTML copies" link under the plugin on the Plugins screen.
	 *
	 * @param string[] $links
	 * @return string[]
	 */
	public static function action_links( $links ) {
		$links = is_array( $links ) ? $links : array();
		if ( self::enabled() && current_user_can( 'manage_options' ) ) {
			$links[] = '<a href="' . esc_url( self::tools_url() ) . '">' . esc_html__( 'Save HTML copies', 'sidcraft-page-builder' ) . '</a>';
		}
		return $links;
	}

	/**
	 * Why the site could not save a copy by itself, or an empty string.
	 *
	 * @return string
	 */
	private static function last_error() {
		$status = get_option( self::STATUS );
		if ( is_array( $status ) && isset( $status['result'] ) && 'ok' !== $status['result'] ) {
			return sprintf(
				/* translators: %s: reason, e.g. "cURL error 7: Failed to connect". */
				__( 'The site could not save a copy by itself: %s.', 'sidcraft-page-builder' ),
				(string) $status['result']
			);
		}
		return '';
	}

	/**
	 * @return string Empty when the must-use plugin is in place.
	 */
	private static function mu_problem() {
		if ( ! self::mu_enabled() ) {
			return '';
		}
		if ( '' !== self::mu_path() && is_readable( self::mu_path() ) ) {
			return '';
		}
		return sprintf(
			/* translators: %s: file path. */
			__( 'The must-use plugin that shows the copies could not be written to %s. Allow writes to that folder, or copy includes/ops/page-snapshot-mu.php there.', 'sidcraft-page-builder' ),
			self::mu_path()
		);
	}

	/**
	 * The "Save HTML copies now" button. The browser opens each page as a
	 * logged-out visitor (no cookies), which saves its copy even where the server
	 * cannot reach its own pages; then the server saves anything still missing.
	 *
	 * @param int[]  $ids  Pages to save.
	 * @param string $back Screen to return to.
	 * @return void
	 */
	private static function save_button( array $ids, $back ) {
		$urls = array();
		$ids  = array_slice( $ids, 0, 500 );
		// One query for all permalinks instead of one per page.
		_prime_post_caches( $ids, false, false );
		foreach ( $ids as $id ) {
			$url = self::capture_url( $id );
			if ( '' !== $url ) {
				$urls[] = $url;
			}
		}
		// Raw URL for a script: wp_nonce_url() would HTML-escape the & separator.
		$server = add_query_arg(
			array(
				'action'   => 'sidcraft_page_builder_snapshot_now',
				'_wpnonce' => wp_create_nonce( 'sidcraft_page_builder_snapshot_now' ),
			),
			admin_url( 'admin-post.php' )
		);
		echo '<p><button type="button" class="button button-primary sidsyn-snapshot-now">' . esc_html__( 'Save HTML copies now', 'sidcraft-page-builder' ) . '</button> <span class="sidsyn-snapshot-progress"></span></p>';
		echo '<script>(function(){var b=document.currentScript.previousElementSibling.querySelector(".sidsyn-snapshot-now");if(!b)return;var u=' . wp_json_encode( $urls ) . ',s=' . wp_json_encode( esc_url_raw( $server ) ) . ',r=' . wp_json_encode( esc_url_raw( $back ) ) . ',p=b.parentNode.querySelector(".sidsyn-snapshot-progress");b.addEventListener("click",function(){b.disabled=true;var i=0;(function next(){if(i>=u.length){p.textContent=' . wp_json_encode( __( 'Checking…', 'sidcraft-page-builder' ) ) . ';window.location.href=s+"&back="+encodeURIComponent(r);return;}p.textContent=(i+1)+" / "+u.length;fetch(u[i++],{credentials:"omit",cache:"no-store",mode:"no-cors"}).catch(function(){}).then(function(){next();});})();});})();</script>';
	}

	/**
	 * "HTML copies of pages" section on Sidcraft Page Builder → Tools. Always shown,
	 * so the copies can be saved again at any time.
	 *
	 * @return void
	 */
	public static function tools_screen() {
		if ( ! self::enabled() || ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		$coverage = self::coverage( 500, true );
		$saved    = $coverage['total'] - count( $coverage['missing'] );
		echo '<hr><h2 id="sidsyn-html-copies">' . esc_html__( 'HTML copies of pages', 'sidcraft-page-builder' ) . '</h2>';
		echo '<p class="description">' . esc_html__( 'A full HTML copy of each published builder page is saved so the page keeps its layout, styling, buttons, forms, video, maps and sliders if Sidcraft Page Builder or Sidcraft Builder Pro is deactivated. Copies are saved automatically; use the button to save them all now, for example right before deactivating.', 'sidcraft-page-builder' ) . '</p>';
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only result flag after our own redirect.
		if ( isset( $_GET['sidsyn_snapshots'] ) && ! $coverage['missing'] ) {
			echo '<div class="notice notice-success inline"><p>' . esc_html__( 'Every published builder page has a current HTML copy.', 'sidcraft-page-builder' ) . '</p></div>';
		}
		echo '<p><strong>' . esc_html(
			sprintf(
				/* translators: 1: pages with a current copy, 2: all published builder pages. */
				__( '%1$d of %2$d published builder pages have a current HTML copy.', 'sidcraft-page-builder' ),
				$saved,
				$coverage['total']
			)
		) . '</strong>';
		foreach ( array( self::mu_problem(), $coverage['missing'] ? self::last_error() : '' ) as $line ) {
			if ( '' !== $line ) {
				echo ' ' . esc_html( $line );
			}
		}
		echo '</p>';
		if ( $coverage['ids'] ) {
			self::save_button( $coverage['ids'], add_query_arg( 'sidsyn_snapshots', 'done', admin_url( 'admin.php?page=sidcraft-page-builder-tools' ) ) . '#sidsyn-html-copies' );
		}
		self::fallback_toggle();
	}

	/**
	 * Explicit install/remove control for the fallback must-use plugin.
	 *
	 * @return void
	 */
	private static function fallback_toggle() {
		$on = self::mu_enabled() && '' !== self::mu_path() && is_readable( self::mu_path() );
		echo '<hr><h3>' . esc_html__( 'Fallback must-use plugin', 'sidcraft-page-builder' ) . '</h3>';
		echo '<p class="description">' . esc_html__( 'Installs a small must-use plugin that serves the saved HTML copies while Sidcraft Page Builder is deactivated. It is not installed automatically.', 'sidcraft-page-builder' ) . '</p>';
		$state = sanitize_key( (string) filter_input( INPUT_GET, 'sidsyn_fallback' ) );
		if ( '' !== $state ) {
			$message = 'on' === $state
				? __( 'Fallback must-use plugin installed.', 'sidcraft-page-builder' )
				: ( 'error' === $state ? __( 'The fallback must-use plugin could not be written. Allow writes to wp-content/mu-plugins.', 'sidcraft-page-builder' ) : __( 'Fallback must-use plugin removed.', 'sidcraft-page-builder' ) );
			echo '<div class="notice ' . ( 'error' === $state ? 'notice-warning' : 'notice-success' ) . ' inline"><p>' . esc_html( $message ) . '</p></div>';
		}
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		wp_nonce_field( 'sidcraft_page_builder_fallback_toggle' );
		echo '<input type="hidden" name="action" value="sidcraft_page_builder_fallback_toggle">';
		echo '<input type="hidden" name="fallback" value="' . ( $on ? '0' : '1' ) . '">';
		echo '<p><strong>' . esc_html__( 'Status:', 'sidcraft-page-builder' ) . '</strong> ' . esc_html( $on ? __( 'installed', 'sidcraft-page-builder' ) : __( 'not installed', 'sidcraft-page-builder' ) ) . '</p>';
		echo '<p><button type="submit" class="button">' . esc_html( $on ? __( 'Remove fallback plugin', 'sidcraft-page-builder' ) : __( 'Install fallback plugin', 'sidcraft-page-builder' ) ) . '</button></p>';
		echo '</form>';
	}

	/**
	 * Handle the explicit fallback install/remove control.
	 *
	 * @return void
	 */
	public static function handle_fallback_toggle() {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			wp_die( esc_html__( 'You are not allowed to do this.', 'sidcraft-page-builder' ), 403 );
		}
		check_admin_referer( 'sidcraft_page_builder_fallback_toggle' );
		$on = ! empty( $_POST['fallback'] );
		$state = 'off';
		if ( $on ) {
			update_option( self::OPTION_MU, 1, false );
			if ( self::install_mu_plugin() ) {
				$state = 'on';
			} else {
				delete_option( self::OPTION_MU );
				$state = 'error';
			}
		} else {
			delete_option( self::OPTION_MU );
			self::remove_mu_plugins();
		}
		$back = wp_get_referer();
		$back = $back ? $back : self::tools_url();
		wp_safe_redirect( add_query_arg( 'sidsyn_fallback', $state, $back ) );
		exit;
	}

	/**
	 * On the Plugins screen and the Dashboard, say when builder pages have no
	 * current copy (they would lose their styling if the builder were turned
	 * off) and offer to save the copies now.
	 *
	 * @return void
	 */
	public static function admin_notice() {
		if ( ! self::enabled() || ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ! in_array( $screen->id, array( 'plugins', 'dashboard', 'plugins-network' ), true ) ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only result flag after our own redirect.
		$done     = isset( $_GET['sidsyn_snapshots'] ) ? sanitize_key( wp_unslash( $_GET['sidsyn_snapshots'] ) ) : '';
		$coverage = self::coverage();
		$missing  = $coverage['missing'];
		if ( ! $missing && '' === self::mu_problem() ) {
			if ( 'done' === $done ) {
				echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Sidcraft Page Builder saved an HTML copy of every published builder page. They keep their look if the builder is deactivated.', 'sidcraft-page-builder' ) . '</p></div>';
			}
			return;
		}
		echo '<div class="notice notice-warning" id="sidsyn-snapshot-notice"><p><strong>' . esc_html__( 'Sidcraft Page Builder', 'sidcraft-page-builder' ) . '</strong>: ';
		if ( $missing ) {
			printf(
				/* translators: 1: pages with a current copy, 2: all published builder pages. */
				esc_html__( '%1$d of %2$d published builder pages have a saved HTML copy. Pages without one show only plain text if Sidcraft Page Builder or Sidcraft Builder Pro is deactivated.', 'sidcraft-page-builder' ),
				(int) ( $coverage['total'] - count( $missing ) ),
				(int) $coverage['total']
			);
		}
		foreach ( array( self::mu_problem(), $missing ? self::last_error() : '' ) as $line ) {
			if ( '' !== $line ) {
				echo ' ' . esc_html( $line );
			}
		}
		echo ' <a href="' . esc_url( self::tools_url() ) . '">' . esc_html__( 'HTML copies on the Tools screen', 'sidcraft-page-builder' ) . '</a></p>';
		if ( $missing ) {
			self::save_button( $missing, add_query_arg( 'sidsyn_snapshots', 'done', remove_query_arg( 'sidsyn_snapshots' ) ) );
		}
		echo '</div>';
	}

	/**
	 * Server-side pass after the browser pass: save what is still missing, then
	 * return to the screen the button was on.
	 *
	 * @return void
	 */
	public static function handle_save_now() {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			wp_die( esc_html__( 'You are not allowed to do this.', 'sidcraft-page-builder' ), 403 );
		}
		check_admin_referer( 'sidcraft_page_builder_snapshot_now' );
		self::refresh_stale( 60 );
		$back = isset( $_GET['back'] ) ? esc_url_raw( wp_unslash( $_GET['back'] ) ) : admin_url( 'plugins.php' );
		wp_safe_redirect( $back ? $back : admin_url( 'plugins.php' ) );
		exit;
	}

	/**
	 * @return string
	 */
	private static function mu_source() {
		return SIDCRAFT_PAGE_BUILDER_PATH . 'includes/ops/page-snapshot-mu.php';
	}

	/**
	 * @return string
	 */
	public static function mu_path() {
		$dir = self::mu_dir();
		return '' !== $dir ? $dir . '/' . self::MU_FILE : '';
	}

	/**
	 * @return string
	 */
	private static function mu_dir() {
		if ( defined( 'WPMU_PLUGIN_DIR' ) && WPMU_PLUGIN_DIR ) {
			return untrailingslashit( WPMU_PLUGIN_DIR );
		}
		if ( defined( 'WP_CONTENT_DIR' ) && WP_CONTENT_DIR ) {
			return untrailingslashit( WP_CONTENT_DIR ) . '/mu-plugins';
		}
		return '';
	}

	/**
	 * Remove duplicate copies of the fallback mu-plugin, keeping the canonical one.
	 *
	 * Older builds and manual copies could leave several files with the same
	 * plugin header, which WordPress lists as several must-use plugins.
	 *
	 * @return void
	 */
	public static function cleanup_mu_plugins() {
		self::delete_mu_plugins( self::mu_path() );
	}

	/**
	 * @return void
	 */
	public static function remove_mu_plugins() {
		self::delete_mu_plugins();
	}

	/**
	 * @param string $keep Path to keep, or empty to remove every copy.
	 * @return void
	 */
	private static function delete_mu_plugins( $keep = '' ) {
		$dir = self::mu_dir();
		if ( '' === $dir || ! is_dir( $dir ) ) {
			return;
		}
		$keep = '' !== $keep ? wp_normalize_path( $keep ) : '';
		foreach ( (array) glob( $dir . '/*.php' ) as $file ) {
			if ( ! is_string( $file ) || ! is_file( $file ) ) {
				continue;
			}
			if ( '' !== $keep && wp_normalize_path( $file ) === $keep ) {
				continue;
			}
			$head = @file_get_contents( $file, false, null, 0, 4096 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local mu-plugin header.
			if ( false === $head || false === strpos( $head, self::MU_HEADER ) ) {
				continue;
			}
			wp_delete_file( $file );
		}
	}

	/**
	 * @return bool
	 */
	public static function install_mu_plugin() {
		$src  = self::mu_source();
		$dest = self::mu_path();
		if ( '' === $dest || ! is_readable( $src ) ) {
			return false;
		}
		$dir = dirname( $dest );
		if ( ! is_dir( $dir ) ) {
			wp_mkdir_p( $dir );
		}
		self::delete_mu_plugins( $dest );
		if ( @copy( $src, $dest ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- Falls back to a plain write below.
			self::delete_mu_plugins( $dest );
			return true;
		}
		$data = file_get_contents( $src ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$ok   = false !== $data && false !== file_put_contents( $dest, $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		if ( $ok ) {
			self::delete_mu_plugins( $dest );
		}
		return $ok;
	}
}
