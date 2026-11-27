<?php
/**
 * Per-page frontend stylesheet: frontend.css without the rules of units the
 * page does not use.
 *
 * assets/css/frontend.css is the full bundle. split-frontend-css.php records
 * it as an ordered list of parts (assets/css/frontend/segments.php), each
 * "core" (layout, containers, anything several units share) or a unit family
 * (tabs, flip box, gallery…; manifest.php maps families to unit types).
 *
 * Units ask for their family through Unit::get_styles(), so the asset walk
 * (nested containers, embedded templates, loop item templates, components,
 * preloaded theme templates) decides which families a page needs. Right
 * before the head prints its styles, the families asked for are written into
 * one file, core parts and those families' parts in their original order, so
 * the cascade is exactly that of frontend.css. The file is cached in
 * uploads/sidcraft-page-builder/css/ and named after the set of families, so
 * pages using the same units share it. The main handle
 * `sidcraft-page-builder-frontend` points at that file instead of the bundle;
 * everything that depends on it or adds inline CSS to it is unchanged.
 *
 * A unit that first appears after the head printed (a shortcode in a widget)
 * gets its family's own file, printed in the footer.
 *
 * The full bundle is used when the generated files are missing or do not
 * match frontend.css, when the file cannot be written, and with the
 * `sidcraft_page_builder_split_frontend_css` filter returning false.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Rendering;

use SidcraftPageBuilder\Design\CssPrint;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class StyleChunks {
	const HANDLE = 'sidcraft-page-builder-frontend';
	const PREFIX = 'sidcraft-page-builder-frontend-';

	/** @var array|false|null Manifest, false when unusable, null before reading. */
	private static $manifest = null;

	/** @var array<string,string[]>|null Unit type => families. */
	private static $by_type = null;

	/** @var bool Family handles registered this request. */
	private static $registered = false;

	/** @var string[]|null Families in the head's stylesheet (null: not decided yet). */
	private static $included = null;

	/** Forget per-request state (tests). */
	public static function reset_runtime() {
		self::$manifest   = null;
		self::$by_type    = null;
		self::$registered = false;
		self::$included   = null;
	}

	/**
	 * @return array|false
	 */
	private static function manifest() {
		if ( null !== self::$manifest ) {
			return self::$manifest;
		}
		self::$manifest = false;
		if ( ! defined( 'SIDCRAFT_PAGE_BUILDER_PATH' ) ) {
			return false;
		}
		$dir = SIDCRAFT_PAGE_BUILDER_PATH . 'assets/css/frontend/';
		if ( ! is_readable( $dir . 'manifest.php' ) || ! is_readable( $dir . 'segments.php' ) ) {
			return false;
		}
		$data = include $dir . 'manifest.php';
		if ( ! is_array( $data ) || empty( $data['chunks'] ) ) {
			return false;
		}
		// Files generated from another frontend.css (edited without re-running the tool) are not used.
		$css_path = SIDCRAFT_PAGE_BUILDER_PATH . 'assets/css/frontend.css';
		$size     = (int) @filesize( $css_path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- A missing file means no split.
		if ( (int) ( $data['size'] ?? -1 ) !== $size ) {
			// A CRLF checkout changes the byte count without changing the CSS. Verify the
			// normalised content hash before giving up the per-unit stylesheets.
			$css = is_readable( $css_path ) ? (string) file_get_contents( $css_path ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local generated CSS.
			if ( '' === $css || md5( str_replace( array( "\r\n", "\r" ), "\n", $css ) ) !== (string) ( $data['source'] ?? '' ) ) {
				return false;
			}
		}
		self::$manifest = $data;
		return $data;
	}

	/**
	 * Whether pages get a stylesheet with only the units they use.
	 *
	 * @return bool
	 */
	public static function enabled() {
		if ( false === self::manifest() ) {
			return false;
		}
		/**
		 * Filters whether builder pages get a stylesheet without the rules of
		 * units they do not use (instead of the full frontend.css).
		 *
		 * @param bool $split Default true when the generated files are present.
		 */
		return (bool) apply_filters( 'sidcraft_page_builder_split_frontend_css', true );
	}

	/**
	 * Register the main handle (the full bundle until the head decides) and
	 * one handle per unit family.
	 *
	 * @param string $version Asset version.
	 * @return void
	 */
	public static function register( $version ) {
		if ( ! function_exists( 'wp_register_style' ) || ! defined( 'SIDCRAFT_PAGE_BUILDER_URL' ) ) {
			return;
		}
		wp_register_style( self::HANDLE, SIDCRAFT_PAGE_BUILDER_URL . 'assets/css/frontend.css', array(), $version );
		wp_style_add_data( self::HANDLE, 'rtl', 'replace' );
		if ( self::$registered || ! self::enabled() ) {
			return;
		}
		foreach ( array_keys( self::manifest()['chunks'] ) as $chunk ) {
			wp_register_style( self::PREFIX . $chunk, SIDCRAFT_PAGE_BUILDER_URL . 'assets/css/frontend/' . $chunk . '.css', array(), $version );
			wp_style_add_data( self::PREFIX . $chunk, 'rtl', 'replace' );
		}
		self::$registered = true;
		// wp_print_styles fires in wp_head right before the head's stylesheets print.
		add_action( 'wp_print_styles', array( self::class, 'finalize' ), 1 );
		add_filter( 'style_loader_tag', array( self::class, 'skip_redundant' ), 10, 2 );
	}

	/**
	 * Style handles a unit type needs (none for units styled by core only,
	 * and none in full-bundle mode).
	 *
	 * @param string $type
	 * @param object $unit
	 * @return string[]
	 */
	public static function handles_for( $type, $unit = null ) {
		if ( ! self::enabled() ) {
			return array();
		}
		if ( null === self::$by_type ) {
			self::$by_type = array();
			foreach ( self::manifest()['chunks'] as $chunk => $types ) {
				foreach ( (array) $types as $t ) {
					self::$by_type[ $t ][] = $chunk;
				}
			}
		}
		$chunks = self::$by_type[ (string) $type ] ?? array();
		/**
		 * Filters the unit families whose CSS a unit type needs. Add-on units
		 * that print the classes of a Sidcraft unit (for example `lb-tabs-nav`)
		 * add that family: icon-box, image-box, collapse, tabs, alert, video,
		 * counter, progress, divider, icon-list, social, star-rating,
		 * testimonial, gallery, carousel, flip-box or loop.
		 *
		 * @param string[]    $chunks Family names.
		 * @param string      $type   Unit type.
		 * @param object|null $unit   Unit instance.
		 */
		$chunks = apply_filters( 'sidcraft_page_builder_unit_style_chunks', $chunks, (string) $type, $unit );
		$out    = array();
		foreach ( (array) $chunks as $chunk ) {
			$chunk = sanitize_key( (string) $chunk );
			if ( isset( self::manifest()['chunks'][ $chunk ] ) ) {
				$out[] = self::PREFIX . $chunk;
			}
		}
		return $out;
	}

	/**
	 * Before the head prints: point the main handle at the stylesheet for the
	 * families asked for so far and take their own handles out of the queue.
	 *
	 * @return void
	 */
	public static function finalize() {
		if ( null !== self::$included || ! self::$registered || ! function_exists( 'wp_styles' ) ) {
			return;
		}
		$styles = wp_styles();
		if ( ! isset( $styles->registered[ self::HANDLE ] ) ) {
			return;
		}
		$wanted = array();
		foreach ( array_keys( self::manifest()['chunks'] ) as $chunk ) {
			if ( in_array( self::PREFIX . $chunk, $styles->queue, true ) ) {
				$wanted[] = $chunk;
			}
		}
		if ( ! $wanted && ! self::head_prints_main( $styles ) ) {
			return; // No builder CSS in the head; whatever comes later uses the bundle.
		}
		$file = self::combined( $wanted );
		if ( $file ) {
			$styles->registered[ self::HANDLE ]->src = $file['url'];
			$styles->registered[ self::HANDLE ]->ver = $file['ver'];
			self::$included = $wanted;
		} else {
			self::$included = array_keys( self::manifest()['chunks'] ); // The bundle has every family.
		}
		wp_enqueue_style( self::HANDLE );
		foreach ( self::$included as $chunk ) {
			wp_dequeue_style( self::PREFIX . $chunk );
			$styles->done[] = self::PREFIX . $chunk; // Never printed again on its own.
		}
	}

	/**
	 * @param \WP_Styles $styles
	 * @return bool
	 */
	private static function head_prints_main( $styles ) {
		if ( in_array( self::HANDLE, $styles->queue, true ) ) {
			return true;
		}
		foreach ( $styles->queue as $handle ) {
			if ( isset( $styles->registered[ $handle ] ) && in_array( self::HANDLE, (array) $styles->registered[ $handle ]->deps, true ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * A family's own file is not needed once the main handle is the full
	 * bundle (it already has every family): for example when the builder CSS
	 * first appears in the footer.
	 *
	 * @param string $tag
	 * @param string $handle
	 * @return string
	 */
	public static function skip_redundant( $tag, $handle ) {
		if ( 0 !== strpos( (string) $handle, self::PREFIX ) || null !== self::$included ) {
			return $tag;
		}
		$styles = function_exists( 'wp_styles' ) ? wp_styles() : null;
		$main   = $styles && isset( $styles->registered[ self::HANDLE ] ) ? (string) $styles->registered[ self::HANDLE ]->src : '';
		return '' !== $main && false !== strpos( $main, 'assets/css/frontend.css' ) && ( in_array( self::HANDLE, $styles->queue, true ) || in_array( self::HANDLE, $styles->done, true ) ) ? '' : $tag;
	}

	/**
	 * The stylesheet for a set of families (and its -rtl twin), written once.
	 *
	 * @param string[] $chunks
	 * @return array{url:string,ver:string}|false
	 */
	public static function combined( array $chunks ) {
		if ( ! class_exists( CssPrint::class ) || '' === CssPrint::dir() ) {
			return false;
		}
		$manifest = self::manifest();
		$order    = array_keys( $manifest['chunks'] );
		$chunks   = array_values( array_intersect( $order, $chunks ) );
		$source   = substr( (string) ( $manifest['source'] ?? md5( (string) $manifest['size'] ) ), 0, 8 );
		$name     = 'frontend-' . $source . '-' . substr( md5( implode( ',', $chunks ) ), 0, 8 );
		if ( ! CssPrint::file_exists( $name . '.css' ) && ! self::write( $name, $chunks, $source ) ) {
			return false;
		}
		return array(
			'url' => CssPrint::url( $name . '.css' ),
			'ver' => $source,
		);
	}

	/**
	 * @param string   $name
	 * @param string[] $chunks
	 * @param string   $source
	 * @return bool
	 */
	private static function write( $name, array $chunks, $source ) {
		$dir = CssPrint::dir();
		if ( ! wp_mkdir_p( $dir ) || ! wp_is_writable( $dir ) ) {
			return false;
		}
		$keep = array_flip( array_merge( array( 'core' ), $chunks ) );
		foreach ( array( '' => 'segments.php', '-rtl' => 'segments-rtl.php' ) as $suffix => $file ) {
			$path = SIDCRAFT_PAGE_BUILDER_PATH . 'assets/css/frontend/' . $file;
			if ( ! is_readable( $path ) ) {
				if ( '' === $suffix ) {
					return false;
				}
				continue;
			}
			$css = '';
			foreach ( (array) include $path as $part ) {
				if ( isset( $keep[ $part[0] ] ) ) {
					$css .= $part[1];
				}
			}
			$target = $dir . '/' . $name . $suffix . '.css';
			$tmp    = $target . '.' . wp_generate_password( 6, false ) . '.tmp';
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- Generated CSS in uploads, written atomically.
			if ( false === file_put_contents( $tmp, "/* Sidcraft Page Builder frontend CSS for: core" . ( $chunks ? ', ' . implode( ', ', $chunks ) : '' ) . " */\n" . $css ) || ! @rename( $tmp, $target ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.rename_rename
				wp_delete_file( $tmp );
				return false;
			}
		}
		// Files made from an older frontend.css: kept a week, since full-page copies
		// (PageSnapshot) made before an update still link them until they refresh.
		foreach ( (array) glob( $dir . '/frontend-*.css' ) as $old ) {
			if ( is_string( $old ) && 0 !== strpos( basename( $old ), 'frontend-' . $source . '-' ) && @filemtime( $old ) < time() - WEEK_IN_SECONDS ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
				wp_delete_file( $old );
			}
		}
		return true;
	}
}
