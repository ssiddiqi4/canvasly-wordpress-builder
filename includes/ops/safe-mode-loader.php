<?php
/**
 * Early Safe Mode bootstrapping. Loaded from an mu-plugin so other plugins
 * and the theme never load on Sidcraft Syntex editor requests for that user.
 *
 * Must stay free of the Sidcraft Syntex autoloader - it runs before plugins_loaded.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'sidcraft_syntex_safe_mode_config' ) ) {
	/**
	 * @return array{plugin:string,theme:string,theme_root:string,loader:string}
	 */
	function sidcraft_syntex_safe_mode_config() {
		$boot = function_exists( 'get_option' ) ? get_option( 'sidcraft_syntex_safe_mode_boot', array() ) : array();
		if ( ! is_array( $boot ) ) {
			$boot = array();
		}
		return array(
			'plugin'     => isset( $boot['plugin'] ) ? (string) $boot['plugin'] : '',
			'theme'      => isset( $boot['theme'] ) ? (string) $boot['theme'] : 'lb-safe',
			'theme_root' => isset( $boot['theme_root'] ) ? (string) $boot['theme_root'] : '',
			'loader'     => isset( $boot['loader'] ) ? (string) $boot['loader'] : '',
		);
	}
}

if ( ! function_exists( 'sidcraft_syntex_safe_mode_cookie_user' ) ) {
	/**
	 * @return int
	 */
	function sidcraft_syntex_safe_mode_cookie_user() {
		$raw = isset( $_COOKIE['sidsyn_safe_mode'] ) ? sanitize_text_field( wp_unslash( $_COOKIE['sidsyn_safe_mode'] ) ) : '';
		if ( $raw === '' || ! preg_match( '/^(\d+)\.([a-f0-9]{32})$/', $raw, $m ) ) {
			return 0;
		}
		$uid   = (int) $m[1];
		$token = $m[2];
		if ( ! $uid || ! function_exists( 'get_user_meta' ) ) {
			return 0;
		}
		$on     = (string) get_user_meta( $uid, 'sidcraft_syntex_safe_mode', true );
		$stored = (string) get_user_meta( $uid, 'sidcraft_syntex_safe_mode_token', true );
		if ( $on !== '1' || $stored === '' || ! hash_equals( $stored, $token ) ) {
			return 0;
		}
		return $uid;
	}
}

if ( ! function_exists( 'sidcraft_syntex_safe_mode_is_target_request' ) ) {
	/**
	 * Editor, Sidcraft Syntex admin screens and Sidcraft Syntex REST only.
	 * Never plugins.php / update.php - filtering active_plugins there would
	 * hide every other plugin on the Plugins screen.
	 *
	 * @param array|null $src Optional request snapshot (tests).
	 * @return bool
	 */
	function sidcraft_syntex_safe_mode_is_target_request( $src = null ) {
		if ( is_array( $src ) && isset( $src['get'] ) && is_array( $src['get'] ) ) {
			$get = $src['get'];
		} else {
			// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Read-only routing of Safe Mode editor requests.
			$get = $_GET;
			// phpcs:enable WordPress.Security.NonceVerification.Recommended
		}
		$uri  = is_array( $src ) && isset( $src['uri'] ) ? (string) $src['uri'] : ( isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '' );
		$page = isset( $get['page'] ) ? sanitize_key( (string) $get['page'] ) : '';
		if ( $page === 'sidcraft-syntex' || strpos( $page, 'sidcraft-syntex-' ) === 0 ) {
			return true;
		}
		if ( ! empty( $get['sidsyn_safe_mode'] ) ) {
			return true;
		}
		if ( strpos( $uri, '/wp-json/sidcraft-syntex/' ) !== false || strpos( $uri, 'rest_route=/sidcraft-syntex/' ) !== false ) {
			return true;
		}
		$rest = isset( $get['rest_route'] ) ? (string) $get['rest_route'] : '';
		if ( strpos( $rest, '/sidcraft-syntex/' ) === 0 ) {
			return true;
		}
		return false;
	}
}

if ( ! function_exists( 'sidcraft_syntex_safe_mode_applies' ) ) {
	/**
	 * @param array|null $src
	 * @return bool
	 */
	function sidcraft_syntex_safe_mode_applies( $src = null ) {
		if ( ! sidcraft_syntex_safe_mode_is_target_request( $src ) ) {
			return false;
		}
		return sidcraft_syntex_safe_mode_cookie_user() > 0;
	}
}

if ( ! function_exists( 'sidcraft_syntex_safe_mode_filter_plugins' ) ) {
	/**
	 * @param mixed $pre
	 * @return mixed
	 */
	function sidcraft_syntex_safe_mode_filter_plugins( $pre ) {
		if ( ! sidcraft_syntex_safe_mode_applies() ) {
			return $pre;
		}
		$plugin = sidcraft_syntex_safe_mode_config()['plugin'];
		return $plugin !== '' ? array( $plugin ) : $pre;
	}
}

if ( ! function_exists( 'sidcraft_syntex_safe_mode_filter_sitewide' ) ) {
	/**
	 * @param mixed $pre
	 * @return mixed
	 */
	function sidcraft_syntex_safe_mode_filter_sitewide( $pre ) {
		if ( ! sidcraft_syntex_safe_mode_applies() ) {
			return $pre;
		}
		$plugin = sidcraft_syntex_safe_mode_config()['plugin'];
		if ( $plugin === '' ) {
			return array();
		}
		return array( $plugin => time() );
	}
}

if ( ! function_exists( 'sidcraft_syntex_safe_mode_filter_theme' ) ) {
	/**
	 * @param mixed $pre
	 * @return mixed
	 */
	function sidcraft_syntex_safe_mode_filter_theme( $pre ) {
		if ( ! sidcraft_syntex_safe_mode_applies() ) {
			return $pre;
		}
		$theme = sidcraft_syntex_safe_mode_config()['theme'];
		return $theme !== '' ? $theme : $pre;
	}
}

if ( ! function_exists( 'sidcraft_syntex_safe_mode_filter_theme_root' ) ) {
	/**
	 * @param mixed $pre
	 * @return mixed
	 */
	function sidcraft_syntex_safe_mode_filter_theme_root( $pre ) {
		if ( ! sidcraft_syntex_safe_mode_applies() ) {
			return $pre;
		}
		$root = sidcraft_syntex_safe_mode_config()['theme_root'];
		return $root !== '' ? $root : $pre;
	}
}

if ( ! function_exists( 'sidcraft_syntex_safe_mode_start' ) ) {
	function sidcraft_syntex_safe_mode_start() {
		if ( ! sidcraft_syntex_safe_mode_applies() ) {
			return;
		}
		add_filter( 'pre_option_active_plugins', 'sidcraft_syntex_safe_mode_filter_plugins', 0 );
		add_filter( 'pre_site_option_active_sitewide_plugins', 'sidcraft_syntex_safe_mode_filter_sitewide', 0 );
		add_filter( 'pre_option_template', 'sidcraft_syntex_safe_mode_filter_theme', 0 );
		add_filter( 'pre_option_stylesheet', 'sidcraft_syntex_safe_mode_filter_theme', 0 );
		add_filter( 'pre_option_template_root', 'sidcraft_syntex_safe_mode_filter_theme_root', 0 );
		add_filter( 'pre_option_stylesheet_root', 'sidcraft_syntex_safe_mode_filter_theme_root', 0 );
		$root = sidcraft_syntex_safe_mode_config()['theme_root'];
		if ( $root !== '' && is_dir( $root ) && function_exists( 'register_theme_directory' ) ) {
			register_theme_directory( $root );
		}
	}
}
