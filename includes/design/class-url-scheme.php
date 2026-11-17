<?php
namespace SidcraftPageBuilder\Design;

defined( 'ABSPATH' ) || exit;

/**
 * Keeps URLs of files the builder generates in uploads (global.css, post-*.css,
 * self-hosted font stylesheet) on the same scheme as the page being viewed.
 *
 * is_ssl() alone is not enough: behind a reverse proxy, load balancer or a CDN
 * such as Cloudflare (Flexible SSL), PHP sees plain HTTP while the visitor is on
 * HTTPS, so set_url_scheme() keeps http:// and browsers block the stylesheet as
 * insecure (mixed) content.
 *
 * @since 1.3.0
 */
class UrlScheme {

	/** @var bool */
	private static $hooked = false;

	/**
	 * Registers the last-resort style_loader_src filter (idempotent).
	 */
	public static function init() {
		if ( self::$hooked || ! function_exists( 'add_filter' ) ) {
			return;
		}
		self::$hooked = true;
		add_filter( 'style_loader_src', array( self::class, 'filter_style_src' ), 999, 2 );
	}

	/**
	 * Whether the current request reached the visitor over HTTPS.
	 *
	 * @return bool
	 */
	public static function is_https_request() {
		if ( function_exists( 'is_ssl' ) && is_ssl() ) {
			return true;
		}
		// phpcs:disable WordPress.Security.ValidatedSanitizedInput -- read-only comparisons, nothing is output or stored.
		$proto = isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) ? strtolower( (string) wp_unslash( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) ) : '';
		if ( $proto !== '' && strpos( $proto, 'https' ) !== false ) {
			return true;
		}
		$ssl = isset( $_SERVER['HTTP_X_FORWARDED_SSL'] ) ? strtolower( (string) wp_unslash( $_SERVER['HTTP_X_FORWARDED_SSL'] ) ) : '';
		if ( $ssl === 'on' || $ssl === '1' ) {
			return true;
		}
		$cf = isset( $_SERVER['HTTP_CF_VISITOR'] ) ? strtolower( (string) wp_unslash( $_SERVER['HTTP_CF_VISITOR'] ) ) : '';
		if ( $cf !== '' && strpos( $cf, 'https' ) !== false ) {
			return true;
		}
		$fwd = isset( $_SERVER['HTTP_FORWARDED'] ) ? strtolower( (string) wp_unslash( $_SERVER['HTTP_FORWARDED'] ) ) : '';
		if ( $fwd !== '' && strpos( $fwd, 'proto=https' ) !== false ) {
			return true;
		}
		// phpcs:enable
		if ( function_exists( 'home_url' ) && strpos( (string) home_url( '/' ), 'https://' ) === 0 ) {
			return true;
		}
		return false;
	}

	/**
	 * Returns $url on https:// when the page is HTTPS; otherwise scheme-relative
	 * (//host/path), which the browser resolves to the page's own scheme, so it
	 * can never be mixed content even when HTTPS is not detectable server-side.
	 *
	 * @param string $url Absolute URL.
	 * @return string
	 */
	public static function match( $url ) {
		$url = (string) $url;
		if ( $url === '' || ! preg_match( '#^(https?:)?//#i', $url ) ) {
			return $url;
		}
		if ( self::is_https_request() ) {
			return (string) preg_replace( '#^(https?:)?//#i', 'https://', $url );
		}
		/**
		 * Filters the URL used when HTTPS could not be detected. Return an absolute
		 * http:// URL here to opt out of scheme-relative URLs.
		 *
		 * @param string $relative Scheme-relative URL.
		 * @param string $url      Original URL.
		 */
		$relative = (string) preg_replace( '#^(https?:)?//#i', '//', $url );
		return function_exists( 'apply_filters' ) ? (string) apply_filters( 'sidcraft_page_builder_scheme_relative_url', $relative, $url ) : $relative;
	}

	/**
	 * Last-resort fix for stylesheets the builder enqueues from uploads, in case a
	 * cache or another plugin rewrote the URL back to http://.
	 *
	 * @param string $src    Stylesheet URL.
	 * @param string $handle Style handle.
	 * @return string
	 */
	public static function filter_style_src( $src, $handle ) {
		$src = (string) $src;
		if ( $src === '' || stripos( $src, 'http://' ) !== 0 ) {
			return $src;
		}
		if ( strpos( (string) $handle, 'sidcraft-page-builder' ) !== 0 && strpos( $src, '/sidcraft-page-builder/' ) === false ) {
			return $src;
		}
		return self::match( $src );
	}
}
