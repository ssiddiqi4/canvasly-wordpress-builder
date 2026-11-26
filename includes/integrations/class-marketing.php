<?php
/**
 * Newsletter services: add the visitor who filled in a Form unit to a list or audience.
 *
 * Every method returns array( bool ok, string message ) and never throws.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Integrations;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Marketing {

	/**
	 * Add a contact.
	 *
	 * @param string $provider Provider id from EmailServices::marketing().
	 * @param array  $c        Saved credentials of the provider.
	 * @param array  $p        email, first, last, list, tags (array), double (bool).
	 * @return array array( bool ok, string message )
	 */
	public static function subscribe( $provider, array $c, array $p ) {
		$p = array_merge( array( 'email' => '', 'first' => '', 'last' => '', 'list' => '', 'tags' => array(), 'double' => false ), $p );
		if ( ! is_email( $p['email'] ) ) {
			return array( false, __( 'The email address is not valid.', 'sidcraft-page-builder' ) );
		}
		$method = 'sub_' . $provider;
		if ( ! method_exists( __CLASS__, $method ) ) {
			return array( false, __( 'Unknown email service.', 'sidcraft-page-builder' ) );
		}
		return self::$method( $c, $p );
	}

	/**
	 * The lists, audiences or forms of an account, to show their IDs on the settings screen.
	 *
	 * @param string $provider Provider id.
	 * @param array  $c        Credentials.
	 * @return array|\WP_Error id => name
	 */
	public static function lists( $provider, array $c ) {
		$method = 'lists_' . $provider;
		if ( ! method_exists( __CLASS__, $method ) ) {
			return new \WP_Error( 'unknown', __( 'Unknown email service.', 'sidcraft-page-builder' ) );
		}
		return self::$method( $c );
	}

	/* ---------- helpers ---------- */

	/** @return array array( int code, mixed body ) or WP_Error */
	public static function http( $method, $url, array $headers = array(), $body = null, $json = true ) {
		$args = array(
			'method'      => $method,
			'timeout'     => 12,
			'redirection' => 0,
			'headers'     => array_merge( array( 'Accept' => 'application/json' ), $headers ),
		);
		if ( null !== $body ) {
			if ( $json ) {
				$args['headers']['Content-Type'] = 'application/json';
				$args['body']                    = wp_json_encode( $body );
			} else {
				$args['body'] = $body;
			}
		}
		$res = wp_safe_remote_request( $url, $args );
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		$raw  = (string) wp_remote_retrieve_body( $res );
		$data = json_decode( $raw, true );
		return array( (int) wp_remote_retrieve_response_code( $res ), is_array( $data ) ? $data : $raw );
	}

	/** A short message for a failed answer. */
	private static function fail( $r, $label ) {
		if ( is_wp_error( $r ) ) {
			return array( false, $label . ': ' . $r->get_error_message() );
		}
		$msg = '';
		if ( is_array( $r[1] ) ) {
			foreach ( array( 'detail', 'message', 'error', 'title', 'errors' ) as $k ) {
				if ( isset( $r[1][ $k ] ) && is_string( $r[1][ $k ] ) && '' !== $r[1][ $k ] ) {
					$msg = $r[1][ $k ];
					break;
				}
			}
			if ( '' === $msg && isset( $r[1]['errors'][0]['detail'] ) && is_string( $r[1]['errors'][0]['detail'] ) ) {
				$msg = $r[1]['errors'][0]['detail'];
			}
		}
		/* translators: 1: service name, 2: HTTP status, 3: message */
		return array( false, sprintf( __( '%1$s answered %2$d. %3$s', 'sidcraft-page-builder' ), $label, $r[0], wp_strip_all_tags( mb_substr( $msg, 0, 200 ) ) ) );
	}

	private static function done( $r, $label, array $ok_codes = array( 200, 201, 202, 204 ) ) {
		if ( is_wp_error( $r ) || ! in_array( $r[0], $ok_codes, true ) ) {
			return self::fail( $r, $label );
		}
		return array( true, '' );
	}

	private static function key( array $c, $name ) {
		return isset( $c[ $name ] ) && is_string( $c[ $name ] ) ? trim( $c[ $name ] ) : '';
	}

	private static function need( array $c, array $names ) {
		foreach ( $names as $n ) {
			if ( '' === self::key( $c, $n ) ) {
				return false;
			}
		}
		return true;
	}

	private static function missing() {
		return array( false, __( 'The service is not set up: add its details under Settings, Email services.', 'sidcraft-page-builder' ) );
	}

	/* ---------- Mailchimp ---------- */

	private static function mc_base( array $c ) {
		$key = self::key( $c, 'api_key' );
		$pos = strrpos( $key, '-' );
		if ( '' === $key || false === $pos ) {
			return null;
		}
		$dc = substr( $key, $pos + 1 );
		return preg_match( '/^[a-z0-9]{2,12}$/i', $dc ) ? array( 'https://' . strtolower( $dc ) . '.api.mailchimp.com/3.0', array( 'Authorization' => 'Basic ' . base64_encode( 'sidcraft:' . $key ) ) ) : null;
	}

	private static function lists_mailchimp( array $c ) {
		$b = self::mc_base( $c );
		if ( ! $b ) {
			return new \WP_Error( 'cfg', __( 'The Mailchimp API key looks wrong. It ends with a dash and a data centre such as -us21.', 'sidcraft-page-builder' ) );
		}
		$r = self::http( 'GET', $b[0] . '/lists?count=100&fields=lists.id,lists.name', $b[1] );
		$o = self::done( $r, 'Mailchimp' );
		if ( ! $o[0] ) {
			return new \WP_Error( 'api', $o[1] );
		}
		$out = array();
		foreach ( (array) ( $r[1]['lists'] ?? array() ) as $l ) {
			if ( isset( $l['id'], $l['name'] ) ) {
				$out[ (string) $l['id'] ] = (string) $l['name'];
			}
		}
		return $out;
	}

	private static function sub_mailchimp( array $c, array $p ) {
		$b = self::mc_base( $c );
		if ( ! $b || '' === $p['list'] ) {
			return $b ? array( false, __( 'Choose the Mailchimp audience ID in the form.', 'sidcraft-page-builder' ) ) : self::missing();
		}
		$body = array(
			'email_address' => $p['email'],
			'status_if_new' => $p['double'] ? 'pending' : 'subscribed',
		);
		$merge = array();
		if ( '' !== $p['first'] ) {
			$merge['FNAME'] = $p['first'];
		}
		if ( '' !== $p['last'] ) {
			$merge['LNAME'] = $p['last'];
		}
		if ( $merge ) {
			$body['merge_fields'] = $merge;
		}
		if ( $p['tags'] ) {
			$body['tags'] = array_values( $p['tags'] );
		}
		$r = self::http( 'PUT', $b[0] . '/lists/' . rawurlencode( $p['list'] ) . '/members/' . md5( strtolower( $p['email'] ) ), $b[1], $body );
		return self::done( $r, 'Mailchimp' );
	}

	/* ---------- Kit (formerly ConvertKit) ---------- */

	private static function kit_headers( array $c ) {
		return array( 'X-Kit-Api-Key' => self::key( $c, 'api_key' ) );
	}

	private static function lists_kit( array $c ) {
		if ( ! self::need( $c, array( 'api_key' ) ) ) {
			return new \WP_Error( 'cfg', self::missing()[1] );
		}
		$r = self::http( 'GET', 'https://api.kit.com/v4/forms?per_page=100', self::kit_headers( $c ) );
		$o = self::done( $r, 'Kit' );
		if ( ! $o[0] ) {
			return new \WP_Error( 'api', $o[1] );
		}
		$out = array();
		foreach ( (array) ( $r[1]['forms'] ?? array() ) as $f ) {
			if ( isset( $f['id'], $f['name'] ) ) {
				$out[ (string) $f['id'] ] = (string) $f['name'];
			}
		}
		return $out;
	}

	private static function sub_kit( array $c, array $p ) {
		if ( ! self::need( $c, array( 'api_key' ) ) ) {
			return self::missing();
		}
		$h    = self::kit_headers( $c );
		$body = array( 'email_address' => $p['email'] );
		if ( '' !== $p['first'] ) {
			$body['first_name'] = $p['first'];
		}
		$o = self::done( self::http( 'POST', 'https://api.kit.com/v4/subscribers', $h, $body ), 'Kit' );
		if ( ! $o[0] ) {
			return $o;
		}
		if ( preg_match( '/^\d+$/', $p['list'] ) ) {
			$o = self::done( self::http( 'POST', 'https://api.kit.com/v4/forms/' . $p['list'] . '/subscribers', $h, array( 'email_address' => $p['email'] ) ), 'Kit' );
			if ( ! $o[0] ) {
				return $o;
			}
		}
		foreach ( $p['tags'] as $tag ) {
			if ( preg_match( '/^\d+$/', $tag ) ) {
				self::http( 'POST', 'https://api.kit.com/v4/tags/' . $tag . '/subscribers', $h, array( 'email_address' => $p['email'] ) );
			}
		}
		return array( true, '' );
	}

	/* ---------- MailerLite ---------- */

	private static function ml_headers( array $c ) {
		return array( 'Authorization' => 'Bearer ' . self::key( $c, 'api_key' ) );
	}

	private static function lists_mailerlite( array $c ) {
		if ( ! self::need( $c, array( 'api_key' ) ) ) {
			return new \WP_Error( 'cfg', self::missing()[1] );
		}
		$r = self::http( 'GET', 'https://connect.mailerlite.com/api/groups?limit=100', self::ml_headers( $c ) );
		$o = self::done( $r, 'MailerLite' );
		if ( ! $o[0] ) {
			return new \WP_Error( 'api', $o[1] );
		}
		$out = array();
		foreach ( (array) ( $r[1]['data'] ?? array() ) as $g ) {
			if ( isset( $g['id'], $g['name'] ) ) {
				$out[ (string) $g['id'] ] = (string) $g['name'];
			}
		}
		return $out;
	}

	private static function sub_mailerlite( array $c, array $p ) {
		if ( ! self::need( $c, array( 'api_key' ) ) ) {
			return self::missing();
		}
		$body   = array( 'email' => $p['email'], 'status' => $p['double'] ? 'unconfirmed' : 'active' );
		$fields = array();
		if ( '' !== $p['first'] ) {
			$fields['name'] = $p['first'];
		}
		if ( '' !== $p['last'] ) {
			$fields['last_name'] = $p['last'];
		}
		if ( $fields ) {
			$body['fields'] = $fields;
		}
		if ( preg_match( '/^\d+$/', $p['list'] ) ) {
			$body['groups'] = array( $p['list'] );
		}
		return self::done( self::http( 'POST', 'https://connect.mailerlite.com/api/subscribers', self::ml_headers( $c ), $body ), 'MailerLite' );
	}

	/* ---------- Brevo ---------- */

	private static function brevo_headers( array $c ) {
		return array( 'api-key' => self::key( $c, 'api_key' ) );
	}

	private static function lists_brevo( array $c ) {
		if ( ! self::need( $c, array( 'api_key' ) ) ) {
			return new \WP_Error( 'cfg', self::missing()[1] );
		}
		$r = self::http( 'GET', 'https://api.brevo.com/v3/contacts/lists?limit=50', self::brevo_headers( $c ) );
		$o = self::done( $r, 'Brevo' );
		if ( ! $o[0] ) {
			return new \WP_Error( 'api', $o[1] );
		}
		$out = array();
		foreach ( (array) ( $r[1]['lists'] ?? array() ) as $l ) {
			if ( isset( $l['id'], $l['name'] ) ) {
				$out[ (string) $l['id'] ] = (string) $l['name'];
			}
		}
		return $out;
	}

	private static function sub_brevo( array $c, array $p ) {
		if ( ! self::need( $c, array( 'api_key' ) ) ) {
			return self::missing();
		}
		$attrs = array();
		if ( '' !== $p['first'] ) {
			$attrs['FIRSTNAME'] = $p['first'];
		}
		if ( '' !== $p['last'] ) {
			$attrs['LASTNAME'] = $p['last'];
		}
		$list = preg_match( '/^\d+$/', $p['list'] ) ? array( (int) $p['list'] ) : array();
		$tpl  = self::key( $c, 'doi_template' );
		if ( $p['double'] && preg_match( '/^\d+$/', $tpl ) ) {
			$body = array( 'email' => $p['email'], 'templateId' => (int) $tpl, 'redirectionUrl' => esc_url_raw( self::key( $c, 'doi_redirect' ) ? self::key( $c, 'doi_redirect' ) : home_url( '/' ) ), 'includeListIds' => $list );
			if ( $attrs ) {
				$body['attributes'] = $attrs;
			}
			return self::done( self::http( 'POST', 'https://api.brevo.com/v3/contacts/doubleOptinConfirmation', self::brevo_headers( $c ), $body ), 'Brevo' );
		}
		$body = array( 'email' => $p['email'], 'updateEnabled' => true );
		if ( $attrs ) {
			$body['attributes'] = $attrs;
		}
		if ( $list ) {
			$body['listIds'] = $list;
		}
		return self::done( self::http( 'POST', 'https://api.brevo.com/v3/contacts', self::brevo_headers( $c ), $body ), 'Brevo' );
	}

	/* ---------- ActiveCampaign ---------- */

	private static function ac_base( array $c ) {
		$url = untrailingslashit( esc_url_raw( self::key( $c, 'account_url' ), array( 'https' ) ) );
		if ( '' === $url || '' === self::key( $c, 'api_key' ) ) {
			return null;
		}
		return array( $url . '/api/3', array( 'Api-Token' => self::key( $c, 'api_key' ) ) );
	}

	private static function lists_activecampaign( array $c ) {
		$b = self::ac_base( $c );
		if ( ! $b ) {
			return new \WP_Error( 'cfg', self::missing()[1] );
		}
		$r = self::http( 'GET', $b[0] . '/lists?limit=100', $b[1] );
		$o = self::done( $r, 'ActiveCampaign' );
		if ( ! $o[0] ) {
			return new \WP_Error( 'api', $o[1] );
		}
		$out = array();
		foreach ( (array) ( $r[1]['lists'] ?? array() ) as $l ) {
			if ( isset( $l['id'], $l['name'] ) ) {
				$out[ (string) $l['id'] ] = (string) $l['name'];
			}
		}
		return $out;
	}

	private static function sub_activecampaign( array $c, array $p ) {
		$b = self::ac_base( $c );
		if ( ! $b ) {
			return self::missing();
		}
		$contact = array( 'email' => $p['email'] );
		if ( '' !== $p['first'] ) {
			$contact['firstName'] = $p['first'];
		}
		if ( '' !== $p['last'] ) {
			$contact['lastName'] = $p['last'];
		}
		$r = self::http( 'POST', $b[0] . '/contact/sync', $b[1], array( 'contact' => $contact ) );
		$o = self::done( $r, 'ActiveCampaign' );
		if ( ! $o[0] ) {
			return $o;
		}
		$id = is_array( $r[1] ) && isset( $r[1]['contact']['id'] ) ? (int) $r[1]['contact']['id'] : 0;
		if ( $id && preg_match( '/^\d+$/', $p['list'] ) ) {
			return self::done( self::http( 'POST', $b[0] . '/contactLists', $b[1], array( 'contactList' => array( 'list' => (int) $p['list'], 'contact' => $id, 'status' => 1 ) ) ), 'ActiveCampaign' );
		}
		return array( true, '' );
	}

	/* ---------- Klaviyo ---------- */

	private static function kl_headers( array $c ) {
		return array( 'Authorization' => 'Klaviyo-API-Key ' . self::key( $c, 'api_key' ), 'revision' => '2024-10-15' );
	}

	private static function lists_klaviyo( array $c ) {
		if ( ! self::need( $c, array( 'api_key' ) ) ) {
			return new \WP_Error( 'cfg', self::missing()[1] );
		}
		$r = self::http( 'GET', 'https://a.klaviyo.com/api/lists', self::kl_headers( $c ) );
		$o = self::done( $r, 'Klaviyo' );
		if ( ! $o[0] ) {
			return new \WP_Error( 'api', $o[1] );
		}
		$out = array();
		foreach ( (array) ( $r[1]['data'] ?? array() ) as $l ) {
			if ( isset( $l['id'], $l['attributes']['name'] ) ) {
				$out[ (string) $l['id'] ] = (string) $l['attributes']['name'];
			}
		}
		return $out;
	}

	private static function sub_klaviyo( array $c, array $p ) {
		if ( ! self::need( $c, array( 'api_key' ) ) ) {
			return self::missing();
		}
		$h     = self::kl_headers( $c );
		$attrs = array( 'email' => $p['email'] );
		if ( '' !== $p['first'] ) {
			$attrs['first_name'] = $p['first'];
		}
		if ( '' !== $p['last'] ) {
			$attrs['last_name'] = $p['last'];
		}
		// Create or update the profile first so the name is kept; then record the marketing consent (and add to the list).
		$o = self::done( self::http( 'POST', 'https://a.klaviyo.com/api/profile-import/', $h, array( 'data' => array( 'type' => 'profile', 'attributes' => $attrs ) ) ), 'Klaviyo' );
		if ( ! $o[0] ) {
			return $o;
		}
		$job = array(
			'type'       => 'profile-subscription-bulk-create-job',
			'attributes' => array( 'profiles' => array( 'data' => array( array( 'type' => 'profile', 'attributes' => array( 'email' => $p['email'], 'subscriptions' => array( 'email' => array( 'marketing' => array( 'consent' => 'SUBSCRIBED' ) ) ) ) ) ) ) ),
		);
		if ( '' !== $p['list'] ) {
			$job['relationships'] = array( 'list' => array( 'data' => array( 'type' => 'list', 'id' => $p['list'] ) ) );
		}
		return self::done( self::http( 'POST', 'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/', $h, array( 'data' => $job ) ), 'Klaviyo' );
	}

	/* ---------- Beehiiv ---------- */

	private static function bh_headers( array $c ) {
		return array( 'Authorization' => 'Bearer ' . self::key( $c, 'api_key' ) );
	}

	private static function lists_beehiiv( array $c ) {
		if ( ! self::need( $c, array( 'api_key' ) ) ) {
			return new \WP_Error( 'cfg', self::missing()[1] );
		}
		$r = self::http( 'GET', 'https://api.beehiiv.com/v2/publications?limit=50', self::bh_headers( $c ) );
		$o = self::done( $r, 'Beehiiv' );
		if ( ! $o[0] ) {
			return new \WP_Error( 'api', $o[1] );
		}
		$out = array();
		foreach ( (array) ( $r[1]['data'] ?? array() ) as $l ) {
			if ( isset( $l['id'], $l['name'] ) ) {
				$out[ (string) $l['id'] ] = (string) $l['name'];
			}
		}
		return $out;
	}

	private static function sub_beehiiv( array $c, array $p ) {
		if ( ! self::need( $c, array( 'api_key' ) ) ) {
			return self::missing();
		}
		if ( ! preg_match( '/^pub_[A-Za-z0-9-]+$/', $p['list'] ) ) {
			return array( false, __( 'Choose the Beehiiv publication ID (it starts with pub_) in the form.', 'sidcraft-page-builder' ) );
		}
		$body = array( 'email' => $p['email'], 'reactivate_existing' => false, 'send_welcome_email' => true, 'double_opt_override' => $p['double'] ? 'on' : 'off' );
		return self::done( self::http( 'POST', 'https://api.beehiiv.com/v2/publications/' . $p['list'] . '/subscriptions', self::bh_headers( $c ), $body ), 'Beehiiv' );
	}

	/* ---------- Self-hosted: FluentCRM, MailPoet, Listmonk ---------- */

	private static function lists_fluentcrm( array $c ) {
		unset( $c );
		if ( ! function_exists( 'FluentCrmApi' ) ) {
			return new \WP_Error( 'cfg', __( 'FluentCRM is not active on this site.', 'sidcraft-page-builder' ) );
		}
		$out = array();
		try {
			foreach ( \FluentCrmApi( 'lists' )->all() as $l ) {
				$out[ (string) $l->id ] = (string) $l->title;
			}
		} catch ( \Throwable $e ) {
			return new \WP_Error( 'api', $e->getMessage() );
		}
		return $out;
	}

	private static function sub_fluentcrm( array $c, array $p ) {
		unset( $c );
		if ( ! function_exists( 'FluentCrmApi' ) ) {
			return array( false, __( 'FluentCRM is not active on this site.', 'sidcraft-page-builder' ) );
		}
		try {
			$data = array( 'email' => $p['email'], 'status' => $p['double'] ? 'pending' : 'subscribed' );
			if ( '' !== $p['first'] ) {
				$data['first_name'] = $p['first'];
			}
			if ( '' !== $p['last'] ) {
				$data['last_name'] = $p['last'];
			}
			if ( preg_match( '/^\d+$/', $p['list'] ) ) {
				$data['lists'] = array( (int) $p['list'] );
			}
			if ( $p['tags'] ) {
				$data['tags'] = array_map( static function ( $t ) {
					return preg_match( '/^\d+$/', $t ) ? (int) $t : $t;
				}, $p['tags'] );
			}
			$contact = \FluentCrmApi( 'contacts' )->createOrUpdate( $data );
			if ( $p['double'] && $contact && 'pending' === $contact->status && method_exists( $contact, 'sendDoubleOptinEmail' ) ) {
				$contact->sendDoubleOptinEmail();
			}
		} catch ( \Throwable $e ) {
			return array( false, 'FluentCRM: ' . $e->getMessage() );
		}
		return array( true, '' );
	}

	private static function lists_mailpoet( array $c ) {
		unset( $c );
		if ( ! class_exists( '\MailPoet\API\API' ) ) {
			return new \WP_Error( 'cfg', __( 'MailPoet is not active on this site.', 'sidcraft-page-builder' ) );
		}
		$out = array();
		try {
			foreach ( \MailPoet\API\API::MP( 'v1' )->getLists() as $l ) {
				$out[ (string) $l['id'] ] = (string) $l['name'];
			}
		} catch ( \Throwable $e ) {
			return new \WP_Error( 'api', $e->getMessage() );
		}
		return $out;
	}

	private static function sub_mailpoet( array $c, array $p ) {
		unset( $c );
		if ( ! class_exists( '\MailPoet\API\API' ) ) {
			return array( false, __( 'MailPoet is not active on this site.', 'sidcraft-page-builder' ) );
		}
		$mp    = \MailPoet\API\API::MP( 'v1' );
		$lists = preg_match( '/^\d+$/', $p['list'] ) ? array( (int) $p['list'] ) : array();
		$opts  = array( 'send_confirmation_email' => (bool) $p['double'], 'schedule_welcome_email' => false, 'skip_subscriber_notification' => true );
		$data  = array( 'email' => $p['email'] );
		if ( '' !== $p['first'] ) {
			$data['first_name'] = $p['first'];
		}
		if ( '' !== $p['last'] ) {
			$data['last_name'] = $p['last'];
		}
		try {
			$mp->addSubscriber( $data, $lists, $opts );
		} catch ( \Throwable $e ) {
			try {
				// The address is already known: just add it to the list.
				if ( $lists ) {
					$mp->subscribeToLists( $p['email'], $lists, $opts );
				}
			} catch ( \Throwable $e2 ) {
				return array( false, 'MailPoet: ' . $e2->getMessage() );
			}
		}
		return array( true, '' );
	}

	private static function lm_base( array $c ) {
		$url = untrailingslashit( esc_url_raw( self::key( $c, 'url' ), array( 'https', 'http' ) ) );
		if ( '' === $url || '' === self::key( $c, 'user' ) || '' === self::key( $c, 'token' ) ) {
			return null;
		}
		return array( $url . '/api', array( 'Authorization' => 'token ' . self::key( $c, 'user' ) . ':' . self::key( $c, 'token' ) ) );
	}

	private static function lists_listmonk( array $c ) {
		$b = self::lm_base( $c );
		if ( ! $b ) {
			return new \WP_Error( 'cfg', self::missing()[1] );
		}
		$r = self::http( 'GET', $b[0] . '/lists?per_page=all', $b[1] );
		$o = self::done( $r, 'Listmonk' );
		if ( ! $o[0] ) {
			return new \WP_Error( 'api', $o[1] );
		}
		$out = array();
		foreach ( (array) ( $r[1]['data']['results'] ?? array() ) as $l ) {
			if ( isset( $l['id'], $l['name'] ) ) {
				$out[ (string) $l['id'] ] = (string) $l['name'];
			}
		}
		return $out;
	}

	private static function sub_listmonk( array $c, array $p ) {
		$b = self::lm_base( $c );
		if ( ! $b ) {
			return self::missing();
		}
		$name = trim( $p['first'] . ' ' . $p['last'] );
		$body = array( 'email' => $p['email'], 'name' => '' !== $name ? $name : $p['email'], 'status' => 'enabled', 'preconfirm_subscriptions' => ! $p['double'] );
		if ( preg_match( '/^\d+$/', $p['list'] ) ) {
			$body['lists'] = array( (int) $p['list'] );
		}
		$r = self::http( 'POST', $b[0] . '/subscribers', $b[1], $body );
		if ( ! is_wp_error( $r ) && 409 === $r[0] ) {
			return array( true, '' ); // Already on the list.
		}
		return self::done( $r, 'Listmonk' );
	}
}
