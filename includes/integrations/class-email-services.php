<?php
/**
 * Email services: connect newsletter services (Mailchimp, Kit, MailerLite, Brevo, ActiveCampaign, Klaviyo, Beehiiv,
 * FluentCRM, MailPoet, Listmonk) to the Form unit, and send the form's notification email through a transactional
 * service (Resend, Postmark, Amazon SES, Mailgun, SendGrid, Brevo) instead of the web server's mail.
 *
 * Nothing is contacted until you enter a service's details here and choose it in a form or as the mailer.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Integrations;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class EmailServices {

	const OPTION = 'sidcraft_page_builder_email';
	const LOG    = 'sidcraft_page_builder_email_log';
	const MASK   = '••••••••';
	const NONCE  = 'sidcraft_page_builder_email';

	/** @var array|null */
	private static $cache = null;

	/** @var bool True while a Form unit notification is being sent. */
	private static $scoped = false;

	public static function init() {
		add_action( 'sidcraft_page_builder_form_submitted', array( __CLASS__, 'on_submitted' ), 5, 4 );
		add_filter( 'sidcraft_page_builder_form_submission', array( __CLASS__, 'mark_form_mail' ), 99 );
		add_action( 'sidcraft_page_builder_form_submitted', array( __CLASS__, 'unmark_form_mail' ), 1 );
		add_filter( 'pre_wp_mail', array( __CLASS__, 'pre_mail' ), 10, 2 );
		add_filter( 'sidcraft_page_builder_settings_tabs', array( __CLASS__, 'tab' ) );
		add_action( 'sidcraft_page_builder_settings_render_tab', array( __CLASS__, 'render' ) );
		add_action( 'admin_post_sidcraft_page_builder_email', array( __CLASS__, 'handle' ) );
	}

	/* ---------- the services ---------- */

	/** Newsletter services: id => array( label, fields, list label, help ). A field is name => array( label, type ). */
	public static function marketing() {
		$key = array( 'api_key' => array( __( 'API key', 'sidcraft-page-builder' ), 'password' ) );
		return array(
			'mailchimp'      => array( 'Mailchimp', $key, __( 'Audience ID', 'sidcraft-page-builder' ), __( 'Account → Settings → Extras → API keys. Tags are added by name.', 'sidcraft-page-builder' ) ),
			'kit'            => array( 'Kit (ConvertKit)', $key, __( 'Form ID', 'sidcraft-page-builder' ), __( 'Settings → Developer → API keys. The visitor is added to the Kit form you name; tags use Kit tag IDs. Double opt-in is set on the Kit form.', 'sidcraft-page-builder' ) ),
			'mailerlite'     => array( 'MailerLite', $key, __( 'Group ID', 'sidcraft-page-builder' ), __( 'Integrations → MailerLite API → Generate new token.', 'sidcraft-page-builder' ) ),
			'brevo'          => array(
				'Brevo',
				$key + array(
					'doi_template' => array( __( 'Double opt-in template ID (optional)', 'sidcraft-page-builder' ), 'text' ),
					'doi_redirect' => array( __( 'Address shown after confirming (optional)', 'sidcraft-page-builder' ), 'url' ),
				),
				__( 'List ID', 'sidcraft-page-builder' ),
				__( 'SMTP & API → API keys. The same key also sends form emails when Brevo is the mailer. Double opt-in needs the template ID of a confirmation template.', 'sidcraft-page-builder' ),
			),
			'activecampaign' => array( 'ActiveCampaign', array( 'account_url' => array( __( 'Account URL', 'sidcraft-page-builder' ), 'url' ) ) + $key, __( 'List ID', 'sidcraft-page-builder' ), __( 'Settings → Developer shows the URL (https://youraccount.api-us1.com) and the key.', 'sidcraft-page-builder' ) ),
			'klaviyo'        => array( 'Klaviyo', array( 'api_key' => array( __( 'Private API key', 'sidcraft-page-builder' ), 'password' ) ), __( 'List ID', 'sidcraft-page-builder' ), __( 'Account → Settings → API keys. Create a private key with Profiles and Lists/Subscriptions access. Double opt-in follows the list setting in Klaviyo.', 'sidcraft-page-builder' ) ),
			'beehiiv'        => array( 'Beehiiv', $key, __( 'Publication ID', 'sidcraft-page-builder' ), __( 'Settings → Integrations → API. The publication ID starts with pub_.', 'sidcraft-page-builder' ) ),
			'fluentcrm'      => array( 'FluentCRM', array(), __( 'List ID', 'sidcraft-page-builder' ), __( 'Uses the FluentCRM plugin on this site, no key needed. Tags can be IDs or names.', 'sidcraft-page-builder' ) ),
			'mailpoet'       => array( 'MailPoet', array(), __( 'List ID', 'sidcraft-page-builder' ), __( 'Uses the MailPoet plugin on this site, no key needed.', 'sidcraft-page-builder' ) ),
			'listmonk'       => array(
				'Listmonk',
				array(
					'url'   => array( __( 'Listmonk address', 'sidcraft-page-builder' ), 'url' ),
					'user'  => array( __( 'API user', 'sidcraft-page-builder' ), 'text' ),
					'token' => array( __( 'API token', 'sidcraft-page-builder' ), 'password' ),
				),
				__( 'List ID', 'sidcraft-page-builder' ),
				__( 'Your own Listmonk server, reachable over the internet. Create an API user under Admin → Users.', 'sidcraft-page-builder' ),
			),
		);
	}

	/** Transactional services: id => array( label, fields, help ). Brevo shares its key with the newsletter service. */
	public static function transactional() {
		$key = array( 'api_key' => array( __( 'API key', 'sidcraft-page-builder' ), 'password' ) );
		return array(
			'resend'   => array( 'Resend', $key, __( 'The sender address must belong to a domain you verified in Resend.', 'sidcraft-page-builder' ) ),
			'postmark' => array( 'Postmark', array( 'api_key' => array( __( 'Server API token', 'sidcraft-page-builder' ), 'password' ) ), __( 'The sender address needs a confirmed Sender Signature or domain.', 'sidcraft-page-builder' ) ),
			'ses'      => array(
				'Amazon SES',
				array(
					'access_key' => array( __( 'Access key ID', 'sidcraft-page-builder' ), 'text' ),
					'secret_key' => array( __( 'Secret access key', 'sidcraft-page-builder' ), 'password' ),
					'region'     => array( __( 'Region (for example us-east-1)', 'sidcraft-page-builder' ), 'text' ),
				),
				__( 'Use an IAM user that may only send email. The sender address or domain must be verified in SES.', 'sidcraft-page-builder' ),
			),
			'mailgun'  => array(
				'Mailgun',
				$key + array(
					'domain' => array( __( 'Sending domain', 'sidcraft-page-builder' ), 'text' ),
					'region' => array( __( 'Region (us or eu)', 'sidcraft-page-builder' ), 'text' ),
				),
				__( 'Use the sending domain you verified in Mailgun.', 'sidcraft-page-builder' ),
			),
			'sendgrid' => array( 'SendGrid', $key, __( 'Create a key with Mail Send permission. The sender must be verified.', 'sidcraft-page-builder' ) ),
			'brevo'    => array( 'Brevo', array(), __( 'Uses the Brevo API key entered above under newsletter services. The sender must be validated in Brevo.', 'sidcraft-page-builder' ) ),
		);
	}

	/* ---------- settings ---------- */

	public static function defaults() {
		return array( 'keys' => array(), 'mailer' => 'wp', 'scope' => 'forms', 'fallback' => 1, 'from_email' => '', 'from_name' => '' );
	}

	public static function get() {
		if ( null === self::$cache ) {
			$saved       = get_option( self::OPTION, array() );
			self::$cache = array_merge( self::defaults(), is_array( $saved ) ? $saved : array() );
			if ( ! is_array( self::$cache['keys'] ) ) {
				self::$cache['keys'] = array();
			}
		}
		return self::$cache;
	}

	public static function creds( $provider ) {
		$all = self::get();
		return isset( $all['keys'][ $provider ] ) && is_array( $all['keys'][ $provider ] ) ? $all['keys'][ $provider ] : array();
	}

	/** Is a service ready to use (every field filled)? Plugin-based services need their plugin active. */
	public static function configured( $provider ) {
		if ( 'fluentcrm' === $provider ) {
			return function_exists( 'FluentCrmApi' );
		}
		if ( 'mailpoet' === $provider ) {
			return class_exists( '\MailPoet\API\API' );
		}
		$def = self::marketing()[ $provider ] ?? ( self::transactional()[ $provider ] ?? null );
		if ( ! $def ) {
			return false;
		}
		$c = self::creds( $provider );
		foreach ( array_keys( $def[1] ) as $f ) {
			if ( in_array( $f, array( 'doi_template', 'doi_redirect' ), true ) ) {
				continue;
			}
			if ( empty( $c[ $f ] ) ) {
				return false;
			}
		}
		return true;
	}

	/** Clean one posted value for a field. */
	private static function clean_value( $field, $type, $value ) {
		$value = is_string( $value ) ? trim( $value ) : '';
		if ( 'url' === $type ) {
			return esc_url_raw( $value, array( 'https', 'http' ) );
		}
		if ( 'region' === $field ) {
			return strtolower( preg_replace( '/[^A-Za-z0-9-]/', '', $value ) );
		}
		if ( 'doi_template' === $field ) {
			return preg_replace( '/\D/', '', $value );
		}
		return sanitize_text_field( $value );
	}

	/** Save what the settings form posted. Blank or masked secret fields keep their saved value. */
	private static function save_posted() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- the nonce is checked in handle().
		$post = isset( $_POST['sbp_email'] ) && is_array( $_POST['sbp_email'] ) ? wp_unslash( $_POST['sbp_email'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- every value is cleaned below.
		// phpcs:enable WordPress.Security.NonceVerification.Missing
		$cur  = self::get();
		$keys = $cur['keys'];
		$defs = array();
		foreach ( self::marketing() as $id => $d ) {
			$defs[ $id ] = $d[1];
		}
		foreach ( self::transactional() as $id => $d ) {
			if ( ! isset( $defs[ $id ] ) ) {
				$defs[ $id ] = $d[1];
			}
		}
		foreach ( $defs as $id => $fields ) {
			if ( ! isset( $post['keys'][ $id ] ) || ! is_array( $post['keys'][ $id ] ) ) {
				continue;
			}
			foreach ( $fields as $f => $meta ) {
				if ( ! isset( $post['keys'][ $id ][ $f ] ) ) {
					continue;
				}
				$raw = is_string( $post['keys'][ $id ][ $f ] ) ? trim( $post['keys'][ $id ][ $f ] ) : '';
				if ( 'password' === $meta[1] && ( '' === $raw || self::MASK === $raw ) ) {
					continue; // Keep the saved secret.
				}
				$keys[ $id ][ $f ] = self::clean_value( $f, $meta[1], $raw );
			}
		}
		if ( ! empty( $post['remove'] ) && is_array( $post['remove'] ) ) {
			foreach ( array_keys( $post['remove'] ) as $id ) {
				unset( $keys[ sanitize_key( $id ) ] );
			}
		}
		$mailer = isset( $post['mailer'] ) && is_string( $post['mailer'] ) ? sanitize_key( $post['mailer'] ) : $cur['mailer'];
		if ( 'wp' !== $mailer && ! isset( self::transactional()[ $mailer ] ) ) {
			$mailer = 'wp';
		}
		$from = isset( $post['from_email'] ) && is_string( $post['from_email'] ) ? sanitize_email( $post['from_email'] ) : $cur['from_email'];
		$new  = array(
			'keys'       => $keys,
			'mailer'     => $mailer,
			'scope'      => isset( $post['scope'] ) && 'all' === $post['scope'] ? 'all' : 'forms',
			'fallback'   => isset( $post['mailer'] ) ? ( empty( $post['fallback'] ) ? 0 : 1 ) : $cur['fallback'],
			'from_email' => $from,
			'from_name'  => isset( $post['from_name'] ) && is_string( $post['from_name'] ) ? mb_substr( sanitize_text_field( $post['from_name'] ), 0, 80 ) : $cur['from_name'],
		);
		update_option( self::OPTION, $new, false );
		self::$cache = null;
	}

	/* ---------- activity log ---------- */

	private static function log( $service, $what, $ok, $message ) {
		$rows = get_option( self::LOG, array() );
		$rows = is_array( $rows ) ? $rows : array();
		array_unshift( $rows, array( 't' => time(), 's' => sanitize_key( $service ), 'w' => sanitize_text_field( $what ), 'ok' => $ok ? 1 : 0, 'm' => mb_substr( sanitize_text_field( $message ), 0, 250 ) ) );
		update_option( self::LOG, array_slice( $rows, 0, 20 ), false );
	}

	/** j***@example.com: enough to recognise a row without keeping the address. */
	private static function mask( $email ) {
		$at = strpos( (string) $email, '@' );
		return false === $at ? '' : substr( $email, 0, 1 ) . '***' . substr( $email, $at );
	}

	/* ---------- newsletter subscription from a form ---------- */

	/** Find the Form unit that was submitted, in its saved page. */
	private static function find_node( $post_id, $unit_id ) {
		if ( ! $post_id || '' === $unit_id || ! class_exists( '\\SidcraftPageBuilder\\Document\\DocumentManager' ) ) {
			return null;
		}
		$doc = \SidcraftPageBuilder\Document\DocumentManager::get( absint( $post_id ) );
		if ( ! is_array( $doc ) ) {
			return null;
		}
		$walk = static function ( $nodes ) use ( &$walk, $unit_id ) {
			foreach ( (array) $nodes as $n ) {
				if ( ! is_array( $n ) ) {
					continue;
				}
				if ( (string) ( $n['id'] ?? '' ) === $unit_id ) {
					return $n;
				}
				if ( ! empty( $n['children'] ) ) {
					$f = $walk( $n['children'] );
					if ( $f ) {
						return $f;
					}
				}
			}
			return null;
		};
		foreach ( array( 'root', 'header', 'footer' ) as $part ) {
			$f = $walk( is_array( $doc[ $part ] ?? null ) ? $doc[ $part ] : array() );
			if ( $f ) {
				return $f;
			}
		}
		return null;
	}

	/**
	 * After a valid form submission: add the visitor to the chosen newsletter service.
	 * Never changes the visitor's result; problems are only written to the activity log.
	 *
	 * @param array $filtered Submission result (post_id, unit_id).
	 * @param array $fields   Submitted fields, name => value.
	 */
	public static function on_submitted( $filtered, $fields ) {
		$node = self::find_node( absint( $filtered['post_id'] ?? 0 ), (string) ( $filtered['unit_id'] ?? '' ) );
		if ( ! $node || 'form' !== ( $node['type'] ?? '' ) ) {
			return;
		}
		$s       = (array) ( $node['settings'] ?? array() );
		$service = sanitize_key( (string) ( $s['subscribe_service'] ?? '' ) );
		if ( '' === $service || 'none' === $service || ! isset( self::marketing()[ $service ] ) ) {
			return;
		}
		$fields  = is_array( $fields ) ? $fields : array();
		$field   = static function ( $key, $fallback ) use ( $s ) {
			$v = isset( $s[ $key ] ) ? sanitize_key( (string) $s[ $key ] ) : '';
			return '' !== $v ? $v : $fallback;
		};
		$consent = isset( $s['subscribe_consent_field'] ) ? sanitize_key( (string) $s['subscribe_consent_field'] ) : '';
		if ( '' !== $consent && ! in_array( strtolower( (string) ( $fields[ $consent ] ?? '' ) ), array( '1', 'on', 'yes', 'true' ), true ) ) {
			return; // The visitor did not tick the newsletter box.
		}
		$email = sanitize_email( (string) ( $fields[ $field( 'subscribe_email_field', 'email' ) ] ?? '' ) );
		if ( ! is_email( $email ) ) {
			return;
		}
		$full  = trim( (string) ( $fields[ $field( 'subscribe_name_field', 'name' ) ] ?? '' ) );
		$parts = preg_split( '/\s+/', $full, 2 );
		$tags  = array_values( array_filter( array_map( 'trim', explode( ',', (string) ( $s['subscribe_tags'] ?? '' ) ) ) ) );
		$res   = Marketing::subscribe(
			$service,
			self::creds( $service ),
			array(
				'email'  => $email,
				'first'  => isset( $parts[0] ) ? mb_substr( $parts[0], 0, 80 ) : '',
				'last'   => isset( $parts[1] ) ? mb_substr( $parts[1], 0, 80 ) : '',
				'list'   => trim( (string) ( $s['subscribe_list'] ?? '' ) ),
				'tags'   => array_slice( $tags, 0, 10 ),
				'double' => ! empty( $s['subscribe_double'] ),
			)
		);
		self::log( $service, 'subscribe ' . self::mask( $email ), $res[0], $res[0] ? __( 'Added.', 'sidcraft-page-builder' ) : $res[1] );
		/** Fires after a form visitor was sent to a newsletter service. @param string $service Service id. @param bool $ok Success. @param string $message Problem text. */
		do_action( 'sidcraft_page_builder_form_subscribed', $service, $res[0], $res[1] );
	}

	/* ---------- the form's notification email ---------- */

	public static function mark_form_mail( $result ) {
		self::$scoped = true;
		return $result;
	}

	public static function unmark_form_mail() {
		self::$scoped = false;
	}

	/** Pull the pieces the services need out of a wp_mail() call. */
	private static function parse_mail( array $a ) {
		$headers = $a['headers'] ?? array();
		$headers = is_array( $headers ) ? $headers : explode( "\n", str_replace( "\r\n", "\n", (string) $headers ) );
		$out     = array( 'from_email' => '', 'from_name' => '', 'reply_to' => '', 'cc' => array(), 'bcc' => array(), 'html' => false );
		$emails  = static function ( $value ) {
			preg_match_all( '/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/', (string) $value, $m );
			return array_values( array_filter( array_unique( array_map( 'sanitize_email', $m[0] ) ), 'is_email' ) );
		};
		foreach ( $headers as $line ) {
			if ( ! is_string( $line ) || false === strpos( $line, ':' ) ) {
				continue;
			}
			list( $name, $value ) = array_map( 'trim', explode( ':', $line, 2 ) );
			switch ( strtolower( $name ) ) {
				case 'from':
					$e = $emails( $value );
					if ( $e ) {
						$out['from_email'] = $e[0];
						$out['from_name']  = trim( trim( preg_replace( '/<[^>]*>/', '', $value ) ), "\" '" );
					}
					break;
				case 'reply-to':
					$e = $emails( $value );
					$out['reply_to'] = $e ? $e[0] : '';
					break;
				case 'cc':
					$out['cc'] = array_merge( $out['cc'], $emails( $value ) );
					break;
				case 'bcc':
					$out['bcc'] = array_merge( $out['bcc'], $emails( $value ) );
					break;
				case 'content-type':
					$out['html'] = false !== stripos( $value, 'text/html' );
					break;
			}
		}
		$to        = $a['to'] ?? array();
		$out['to'] = $emails( is_array( $to ) ? implode( ',', $to ) : $to );
		return $out;
	}

	/**
	 * wp_mail() hook: send the form's notification through the chosen service. On a problem the normal WordPress mail
	 * is used instead, unless that fallback is switched off.
	 *
	 * @param null|bool $pre  Short-circuit value from other plugins.
	 * @param array     $atts wp_mail() arguments.
	 * @return null|bool
	 */
	public static function pre_mail( $pre, $atts ) {
		if ( null !== $pre ) {
			return $pre;
		}
		$s = self::get();
		if ( 'wp' === $s['mailer'] || ! isset( self::transactional()[ $s['mailer'] ] ) || ( 'forms' === $s['scope'] && ! self::$scoped ) ) {
			return null;
		}
		if ( ! empty( $atts['attachments'] ) || ! self::configured( $s['mailer'] ) ) {
			return null; // Attachments and incomplete setups go the normal way.
		}
		$p    = self::parse_mail( (array) $atts );
		$host = wp_parse_url( home_url(), PHP_URL_HOST );
		$from = is_email( $s['from_email'] ) ? $s['from_email'] : ( $p['from_email'] ? $p['from_email'] : 'wordpress@' . preg_replace( '/^www\./', '', (string) $host ) );
		$body = (string) ( $atts['message'] ?? '' );
		$res  = Transactional::send(
			$s['mailer'],
			self::creds( $s['mailer'] ),
			array(
				'to'         => $p['to'],
				'subject'    => (string) ( $atts['subject'] ?? '' ),
				'text'       => $p['html'] ? wp_strip_all_tags( $body ) : $body,
				'html'       => $p['html'] ? $body : '',
				'from_email' => $from,
				'from_name'  => '' !== $s['from_name'] ? $s['from_name'] : ( $p['from_name'] ? $p['from_name'] : wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) ),
				'reply_to'   => $p['reply_to'],
				'cc'         => $p['cc'],
				'bcc'        => $p['bcc'],
			)
		);
		self::log( $s['mailer'], 'email', $res[0], $res[0] ? __( 'Sent.', 'sidcraft-page-builder' ) : $res[1] );
		if ( $res[0] ) {
			return true;
		}
		return $s['fallback'] ? null : false;
	}

	/* ---------- settings screen ---------- */

	public static function tab( $tabs ) {
		$tabs                  = is_array( $tabs ) ? $tabs : array();
		$tabs['email']         = __( 'Email services', 'sidcraft-page-builder' );
		return $tabs;
	}

	private static function url() {
		return class_exists( '\\SidcraftPageBuilder\\Settings\\AdminSettings' ) ? \SidcraftPageBuilder\Settings\AdminSettings::url( 'email' ) : admin_url( 'admin.php?page=sidcraft-page-builder-settings&tab=email' );
	}

	private static function can_manage() {
		return class_exists( '\\SidcraftPageBuilder\\Settings\\AdminSettings' ) ? \SidcraftPageBuilder\Settings\AdminSettings::can_manage() : current_user_can( 'manage_options' );
	}

	private static function input( $name, $value, $type, $placeholder = '' ) {
		$shown = 'password' === $type && '' !== $value ? self::MASK : $value;
		return '<input class="regular-text code" type="' . esc_attr( 'password' === $type ? 'password' : ( 'url' === $type ? 'url' : 'text' ) ) . '" name="sbp_email[' . esc_attr( $name ) . ']" value="' . esc_attr( $shown ) . '" autocomplete="off"' . ( '' !== $placeholder ? ' placeholder="' . esc_attr( $placeholder ) . '"' : '' ) . '>';
	}

	public static function render( $tab ) {
		if ( 'email' !== $tab || ! self::can_manage() ) {
			return;
		}
		$s      = self::get();
		$notice = get_transient( 'sbp_email_notice_' . get_current_user_id() );
		if ( is_array( $notice ) ) {
			delete_transient( 'sbp_email_notice_' . get_current_user_id() );
			echo '<div class="notice notice-' . ( ! empty( $notice['ok'] ) ? 'success' : 'error' ) . ' inline"><p>' . esc_html( (string) ( $notice['msg'] ?? '' ) ) . '</p>';
			if ( ! empty( $notice['lists'] ) && is_array( $notice['lists'] ) ) {
				echo '<table class="widefat striped" style="max-width:560px;margin:6px 0 10px"><thead><tr><th>' . esc_html( (string) ( $notice['label'] ?? 'ID' ) ) . '</th><th>' . esc_html__( 'Name', 'sidcraft-page-builder' ) . '</th></tr></thead><tbody>';
				foreach ( $notice['lists'] as $id => $name ) {
					echo '<tr><td><code>' . esc_html( (string) $id ) . '</code></td><td>' . esc_html( (string) $name ) . '</td></tr>';
				}
				echo '</tbody></table>';
			}
			echo '</div>';
		}
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		wp_nonce_field( self::NONCE );
		echo '<input type="hidden" name="action" value="sidcraft_page_builder_email">';

		echo '<h2 class="title">' . esc_html__( 'Newsletter services', 'sidcraft-page-builder' ) . '</h2>';
		echo '<p class="description" style="max-width:760px">' . esc_html__( 'Connect a service, then choose it in a Form unit (Email service) to add the people who fill in that form to a list. Nothing is sent to a service until you do. Keys stay on this server and are never shown again.', 'sidcraft-page-builder' ) . '</p>';
		foreach ( self::marketing() as $id => $d ) {
			echo '<div style="background:#fff;border:1px solid #c3c4c7;border-radius:4px;padding:4px 16px 12px;margin:0 0 12px;max-width:820px"><h3>' . esc_html( $d[0] ) . ' ' . ( self::configured( $id ) ? '<span style="color:#1a7f37;font-weight:400">✓ ' . esc_html__( 'ready', 'sidcraft-page-builder' ) . '</span>' : '' ) . '</h3>';
			echo '<p class="description">' . esc_html( $d[3] ) . '</p><table class="form-table" role="presentation"><tbody>';
			$c = self::creds( $id );
			foreach ( $d[1] as $f => $meta ) {
				echo '<tr><th scope="row">' . esc_html( $meta[0] ) . '</th><td>' . self::input( 'keys][' . $id . '][' . $f, (string) ( $c[ $f ] ?? '' ), $meta[1] ) . '</td></tr>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in input().
			}
			echo '</tbody></table><p><button class="button" name="do" value="lists:' . esc_attr( $id ) . '">' . esc_html( sprintf( /* translators: %s: list label, for example Audience ID */ __( 'Save and show my %s values', 'sidcraft-page-builder' ), $d[2] ) ) . '</button>';
			if ( $d[1] && ! empty( $c ) ) {
				echo ' <button class="button-link button-link-delete" name="sbp_email[remove][' . esc_attr( $id ) . ']" value="1" onclick="return confirm(' . esc_attr( wp_json_encode( __( 'Remove the saved details of this service?', 'sidcraft-page-builder' ) ) ) . ')">' . esc_html__( 'Remove details', 'sidcraft-page-builder' ) . '</button>';
			}
			echo '</p></div>';
		}

		echo '<h2 class="title">' . esc_html__( 'Send form emails through a service', 'sidcraft-page-builder' ) . '</h2>';
		echo '<p class="description" style="max-width:760px">' . esc_html__( 'By default the notification email of a Form unit is sent by your web server, which often lands in spam or never leaves. Choose a transactional service to send it through its API instead.', 'sidcraft-page-builder' ) . '</p>';
		echo '<table class="form-table" role="presentation"><tbody><tr><th scope="row"><label for="sbp-mailer">' . esc_html__( 'Send through', 'sidcraft-page-builder' ) . '</label></th><td><select id="sbp-mailer" name="sbp_email[mailer]"><option value="wp"' . selected( $s['mailer'], 'wp', false ) . '>' . esc_html__( 'WordPress default (web server mail)', 'sidcraft-page-builder' ) . '</option>';
		foreach ( self::transactional() as $id => $d ) {
			echo '<option value="' . esc_attr( $id ) . '"' . selected( $s['mailer'], $id, false ) . '>' . esc_html( $d[0] ) . '</option>';
		}
		echo '</select> <label style="margin-left:12px"><select name="sbp_email[scope]"><option value="forms"' . selected( $s['scope'], 'forms', false ) . '>' . esc_html__( 'Form emails only', 'sidcraft-page-builder' ) . '</option><option value="all"' . selected( $s['scope'], 'all', false ) . '>' . esc_html__( 'All email from this site', 'sidcraft-page-builder' ) . '</option></select></label></td></tr>';
		echo '<tr><th scope="row"><label for="sbp-from">' . esc_html__( 'Sender address', 'sidcraft-page-builder' ) . '</label></th><td><input id="sbp-from" class="regular-text" type="email" name="sbp_email[from_email]" value="' . esc_attr( $s['from_email'] ) . '" placeholder="hello@example.com"> <input class="regular-text" style="width:14em" type="text" name="sbp_email[from_name]" value="' . esc_attr( $s['from_name'] ) . '" placeholder="' . esc_attr__( 'Sender name', 'sidcraft-page-builder' ) . '"><p class="description">' . esc_html__( 'Must be an address or domain you verified with the service.', 'sidcraft-page-builder' ) . '</p></td></tr>';
		echo '<tr><th scope="row">' . esc_html__( 'If sending fails', 'sidcraft-page-builder' ) . '</th><td><label><input type="checkbox" name="sbp_email[fallback]" value="1"' . checked( ! empty( $s['fallback'] ), true, false ) . '> ' . esc_html__( 'Send it the normal WordPress way instead', 'sidcraft-page-builder' ) . '</label></td></tr>';
		foreach ( self::transactional() as $id => $d ) {
			if ( 'brevo' === $id ) {
				continue; // Uses the key above.
			}
			$c = self::creds( $id );
			echo '<tr><th scope="row">' . esc_html( $d[0] ) . ' ' . ( self::configured( $id ) ? '<span style="color:#1a7f37;font-weight:400">✓</span>' : '' ) . '</th><td>';
			foreach ( $d[1] as $f => $meta ) {
				echo '<p style="margin:0 0 4px">' . self::input( 'keys][' . $id . '][' . $f, (string) ( $c[ $f ] ?? '' ), $meta[1], $meta[0] ) . '</p>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in input().
			}
			echo '<p class="description">' . esc_html( $d[2] ) . '</p></td></tr>';
		}
		echo '<tr><th scope="row"><label for="sbp-test">' . esc_html__( 'Test', 'sidcraft-page-builder' ) . '</label></th><td><input id="sbp-test" class="regular-text" type="email" name="sbp_test_to" value="' . esc_attr( (string) wp_get_current_user()->user_email ) . '"> <button class="button" name="do" value="sendtest">' . esc_html__( 'Save and send a test email', 'sidcraft-page-builder' ) . '</button></td></tr>';
		echo '</tbody></table><p><button class="button button-primary" name="do" value="save">' . esc_html__( 'Save email services', 'sidcraft-page-builder' ) . '</button></p></form>';

		$rows = get_option( self::LOG, array() );
		if ( is_array( $rows ) && $rows ) {
			echo '<h2 class="title">' . esc_html__( 'Recent activity', 'sidcraft-page-builder' ) . '</h2><table class="widefat striped" style="max-width:900px"><tbody>';
			foreach ( $rows as $r ) {
				echo '<tr><td>' . esc_html( wp_date( 'Y-m-d H:i', (int) $r['t'] ) ) . '</td><td>' . esc_html( (string) $r['s'] ) . '</td><td>' . esc_html( (string) $r['w'] ) . '</td><td style="color:' . ( $r['ok'] ? '#1a7f37' : '#b32d2e' ) . '">' . ( $r['ok'] ? '✓' : '✗' ) . '</td><td>' . esc_html( (string) $r['m'] ) . '</td></tr>';
			}
			echo '</tbody></table>';
		}
	}

	/** One handler for the buttons on the screen. Saves what was typed first. */
	public static function handle() {
		if ( ! self::can_manage() ) {
			wp_die( esc_html__( 'You are not allowed to do this.', 'sidcraft-page-builder' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( self::NONCE );
		self::save_posted();
		$do     = isset( $_POST['do'] ) ? sanitize_text_field( wp_unslash( $_POST['do'] ) ) : 'save'; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- checked above.
		$notice = array( 'ok' => true, 'msg' => __( 'Saved.', 'sidcraft-page-builder' ) );
		if ( 0 === strpos( $do, 'lists:' ) ) {
			$id = sanitize_key( substr( $do, 6 ) );
			$d  = self::marketing()[ $id ] ?? null;
			if ( $d ) {
				$r = Marketing::lists( $id, self::creds( $id ) );
				if ( is_wp_error( $r ) ) {
					$notice = array( 'ok' => false, 'msg' => $d[0] . ': ' . $r->get_error_message() );
				} else {
					/* translators: 1: service name, 2: number of lists */
					$notice = array( 'ok' => true, 'msg' => sprintf( _n( '%1$s is connected: %2$d value found. Use its ID in the form.', '%1$s is connected: %2$d values found. Use the ID in the form.', count( $r ), 'sidcraft-page-builder' ), $d[0], count( $r ) ), 'lists' => $r, 'label' => $d[2] );
				}
			}
		} elseif ( 'sendtest' === $do ) {
			$s = self::get();
			if ( 'wp' === $s['mailer'] ) {
				$notice = array( 'ok' => false, 'msg' => __( 'Choose a service under "Send through" first.', 'sidcraft-page-builder' ) );
			} else {
				$to   = isset( $_POST['sbp_test_to'] ) ? sanitize_email( wp_unslash( $_POST['sbp_test_to'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- checked above.
				$host = wp_parse_url( home_url(), PHP_URL_HOST );
				$from = is_email( $s['from_email'] ) ? $s['from_email'] : 'wordpress@' . preg_replace( '/^www\./', '', (string) $host );
				$r    = is_email( $to ) ? Transactional::send( $s['mailer'], self::creds( $s['mailer'] ), array( 'to' => array( $to ), 'subject' => __( 'Test email from Sidcraft Page Builder', 'sidcraft-page-builder' ), 'text' => __( 'If you can read this, your email service works.', 'sidcraft-page-builder' ), 'from_email' => $from, 'from_name' => '' !== $s['from_name'] ? $s['from_name'] : wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) ) ) : array( false, __( 'Enter a valid address for the test.', 'sidcraft-page-builder' ) );
				self::log( $s['mailer'], 'test email', $r[0], $r[0] ? __( 'Sent.', 'sidcraft-page-builder' ) : $r[1] );
				$notice = array( 'ok' => $r[0], 'msg' => $r[0] ? __( 'The test email was accepted by the service. Check your inbox (and spam folder).', 'sidcraft-page-builder' ) : $r[1] );
			}
		}
		set_transient( 'sbp_email_notice_' . get_current_user_id(), $notice, 5 * MINUTE_IN_SECONDS );
		wp_safe_redirect( self::url() );
		exit;
	}
}
