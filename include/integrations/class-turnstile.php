<?php
/**
 * Cloudflare Turnstile integration (Canvasly Lite).
 *
 * Settings live under Canvasly → Settings → Integrations and are stored in their own
 * option (never localized to the browser, except the public site key):
 *
 *   site_key     public widget key
 *   secret_key   server-side key used with the Siteverify API
 *   api_token    Cloudflare API token (optional) — verified with /user/tokens/verify and
 *                used with account_id to create a Turnstile widget (sitekey + secret)
 *                through POST /accounts/{account_id}/challenges/widgets
 *   account_id   Cloudflare account ID (optional, for widget creation)
 *
 * Protection points:
 *   - Turnstile unit (Lite widget): protects the Canvasly form in the same container.
 *   - Form unit: "Spam protection → Cloudflare Turnstile".
 *   - Login unit (Lite) and Login & Register / Payment Form units (Pro): "Require Cloudflare Turnstile".
 *   - Optional: all Canvasly forms, WordPress login and comment forms.
 *
 * Submit gate: every widget printed by markup() keeps the submit / login / pay buttons of its
 * form disabled until Cloudflare returns a token, and locks them again when the token expires,
 * errors, or is reset after a submission. The server still verifies every token (Siteverify).
 *
 * Docs: https://developers.cloudflare.com/turnstile/
 *
 * @package CanvaslyLite
 */

namespace CanvaslyLite\Integrations;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Turnstile {
	const OPTION      = 'canvasly_lite_turnstile';
	const API_HANDLE  = 'canvasly-turnstile-api';
	const JS_HANDLE   = 'canvasly-turnstile';
	/*
	 * Cloudflare Turnstile is a third-party service. Cloudflare requires api.js to be loaded from
	 * challenges.cloudflare.com (it must not be bundled or self-hosted) and tokens to be checked with
	 * its Siteverify endpoint. Both are used only after the site owner enters Turnstile keys, and are
	 * documented under "Does Canvasly connect to external services?" in readme.txt.
	 */
	const SCRIPT_URL  = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=canvaslyTurnstileReady'; // phpcs:ignore PluginCheck.CodeAnalysis.Offloading.OffloadedContent -- Required third-party service script; see comment above.
	const VERIFY_URL  = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'; // phpcs:ignore PluginCheck.CodeAnalysis.Offloading.OffloadedContent -- Server-side API endpoint (wp_remote_post), not an offloaded asset.
	const CF_API      = 'https://api.cloudflare.com/client/v4';
	const FIELD       = 'cf-turnstile-response';
	/** Hidden field a protected Canvasly login / register / lost-password form posts to wp-login.php. */
	const REQUIRE     = 'lb_turnstile_require';
	const MASK        = '********';
	/** Cloudflare's documented always-pass test keys, used for the "use test keys" helper. */
	const TEST_SITE   = '1x00000000000000000000AA';
	const TEST_SECRET = '1x0000000000000000000000000000000AA';

	/** @var array|null */
	private static $memo = null;

	public static function init() {
		add_action( 'canvasly-lite/units/register', array( self::class, 'register_unit' ), 6 );
		add_action( 'canvasly-lite/frontend/enqueue', array( self::class, 'register_assets' ) );
		add_action( 'canvasly-lite/settings/integrations', array( self::class, 'render_settings' ) );
		add_action( 'canvasly-lite/settings/save_integrations', array( self::class, 'save_from_post' ) );
		add_action( 'admin_init', array( self::class, 'handle_admin_action' ), 5 );
		add_filter( 'canvasly-lite/form/verify', array( self::class, 'verify_form' ), 10, 3 );
		add_filter( 'canvasly-lite/editor/localize_data', array( self::class, 'localize_editor' ), 25 );
		// Optional WordPress core forms.
		add_action( 'init', array( self::class, 'core_form_hooks' ), 20 );
	}

	/* ------------------------------------------------------------------ *
	 * Settings storage
	 * ------------------------------------------------------------------ */

	/** @return array */
	public static function defaults() {
		return array(
			'site_key'         => '',
			'secret_key'       => '',
			'api_token'        => '',
			'account_id'       => '',
			'theme'            => 'auto',
			'size'             => 'normal',
			'appearance'       => 'always',
			'protect_forms'    => 'widget',
			'protect_login'    => false,
			'protect_comments' => false,
			'token_status'     => '',
		);
	}

	/** @return array */
	public static function get() {
		if ( null === self::$memo ) {
			$raw        = function_exists( 'get_option' ) ? get_option( self::OPTION, array() ) : array();
			self::$memo = array_merge( self::defaults(), is_array( $raw ) ? $raw : array() );
		}
		return self::$memo;
	}

