<?php
/**
 * Inline <style> blocks for HTML fragments, printed by WordPress core.
 *
 * Theme header/footer captures and shortcode output are HTML fragments that
 * travel inside the editor canvas or the page body, so their CSS cannot go
 * through the page's enqueue queue. A private WP_Styles instance prints the
 * block with core's own wp_add_inline_style() machinery instead of a
 * hand-built tag.
 *
 * @package SidcraftSyntex
 */

namespace SidcraftSyntex\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class InlineStyle {

	/** @var \WP_Styles|null */
	private static $printer = null;

	/**
	 * The id attribute core gives the printed block, for duplicate checks.
	 *
	 * @param string $handle
	 * @return string
	 */
	public static function element_id( $handle ) {
		return sanitize_key( $handle ) . '-inline-css';
	}

	/**
	 * @param string $handle Unique handle, prefixed with sidcraft-syntex-.
	 * @param string $css    Plain CSS.
	 * @return string The printed <style> block, or '' when there is no CSS.
	 */
	public static function tag( $handle, $css ) {
		$handle = sanitize_key( $handle );
		// Inside a <style> element only "</style" can end the block early.
		$css = trim( str_ireplace( '</style', '', (string) $css ) );
		if ( '' === $handle || '' === $css || ! class_exists( '\\WP_Styles' ) ) {
			return '';
		}
		if ( null === self::$printer ) {
			self::$printer = new \WP_Styles();
		}
		self::$printer->remove( $handle );
		self::$printer->add( $handle, false );
		self::$printer->add_inline_style( $handle, $css );
		ob_start();
		self::$printer->print_inline_style( $handle );
		return (string) ob_get_clean();
	}
}
