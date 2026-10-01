<?php
/**
 * Extension points for custom CSS.
 *
 * Sidcraft Page Builder has no custom CSS field of its own. An add-on can
 * turn the feature on with the `custom_css/enabled` filter; it then supplies
 * the control and does all sanitizing and scoping through the filters below.
 * While nothing enables it, saved `custom_css` values are dropped and
 * nothing is printed.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Design;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CustomCssHooks {

	/**
	 * @return bool
	 */
	public static function enabled() {
		return function_exists( 'apply_filters' ) && (bool) apply_filters( 'sidcraft-page-builder/custom_css/enabled', false );
	}

	/**
	 * Value to store for a saved `custom_css` setting.
	 *
	 * @param mixed $css
	 * @return string
	 */
	public static function sanitize( $css ) {
		if ( ! self::enabled() || ! is_string( $css ) || '' === trim( $css ) ) {
			return '';
		}
		return (string) apply_filters( 'sidcraft-page-builder/custom_css/sanitize', '', $css );
	}

	/**
	 * CSS printed for one unit's `custom_css`, scoped by the add-on to $selector.
	 *
	 * @param mixed  $css
	 * @param string $selector
	 * @return string
	 */
	public static function node( $css, $selector ) {
		if ( ! self::enabled() || ! is_string( $css ) || '' === trim( $css ) ) {
			return '';
		}
		return wp_strip_all_tags( (string) apply_filters( 'sidcraft-page-builder/custom_css/node', '', $css, (string) $selector ) );
	}

	/**
	 * CSS printed for a page's `custom_css` setting.
	 *
	 * @param mixed $css
	 * @return string
	 */
	public static function page( $css ) {
		if ( ! self::enabled() || ! is_string( $css ) || '' === trim( $css ) ) {
			return '';
		}
		return wp_strip_all_tags( (string) apply_filters( 'sidcraft-page-builder/custom_css/page', '', $css ) );
	}
}