	/**
	 * @param array $patch
	 * @return array
	 */
	public static function update( array $patch ) {
		$d = array_merge( self::get(), $patch );
		update_option( self::OPTION, $d, false );
		self::$memo = $d;
		return $d;
	}

	public static function flush() {
		self::$memo = null;
	}

	/**
	 * @param mixed $v
	 * @return string
	 */
	public static function clean_key( $v ) {
		return substr( (string) preg_replace( '/[^a-zA-Z0-9_\-.]/', '', (string) $v ), 0, 200 );
	}

	/** @return bool Site key and secret are set. */
	public static function enabled() {
		$d = self::get();
		return '' !== $d['site_key'] && '' !== $d['secret_key'];
	}

	/** @return string */
	public static function site_key() {
		return self::get()['site_key'];
	}

	/* ------------------------------------------------------------------ *
	 * Admin: Canvasly > Settings > Integrations
	 * ------------------------------------------------------------------ */

	/**
	 * Printed inside the Integrations form by AdminSettings::render_integrations().
	 *
	 * @param array $unused Global settings.
	 */
	public static function render_settings( $unused = array() ) {
		unset( $unused );
		$d      = self::get();
		$select = static function ( $name, $value, array $opts ) {
			$out = '<select name="' . esc_attr( $name ) . '" id="' . esc_attr( str_replace( '_', '-', $name ) ) . '">';
			foreach ( $opts as $k => $label ) {
				$out .= '<option value="' . esc_attr( $k ) . '"' . selected( $value, $k, false ) . '>' . esc_html( $label ) . '</option>';
			}
			return $out . '</select>';
		};
		echo '<h2 class="title" id="cloudflare-turnstile">' . esc_html__( 'Cloudflare Turnstile', 'canvasly-lite' ) . '</h2>';
		echo '<p class="description">' . wp_kses_post(
			sprintf(
				/* translators: 1: Turnstile docs URL, 2: API token docs URL */
				__( 'Privacy-friendly CAPTCHA alternative. Create a widget in the Cloudflare dashboard (<a href="%1$s" target="_blank" rel="noopener">Turnstile docs</a>) and paste its keys, or paste an <a href="%2$s" target="_blank" rel="noopener">API token</a> with “Turnstile Sites Write” permission plus your Account ID and let Canvasly create the widget.', 'canvasly-lite' ),
				'https://developers.cloudflare.com/turnstile/', // phpcs:ignore PluginCheck.CodeAnalysis.Offloading.OffloadedContent -- Documentation link shown to admins, not an asset.
				'https://developers.cloudflare.com/fundamentals/api/get-started/create-token/' // phpcs:ignore PluginCheck.CodeAnalysis.Offloading.OffloadedContent -- Documentation link shown to admins, not an asset.
			)
		) . '</p>';
		echo '<table class="form-table" role="presentation"><tbody>';

		echo '<tr><th><label for="lb-ts-site">' . esc_html__( 'Site key', 'canvasly-lite' ) . '</label></th><td><input class="regular-text code" id="lb-ts-site" name="turnstile_site_key" type="text" value="' . esc_attr( $d['site_key'] ) . '" autocomplete="off"></td></tr>';
		echo '<tr><th><label for="lb-ts-secret">' . esc_html__( 'Secret key', 'canvasly-lite' ) . '</label></th><td><input class="regular-text code" id="lb-ts-secret" name="turnstile_secret_key" type="password" value="' . esc_attr( '' !== $d['secret_key'] ? self::MASK : '' ) . '" autocomplete="new-password"><p class="description">' . esc_html__( 'Stored on the server only. Leave the masked value to keep it.', 'canvasly-lite' ) . '</p></td></tr>';

		echo '<tr><th><label for="lb-ts-token">' . esc_html__( 'Cloudflare API token', 'canvasly-lite' ) . '</label></th><td><input class="regular-text code" id="lb-ts-token" name="turnstile_api_token" type="password" value="' . esc_attr( '' !== $d['api_token'] ? self::MASK : '' ) . '" autocomplete="new-password">';
		if ( '' !== $d['token_status'] ) {
			echo ' <span class="lb-ts-status">' . esc_html( $d['token_status'] ) . '</span>';
		}
		echo '<p class="description">' . esc_html__( 'Optional. Used only from this admin screen to verify the token and to create a Turnstile widget. Never sent to visitors.', 'canvasly-lite' ) . '</p></td></tr>';
		echo '<tr><th><label for="lb-ts-account">' . esc_html__( 'Cloudflare Account ID', 'canvasly-lite' ) . '</label></th><td><input class="regular-text code" id="lb-ts-account" name="turnstile_account_id" type="text" value="' . esc_attr( $d['account_id'] ) . '" autocomplete="off"><p class="description">' . esc_html__( 'Dashboard → Account home → Account ID. Needed only to create a widget with the API token.', 'canvasly-lite' ) . '</p></td></tr>';

		echo '<tr><th>' . esc_html__( 'API actions', 'canvasly-lite' ) . '</th><td>';
		echo '<button type="submit" class="button" name="lb_turnstile_action" value="verify">' . esc_html__( 'Verify API token', 'canvasly-lite' ) . '</button> ';
		echo '<button type="submit" class="button" name="lb_turnstile_action" value="create">' . esc_html__( 'Create Turnstile widget for this site', 'canvasly-lite' ) . '</button> ';
		echo '<button type="submit" class="button-link" name="lb_turnstile_action" value="test">' . esc_html__( 'Use Cloudflare test keys', 'canvasly-lite' ) . '</button> ';
		echo '<button type="submit" class="button-link button-link-delete" name="lb_turnstile_action" value="clear">' . esc_html__( 'Remove keys', 'canvasly-lite' ) . '</button>';
		echo '<p class="description">' . esc_html__( 'Create uses mode “managed” and this site’s domain, then fills in the site and secret keys.', 'canvasly-lite' ) . '</p></td></tr>';

		echo '<tr><th><label for="turnstile-theme">' . esc_html__( 'Default look', 'canvasly-lite' ) . '</label></th><td>';
		echo $select( 'turnstile_theme', $d['theme'], array( 'auto' => __( 'Theme: Auto', 'canvasly-lite' ), 'light' => __( 'Theme: Light', 'canvasly-lite' ), 'dark' => __( 'Theme: Dark', 'canvasly-lite' ) ) ) . ' '; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in $select.
		echo $select( 'turnstile_size', $d['size'], array( 'normal' => __( 'Size: Normal', 'canvasly-lite' ), 'flexible' => __( 'Size: Flexible', 'canvasly-lite' ), 'compact' => __( 'Size: Compact', 'canvasly-lite' ) ) ) . ' '; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo $select( 'turnstile_appearance', $d['appearance'], array( 'always' => __( 'Always visible', 'canvasly-lite' ), 'interaction-only' => __( 'Only when interaction is needed', 'canvasly-lite' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '</td></tr>';

		echo '<tr><th><label for="turnstile-protect-forms">' . esc_html__( 'Canvasly forms', 'canvasly-lite' ) . '</label></th><td>';
		echo $select( 'turnstile_protect_forms', $d['protect_forms'], array( 'widget' => __( 'Where a Turnstile widget or form setting asks for it', 'canvasly-lite' ), 'all' => __( 'All Canvasly forms', 'canvasly-lite' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '</td></tr>';
		echo '<tr><th>' . esc_html__( 'WordPress forms', 'canvasly-lite' ) . '</th><td>';
		echo '<label><input type="checkbox" name="turnstile_protect_login" value="1"' . checked( ! empty( $d['protect_login'] ), true, false ) . '> ' . esc_html__( 'Login form', 'canvasly-lite' ) . '</label><br>';
		echo '<label><input type="checkbox" name="turnstile_protect_comments" value="1"' . checked( ! empty( $d['protect_comments'] ), true, false ) . '> ' . esc_html__( 'Comment form (visitors)', 'canvasly-lite' ) . '</label>';
		echo '<p class="description">' . esc_html__( 'Per unit: Form (Spam protection → Require Cloudflare Turnstile), Login, and in Canvasly Pro the Login & Register and Payment Form units (Security → Require Cloudflare Turnstile). Protected forms keep their submit, log in or pay buttons disabled until the visitor completes the check.', 'canvasly-lite' ) . '</p>';
		echo '</td></tr>';
		echo '</tbody></table>';
	}

	/**
	 * Persist posted Turnstile fields (called from AdminSettings::maybe_save and admin actions).
	 *
	 * @param array $p Unslashed $_POST.
	 */
	public static function save_from_post( $p ) {
		$p = is_array( $p ) ? $p : array();
		if ( ! array_key_exists( 'turnstile_site_key', $p ) ) {
			return;
		}
		$d     = self::get();
		$keep  = static function ( $new, $old ) {
			$new = is_string( $new ) ? trim( $new ) : '';
			if ( '' === $new || self::MASK === $new || preg_match( '/^\*+$/', $new ) ) {
				return $old;
			}
			return self::clean_key( $new );
		};
		$pick  = static function ( $v, array $allowed, $fallback ) {
			return in_array( $v, $allowed, true ) ? $v : $fallback;
		};
		$token = $keep( $p['turnstile_api_token'] ?? '', $d['api_token'] );
		self::update(
			array(
				'site_key'         => self::clean_key( $p['turnstile_site_key'] ?? '' ),
				'secret_key'       => $keep( $p['turnstile_secret_key'] ?? '', $d['secret_key'] ),
				'api_token'        => $token,
				'account_id'       => self::clean_key( $p['turnstile_account_id'] ?? '' ),
				'theme'            => $pick( (string) ( $p['turnstile_theme'] ?? 'auto' ), array( 'auto', 'light', 'dark' ), 'auto' ),
				'size'             => $pick( (string) ( $p['turnstile_size'] ?? 'normal' ), array( 'normal', 'flexible', 'compact' ), 'normal' ),
				'appearance'       => $pick( (string) ( $p['turnstile_appearance'] ?? 'always' ), array( 'always', 'interaction-only' ), 'always' ),
				'protect_forms'    => $pick( (string) ( $p['turnstile_protect_forms'] ?? 'widget' ), array( 'widget', 'all' ), 'widget' ),
				'protect_login'    => ! empty( $p['turnstile_protect_login'] ),
				'protect_comments' => ! empty( $p['turnstile_protect_comments'] ),
				'token_status'     => $token === $d['api_token'] ? $d['token_status'] : '',
			)
		);
	}

	/** Buttons on the Integrations tab (verify / create / test keys / clear). */
	public static function handle_admin_action() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- check_admin_referer() below.
		if ( empty( $_POST['lb_turnstile_action'] ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		check_admin_referer( 'lb_admin_settings' );
		$post   = wp_unslash( $_POST );
		$action = sanitize_key( (string) $post['lb_turnstile_action'] );
		// phpcs:enable WordPress.Security.NonceVerification.Missing
		self::save_from_post( $post );
		$notice = static function ( $msg, $type ) {
			add_settings_error( 'canvasly_lite_settings', 'turnstile', $msg, $type );
		};
		if ( 'test' === $action ) {
			self::update( array( 'site_key' => self::TEST_SITE, 'secret_key' => self::TEST_SECRET ) );
			$notice( __( 'Cloudflare test keys saved. Every challenge passes; replace them with real keys before going live.', 'canvasly-lite' ), 'warning' );
		} elseif ( 'clear' === $action ) {
			self::update( array( 'site_key' => '', 'secret_key' => '', 'api_token' => '', 'token_status' => '' ) );
			$notice( __( 'Turnstile keys removed.', 'canvasly-lite' ), 'updated' );
		} elseif ( 'verify' === $action ) {
			$r = self::verify_token();
			$notice( $r['message'], $r['ok'] ? 'updated' : 'error' );
		} elseif ( 'create' === $action ) {
			$r = self::create_widget();
			$notice( $r['message'], $r['ok'] ? 'updated' : 'error' );
		}
	}

	/**
	 * GET /user/tokens/verify (user tokens) or /accounts/{id}/tokens/verify (account tokens).
	 *
	 * @return array{ok:bool,message:string}
	 */
	public static function verify_token() {
		$d = self::get();
		if ( '' === $d['api_token'] ) {
			return array( 'ok' => false, 'message' => __( 'Enter a Cloudflare API token first.', 'canvasly-lite' ) );
		}
		$urls = array( self::CF_API . '/user/tokens/verify' );
		if ( '' !== $d['account_id'] ) {
			$urls[] = self::CF_API . '/accounts/' . rawurlencode( $d['account_id'] ) . '/tokens/verify';
		}
		$last = '';
		foreach ( $urls as $url ) {
			$res = self::cf_request( 'GET', $url, $d['api_token'] );
			if ( $res['ok'] && 'active' === ( $res['body']['result']['status'] ?? '' ) ) {
				self::update( array( 'token_status' => __( 'Verified: active', 'canvasly-lite' ) ) );
				return array( 'ok' => true, 'message' => __( 'Cloudflare API token is valid and active.', 'canvasly-lite' ) );
			}
			$last = $res['error'];
		}
		self::update( array( 'token_status' => __( 'Not verified', 'canvasly-lite' ) ) );
		/* translators: %s: Cloudflare error */
		return array( 'ok' => false, 'message' => sprintf( __( 'Cloudflare rejected the API token: %s', 'canvasly-lite' ), $last ) );
	}

	/**
	 * POST /accounts/{account_id}/challenges/widgets → fills site_key + secret_key.
	 *
	 * @return array{ok:bool,message:string}
	 */
	public static function create_widget() {
		$d = self::get();
		if ( '' === $d['api_token'] || '' === $d['account_id'] ) {
			return array( 'ok' => false, 'message' => __( 'Creating a widget needs both the API token and the Account ID.', 'canvasly-lite' ) );
		}
		$host = function_exists( 'home_url' ) ? (string) wp_parse_url( home_url(), PHP_URL_HOST ) : '';
		if ( '' === $host ) {
			return array( 'ok' => false, 'message' => __( 'Could not read this site’s domain.', 'canvasly-lite' ) );
		}
		$name = function_exists( 'get_bloginfo' ) ? 'Canvasly — ' . get_bloginfo( 'name' ) : 'Canvasly';
		$res  = self::cf_request(
			'POST',
			self::CF_API . '/accounts/' . rawurlencode( $d['account_id'] ) . '/challenges/widgets',
			$d['api_token'],
			array(
				'name'    => substr( $name, 0, 250 ),
				'domains' => array( $host ),
				'mode'    => 'managed',
			)
		);
		$site   = self::clean_key( $res['body']['result']['sitekey'] ?? '' );
		$secret = self::clean_key( $res['body']['result']['secret'] ?? '' );
		if ( ! $res['ok'] || '' === $site || '' === $secret ) {
			/* translators: %s: Cloudflare error */
			return array( 'ok' => false, 'message' => sprintf( __( 'Cloudflare could not create the widget: %s', 'canvasly-lite' ), $res['error'] ?: __( 'unexpected response', 'canvasly-lite' ) ) );
		}
		self::update( array( 'site_key' => $site, 'secret_key' => $secret ) );
		/* translators: %s: domain */
		return array( 'ok' => true, 'message' => sprintf( __( 'Turnstile widget created for %s. Site key and secret key were saved.', 'canvasly-lite' ), $host ) );
	}

	/**
	 * @param string     $method
	 * @param string     $url
	 * @param string     $token
	 * @param array|null $body
	 * @return array{ok:bool,body:array,error:string}
	 */
	private static function cf_request( $method, $url, $token, $body = null ) {
		$args = array(
			'method'  => $method,
			'timeout' => 12,
			'headers' => array(
				'Authorization' => 'Bearer ' . $token,
				'Content-Type'  => 'application/json',
			),
		);
		if ( null !== $body ) {
			$args['body'] = wp_json_encode( $body );
		}
		$res = wp_remote_request( $url, $args );
		if ( is_wp_error( $res ) ) {
			return array( 'ok' => false, 'body' => array(), 'error' => $res->get_error_message() );
		}
		$json = json_decode( (string) wp_remote_retrieve_body( $res ), true );
		$json = is_array( $json ) ? $json : array();
		$ok   = ! empty( $json['success'] );
		$err  = '';
		if ( ! $ok ) {
			$first = $json['errors'][0] ?? array();
			$err   = is_array( $first ) ? trim( ( $first['code'] ?? '' ) . ' ' . ( $first['message'] ?? '' ) ) : '';
			if ( '' === $err ) {
				$err = 'HTTP ' . (int) wp_remote_retrieve_response_code( $res );
			}
		}
		return array( 'ok' => $ok, 'body' => $json, 'error' => sanitize_text_field( $err ) );
	}

	/* ------------------------------------------------------------------ *
	 * Frontend
	 * ------------------------------------------------------------------ */

	public static function register_assets() {
		if ( ! function_exists( 'wp_register_script' ) ) {
			return;
		}
		$ver = defined( 'CANVASLY_LITE_VERSION' ) ? CANVASLY_LITE_VERSION : '1';
		wp_register_script( self::API_HANDLE, self::SCRIPT_URL, array(), null, array( 'in_footer' => true, 'strategy' => 'defer' ) ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- Cloudflare requires the unversioned URL.
		wp_register_script( self::JS_HANDLE, CANVASLY_LITE_URL . 'assets/js/turnstile.js', array(), $ver, array( 'in_footer' => true ) );
	}

	/** @return string[] Script handles a protected form or widget needs. */
	public static function handles() {
		if ( ! self::enabled() ) {
			return array();
		}
		if ( function_exists( 'wp_script_is' ) && ! wp_script_is( self::JS_HANDLE, 'registered' ) ) {
			self::register_assets();
		}
		return array( self::JS_HANDLE, self::API_HANDLE );
	}

	/**
	 * Widget markup (explicitly rendered by assets/js/turnstile.js).
	 *
	 * @param array $o theme, size, appearance, action, language, standalone, gate (bool, default true:
	 *                 disable the form's submit buttons until the challenge passes), targets (extra
	 *                 CSS selector of buttons/links outside the form to lock the same way).
	 * @return string
	 */
	public static function markup( array $o = array() ) {
		if ( ! self::enabled() ) {
			return '';
		}
		$d      = self::get();
		$action = preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) ( $o['action'] ?? 'canvasly_form' ) );
		$attrs  = array(
			'class'           => 'lb-turnstile',
			'data-sitekey'    => $d['site_key'],
			'data-theme'      => in_array( $o['theme'] ?? '', array( 'auto', 'light', 'dark' ), true ) ? $o['theme'] : $d['theme'],
			'data-size'       => in_array( $o['size'] ?? '', array( 'normal', 'flexible', 'compact' ), true ) ? $o['size'] : $d['size'],
			'data-appearance' => in_array( $o['appearance'] ?? '', array( 'always', 'interaction-only' ), true ) ? $o['appearance'] : $d['appearance'],
			'data-action'     => substr( '' !== $action ? $action : 'canvasly_form', 0, 32 ),
		);
		$lang = preg_replace( '/[^a-zA-Z-]/', '', (string) ( $o['language'] ?? '' ) );
		if ( '' !== $lang && 'auto' !== $lang ) {
			$attrs['data-language'] = $lang;
		}
		if ( ! empty( $o['standalone'] ) ) {
			$attrs['data-lb-turnstile-protect'] = '1';
		}
		// Keep the form's submit buttons disabled until the challenge passes (default on).
		if ( ! array_key_exists( 'gate', $o ) || ! empty( $o['gate'] ) ) {
			$attrs['data-lb-turnstile-gate']  = '1';
			$attrs['data-lb-turnstile-wait']  = __( 'Complete the security check to continue.', 'canvasly-lite' );
			$targets                          = trim( (string) ( $o['targets'] ?? '' ) );
			if ( '' !== $targets ) {
				$attrs['data-lb-turnstile-targets'] = substr( $targets, 0, 300 );
			}
		}
		$html = '<div';
		foreach ( $attrs as $k => $v ) {
			$html .= ' ' . $k . '="' . esc_attr( (string) $v ) . '"';
		}
		return $html . '></div>';
	}

	/* ------------------------------------------------------------------ *
	 * Verification
	 * ------------------------------------------------------------------ */

	/**
	 * Siteverify call.
	 *
	 * @param string $token
	 * @param string $action Expected action (empty = any).
	 * @return bool
	 */
	public static function verify( $token, $action = '' ) {
		$d     = self::get();
		$token = trim( (string) $token );
		if ( '' === $d['secret_key'] ) {
			return true;
		}
		if ( '' === $token || strlen( $token ) > 2048 ) {
			return false;
		}
		$pre = apply_filters( 'canvasly-lite/turnstile/verify', null, $token, $action );
		if ( null !== $pre ) {
			return (bool) $pre;
		}
		$body = array(
			'secret'   => $d['secret_key'],
			'response' => $token,
		);
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		if ( '' !== $ip ) {
			$body['remoteip'] = $ip;
		}
		$res = wp_remote_post( self::VERIFY_URL, array( 'timeout' => 8, 'body' => $body ) );
		if ( is_wp_error( $res ) ) {
			return false;
		}
		$json = json_decode( (string) wp_remote_retrieve_body( $res ), true );
		if ( ! is_array( $json ) || empty( $json['success'] ) ) {
			return false;
		}
		if ( '' !== $action && isset( $json['action'] ) && '' !== (string) $json['action'] && (string) $json['action'] !== $action ) {
			return false;
		}
		return true;
	}

	/**
	 * Does this Canvasly form require Turnstile? Looks the form node up in its document.
	 *
	 * @param int    $post_id
	 * @param string $unit_id
	 * @return bool
	 */
	public static function form_requires( $post_id, $unit_id ) {
		if ( ! self::enabled() ) {
			return false;
		}
		$all = 'all' === self::get()['protect_forms'];
		if ( ! $post_id || '' === $unit_id || ! class_exists( '\\CanvaslyLite\\Document\\DocumentManager' ) ) {
			return $all;
		}
		$doc = \CanvaslyLite\Document\DocumentManager::get( absint( $post_id ) );
		if ( ! is_array( $doc ) ) {
			return $all;
		}
		$found = null;
		$walk  = static function ( $list ) use ( &$walk, $unit_id, &$found ) {
			foreach ( (array) $list as $n ) {
				if ( ! is_array( $n ) || null !== $found ) {
					continue;
				}
				$kids = (array) ( $n['children'] ?? array() );
				foreach ( $kids as $k ) {
					if ( is_array( $k ) && ( $k['id'] ?? '' ) === $unit_id ) {
						$found = array( 'node' => $k, 'siblings' => $kids );
						return;
					}
				}
				$walk( $kids );
			}
		};
		foreach ( array( 'root', 'header', 'footer' ) as $part ) {
			$list = (array) ( $doc[ $part ] ?? array() );
			foreach ( $list as $n ) {
				if ( is_array( $n ) && ( $n['id'] ?? '' ) === $unit_id ) {
					$found = array( 'node' => $n, 'siblings' => $list );
				}
			}
			if ( null === $found ) {
				$walk( $list );
			}
		}
		if ( null === $found ) {
			return $all;
		}
		$captcha = (string) ( $found['node']['settings']['captcha'] ?? 'auto' );
		if ( 'none' === $captcha ) {
			return false;
		}
		if ( 'turnstile' === $captcha || $all ) {
			return true;
		}
		foreach ( $found['siblings'] as $sib ) {
			if ( is_array( $sib ) && 'turnstile' === ( $sib['type'] ?? '' ) && ( ! isset( $sib['settings']['protect_form'] ) || ! empty( $sib['settings']['protect_form'] ) ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * `canvasly-lite/form/verify` filter.
	 *
	 * @param true|\WP_Error $ok
	 * @param array          $params
	 * @return true|\WP_Error
	 */
	public static function verify_form( $ok, $params = array() ) {
		if ( true !== $ok || ! is_array( $params ) ) {
			return $ok;
		}
		$post_id = absint( $params['_post_id'] ?? 0 );
		$unit    = preg_replace( '/[^A-Za-z0-9_-]/', '', (string) ( $params['_unit_id'] ?? '' ) );
		if ( ! self::form_requires( $post_id, $unit ) ) {
			return $ok;
		}
		if ( self::verify( (string) ( $params[ self::FIELD ] ?? '' ) ) ) {
			return $ok;
		}
		return new \WP_Error( 'turnstile', __( 'Please complete the security check and try again.', 'canvasly-lite' ), array( 'status' => 400 ) );
	}

	/* ------------------------------------------------------------------ *
	 * WordPress login + comments
	 * ------------------------------------------------------------------ */

	public static function core_form_hooks() {
		if ( ! self::enabled() ) {
			return;
		}
		$d = self::get();
		if ( ! empty( $d['protect_login'] ) ) {
			add_action( 'login_enqueue_scripts', array( self::class, 'enqueue_core' ) );
			add_action( 'login_form', array( self::class, 'print_login' ) );
		}
		// Login is checked when the site-wide option is on, or when a Canvasly login unit that
		// requires Turnstile posts its marker. Register and lost password follow their marker.
		add_filter( 'authenticate', array( self::class, 'check_login' ), 30, 3 );
		add_filter( 'registration_errors', array( self::class, 'check_register' ), 30, 3 );
		add_action( 'lostpassword_post', array( self::class, 'check_lostpassword' ), 10, 1 );
		if ( ! empty( $d['protect_comments'] ) ) {
			add_action( 'comment_form_after_fields', array( self::class, 'print_comment' ) );
			add_filter( 'preprocess_comment', array( self::class, 'check_comment' ) );
		}
	}

	public static function enqueue_core() {
		self::register_assets();
		wp_enqueue_script( self::JS_HANDLE );
		wp_enqueue_script( self::API_HANDLE );
	}

	public static function print_login() {
		echo self::markup( array( 'action' => 'login', 'size' => 'flexible' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in markup().
	}

	public static function print_comment() {
		self::enqueue_core();
		echo self::markup( array( 'action' => 'comment' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in markup().
	}

	/**
	 * @param mixed  $user
	 * @param string $username
	 * @param string $password
	 * @return mixed
	 */
	public static function check_login( $user, $username = '', $password = '' ) {
		unset( $password );
		// Only interactive wp-login.php POSTs; XML-RPC / REST application passwords are untouched.
		if ( '' === (string) $username || ! isset( $_POST['log'] ) || ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Core login form has no nonce.
			return $user;
		}
		if ( empty( self::get()['protect_login'] ) && ! self::posted_requires( 'login' ) ) {
			return $user;
		}
		$token = isset( $_POST[ self::FIELD ] ) ? sanitize_text_field( wp_unslash( $_POST[ self::FIELD ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing
		if ( self::verify( $token ) ) {
			return $user;
		}
		return new \WP_Error( 'turnstile', __( '<strong>Error:</strong> Please complete the security check.', 'canvasly-lite' ) );
	}

	/**
	 * Did a Canvasly form that requires Turnstile post this request?
	 *
	 * @param string $context login|register|lostpassword
	 * @return bool
	 */
	public static function posted_requires( $context ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Read-only marker on core wp-login.php forms.
		$raw = isset( $_POST[ self::REQUIRE ] ) ? sanitize_key( wp_unslash( $_POST[ self::REQUIRE ] ) ) : '';
		return '' !== $raw && $raw === $context;
	}

	/**
	 * Hidden marker that tells wp-login.php this form requires Turnstile.
	 *
	 * @param string $context login|register|lostpassword
	 * @return string
	 */
	public static function require_field( $context ) {
		return '<input type="hidden" name="' . esc_attr( self::REQUIRE ) . '" value="' . esc_attr( sanitize_key( (string) $context ) ) . '">';
	}

	/**
	 * Turnstile widget + marker for a Canvasly form that posts to wp-login.php.
	 *
	 * @param string $context login|register|lostpassword
	 * @param array  $o       Extra markup() options.
	 * @return string
	 */
	public static function core_form_markup( $context, array $o = array() ) {
		if ( ! self::enabled() ) {
			return '';
		}
		$o = array_merge( array( 'action' => sanitize_key( (string) $context ), 'size' => 'flexible' ), $o );
		return self::markup( $o ) . self::require_field( $context );
	}

	/**
	 * Put $html right before the submit row of a wp_login_form() / custom form.
	 *
	 * @param string $form
	 * @param string $html
	 * @return string
	 */
	public static function inject_before_submit( $form, $html ) {
		$form = (string) $form;
		if ( '' === $html ) {
			return $form;
		}
		foreach ( array( '<p class="login-submit">', '<p class="cpu-account-submit">' ) as $needle ) {
			$pos = strpos( $form, $needle );
			if ( false !== $pos ) {
				return substr( $form, 0, $pos ) . $html . substr( $form, $pos );
			}
		}
		$pos = strrpos( $form, '</form>' );
		return false === $pos ? $form . $html : substr( $form, 0, $pos ) . $html . substr( $form, $pos );
	}

	/**
	 * @param \WP_Error $errors
	 * @param string    $login
	 * @param string    $email
	 * @return \WP_Error
	 */
	public static function check_register( $errors, $login = '', $email = '' ) {
		unset( $login, $email );
		if ( ! self::posted_requires( 'register' ) || ! is_wp_error( $errors ) ) {
			return $errors;
		}
		$token = isset( $_POST[ self::FIELD ] ) ? sanitize_text_field( wp_unslash( $_POST[ self::FIELD ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Core registration form.
		if ( ! self::verify( $token ) ) {
			$errors->add( 'turnstile', __( '<strong>Error:</strong> Please complete the security check.', 'canvasly-lite' ) );
		}
		return $errors;
	}

	/**
	 * @param \WP_Error $errors
	 */
	public static function check_lostpassword( $errors ) {
		if ( ! self::posted_requires( 'lostpassword' ) || ! is_wp_error( $errors ) ) {
			return;
		}
		$token = isset( $_POST[ self::FIELD ] ) ? sanitize_text_field( wp_unslash( $_POST[ self::FIELD ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Core lost password form.
		if ( ! self::verify( $token ) ) {
			$errors->add( 'turnstile', __( '<strong>Error:</strong> Please complete the security check.', 'canvasly-lite' ) );
		}
	}

	/**
	 * @param array $data
	 * @return array
	 */
	public static function check_comment( $data ) {
		if ( is_user_logged_in() || ( isset( $data['comment_type'] ) && in_array( $data['comment_type'], array( 'pingback', 'trackback' ), true ) ) ) {
			return $data;
		}
		$token = isset( $_POST[ self::FIELD ] ) ? sanitize_text_field( wp_unslash( $_POST[ self::FIELD ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Core comment form.
		if ( ! self::verify( $token ) ) {
			wp_die( esc_html__( 'Please complete the security check and try again.', 'canvasly-lite' ), esc_html__( 'Security check', 'canvasly-lite' ), array( 'response' => 400, 'back_link' => true ) );
		}
		return $data;
	}

	/* ------------------------------------------------------------------ *
	 * Unit + editor
	 * ------------------------------------------------------------------ */

	/**
	 * @param object $registry
	 */
	public static function register_unit( $registry ) {
		if ( is_object( $registry ) && method_exists( $registry, 'register_lazy' ) && ! $registry->has( 'turnstile' ) ) {
			$registry->register_lazy( 'turnstile', CANVASLY_LITE_PATH . 'includes/units/class-turnstile.php', 'CanvaslyLite\\Units\\Turnstile' );
		}
	}

	/**
	 * @param array $data
	 * @return array
	 */
	public static function localize_editor( $data ) {
		if ( is_array( $data ) ) {
			$data['turnstile'] = array(
				'enabled'  => self::enabled(),
				'settings' => function_exists( 'admin_url' ) ? admin_url( 'admin.php?page=canvasly-lite-settings&tab=integrations#cloudflare-turnstile' ) : '',
			);
		}
		return $data;
	}
}
