<?php
/**
 * Transactional email services: send one message through a provider's API instead of the web server's mail.
 *
 * Every method returns array( bool ok, string message ) and never throws.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Integrations;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Transactional {

	/**
	 * Send a message.
	 *
	 * @param string $provider resend, postmark, ses, mailgun, sendgrid or brevo.
	 * @param array  $c        Saved credentials of the provider.
	 * @param array  $m        to (array of addresses), subject, text, html (empty for plain), from_email, from_name, reply_to, cc, bcc.
	 * @return array array( bool ok, string message )
	 */
	public static function send( $provider, array $c, array $m ) {
		$m = array_merge( array( 'to' => array(), 'subject' => '', 'text' => '', 'html' => '', 'from_email' => '', 'from_name' => '', 'reply_to' => '', 'cc' => array(), 'bcc' => array() ), $m );
		if ( ! $m['to'] || ! is_email( $m['from_email'] ) ) {
			return array( false, __( 'A recipient and a valid sender address are needed.', 'sidcraft-page-builder' ) );
		}
		$method = 'send_' . $provider;
		if ( ! method_exists( __CLASS__, $method ) ) {
			return array( false, __( 'Unknown email service.', 'sidcraft-page-builder' ) );
		}
		return self::$method( $c, $m );
	}

	private static function key( array $c, $name ) {
		return isset( $c[ $name ] ) && is_string( $c[ $name ] ) ? trim( $c[ $name ] ) : '';
	}

	private static function from( array $m ) {
		return '' !== $m['from_name'] ? $m['from_name'] . ' <' . $m['from_email'] . '>' : $m['from_email'];
	}

	private static function result( $r, $label, array $ok = array( 200, 201, 202, 204 ) ) {
		if ( is_wp_error( $r ) ) {
			return array( false, $label . ': ' . $r->get_error_message() );
		}
		if ( in_array( $r[0], $ok, true ) ) {
			return array( true, '' );
		}
		$msg = '';
		if ( is_array( $r[1] ) ) {
			foreach ( array( 'message', 'Message', 'error', 'detail', 'ErrorCode' ) as $k ) {
				if ( isset( $r[1][ $k ] ) && is_string( $r[1][ $k ] ) && '' !== $r[1][ $k ] ) {
					$msg = $r[1][ $k ];
					break;
				}
			}
			if ( '' === $msg && isset( $r[1]['errors'][0]['message'] ) && is_string( $r[1]['errors'][0]['message'] ) ) {
				$msg = $r[1]['errors'][0]['message'];
			}
		} elseif ( is_string( $r[1] ) ) {
			$msg = $r[1];
		}
		/* translators: 1: service name, 2: HTTP status, 3: message */
		return array( false, sprintf( __( '%1$s answered %2$d. %3$s', 'sidcraft-page-builder' ), $label, $r[0], wp_strip_all_tags( mb_substr( $msg, 0, 200 ) ) ) );
	}

	/* ---------- Resend ---------- */

	private static function send_resend( array $c, array $m ) {
		if ( '' === self::key( $c, 'api_key' ) ) {
			return array( false, __( 'The service is not set up.', 'sidcraft-page-builder' ) );
		}
		$body = array( 'from' => self::from( $m ), 'to' => $m['to'], 'subject' => $m['subject'] );
		$body[ '' !== $m['html'] ? 'html' : 'text' ] = '' !== $m['html'] ? $m['html'] : $m['text'];
		if ( '' !== $m['html'] && '' !== $m['text'] ) {
			$body['text'] = $m['text'];
		}
		foreach ( array( 'cc', 'bcc' ) as $k ) {
			if ( $m[ $k ] ) {
				$body[ $k ] = $m[ $k ];
			}
		}
		if ( '' !== $m['reply_to'] ) {
			$body['reply_to'] = $m['reply_to'];
		}
		return self::result( Marketing::http( 'POST', 'https://api.resend.com/emails', array( 'Authorization' => 'Bearer ' . self::key( $c, 'api_key' ) ), $body ), 'Resend' );
	}

	/* ---------- Postmark ---------- */

	private static function send_postmark( array $c, array $m ) {
		if ( '' === self::key( $c, 'api_key' ) ) {
			return array( false, __( 'The service is not set up.', 'sidcraft-page-builder' ) );
		}
		$body = array( 'From' => self::from( $m ), 'To' => implode( ',', $m['to'] ), 'Subject' => $m['subject'], 'MessageStream' => 'outbound' );
		if ( '' !== $m['html'] ) {
			$body['HtmlBody'] = $m['html'];
		}
		if ( '' !== $m['text'] || '' === $m['html'] ) {
			$body['TextBody'] = $m['text'];
		}
		if ( $m['cc'] ) {
			$body['Cc'] = implode( ',', $m['cc'] );
		}
		if ( $m['bcc'] ) {
			$body['Bcc'] = implode( ',', $m['bcc'] );
		}
		if ( '' !== $m['reply_to'] ) {
			$body['ReplyTo'] = $m['reply_to'];
		}
		return self::result( Marketing::http( 'POST', 'https://api.postmarkapp.com/email', array( 'X-Postmark-Server-Token' => self::key( $c, 'api_key' ) ), $body ), 'Postmark' );
	}

	/* ---------- Mailgun ---------- */

	private static function send_mailgun( array $c, array $m ) {
		$domain = self::key( $c, 'domain' );
		if ( '' === self::key( $c, 'api_key' ) || ! preg_match( '/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/', $domain ) ) {
			return array( false, __( 'The service is not set up (API key and sending domain).', 'sidcraft-page-builder' ) );
		}
		$host = 'eu' === self::key( $c, 'region' ) ? 'api.eu.mailgun.net' : 'api.mailgun.net';
		$body = array( 'from' => self::from( $m ), 'to' => implode( ',', $m['to'] ), 'subject' => $m['subject'], 'text' => $m['text'] );
		if ( '' !== $m['html'] ) {
			$body['html'] = $m['html'];
		}
		if ( $m['cc'] ) {
			$body['cc'] = implode( ',', $m['cc'] );
		}
		if ( $m['bcc'] ) {
			$body['bcc'] = implode( ',', $m['bcc'] );
		}
		if ( '' !== $m['reply_to'] ) {
			$body['h:Reply-To'] = $m['reply_to'];
		}
		return self::result( Marketing::http( 'POST', 'https://' . $host . '/v3/' . rawurlencode( $domain ) . '/messages', array( 'Authorization' => 'Basic ' . base64_encode( 'api:' . self::key( $c, 'api_key' ) ) ), $body, false ), 'Mailgun' );
	}

	/* ---------- SendGrid ---------- */

	private static function send_sendgrid( array $c, array $m ) {
		if ( '' === self::key( $c, 'api_key' ) ) {
			return array( false, __( 'The service is not set up.', 'sidcraft-page-builder' ) );
		}
		$to   = array_map( static function ( $e ) {
			return array( 'email' => $e );
		}, $m['to'] );
		$pers = array( 'to' => $to );
		if ( $m['cc'] ) {
			$pers['cc'] = array_map( static function ( $e ) {
				return array( 'email' => $e );
			}, $m['cc'] );
		}
		if ( $m['bcc'] ) {
			$pers['bcc'] = array_map( static function ( $e ) {
				return array( 'email' => $e );
			}, $m['bcc'] );
		}
		$content = array( array( 'type' => 'text/plain', 'value' => '' !== $m['text'] ? $m['text'] : wp_strip_all_tags( $m['html'] ) ) );
		if ( '' !== $m['html'] ) {
			$content[] = array( 'type' => 'text/html', 'value' => $m['html'] );
		}
		$from = array( 'email' => $m['from_email'] );
		if ( '' !== $m['from_name'] ) {
			$from['name'] = $m['from_name'];
		}
		$body = array( 'personalizations' => array( $pers ), 'from' => $from, 'subject' => $m['subject'], 'content' => $content );
		if ( '' !== $m['reply_to'] ) {
			$body['reply_to'] = array( 'email' => $m['reply_to'] );
		}
		return self::result( Marketing::http( 'POST', 'https://api.sendgrid.com/v3/mail/send', array( 'Authorization' => 'Bearer ' . self::key( $c, 'api_key' ) ), $body ), 'SendGrid' );
	}

	/* ---------- Brevo ---------- */

	private static function send_brevo( array $c, array $m ) {
		if ( '' === self::key( $c, 'api_key' ) ) {
			return array( false, __( 'The service is not set up.', 'sidcraft-page-builder' ) );
		}
		$map  = static function ( array $list ) {
			return array_map( static function ( $e ) {
				return array( 'email' => $e );
			}, $list );
		};
		$body = array( 'sender' => array( 'email' => $m['from_email'] ) + ( '' !== $m['from_name'] ? array( 'name' => $m['from_name'] ) : array() ), 'to' => $map( $m['to'] ), 'subject' => $m['subject'] );
		if ( '' !== $m['html'] ) {
			$body['htmlContent'] = $m['html'];
		} else {
			$body['textContent'] = $m['text'];
		}
		if ( $m['cc'] ) {
			$body['cc'] = $map( $m['cc'] );
		}
		if ( $m['bcc'] ) {
			$body['bcc'] = $map( $m['bcc'] );
		}
		if ( '' !== $m['reply_to'] ) {
			$body['replyTo'] = array( 'email' => $m['reply_to'] );
		}
		return self::result( Marketing::http( 'POST', 'https://api.brevo.com/v3/smtp/email', array( 'api-key' => self::key( $c, 'api_key' ) ), $body ), 'Brevo' );
	}

	/* ---------- Amazon SES (API v2, Signature Version 4) ---------- */

	private static function send_ses( array $c, array $m ) {
		$region = self::key( $c, 'region' );
		if ( '' === self::key( $c, 'access_key' ) || '' === self::key( $c, 'secret_key' ) || ! preg_match( '/^[a-z]{2}(-[a-z]+)+-\d$/', $region ) ) {
			return array( false, __( 'The service is not set up (access key, secret key and region).', 'sidcraft-page-builder' ) );
		}
		$dest = array( 'ToAddresses' => $m['to'] );
		if ( $m['cc'] ) {
			$dest['CcAddresses'] = $m['cc'];
		}
		if ( $m['bcc'] ) {
			$dest['BccAddresses'] = $m['bcc'];
		}
		$bodyc = array();
		if ( '' !== $m['text'] || '' === $m['html'] ) {
			$bodyc['Text'] = array( 'Data' => $m['text'], 'Charset' => 'UTF-8' );
		}
		if ( '' !== $m['html'] ) {
			$bodyc['Html'] = array( 'Data' => $m['html'], 'Charset' => 'UTF-8' );
		}
		$payload = array( 'FromEmailAddress' => self::from( $m ), 'Destination' => $dest, 'Content' => array( 'Simple' => array( 'Subject' => array( 'Data' => $m['subject'], 'Charset' => 'UTF-8' ), 'Body' => $bodyc ) ) );
		if ( '' !== $m['reply_to'] ) {
			$payload['ReplyToAddresses'] = array( $m['reply_to'] );
		}
		$json = (string) wp_json_encode( $payload );
		$host = 'email.' . $region . '.amazonaws.com'; // phpcs:ignore PluginCheck.CodeAnalysis.Offloading.OffloadedContent -- API endpoint of the email service the site owner chose, not an asset.
		$path = '/v2/email/outbound-emails';
		$time = gmdate( 'Ymd\THis\Z' );
		$hdrs = array( 'content-type' => 'application/json', 'host' => $host, 'x-amz-date' => $time );
		$auth = self::sigv4( 'POST', $path, '', $hdrs, $json, $region, 'ses', self::key( $c, 'access_key' ), self::key( $c, 'secret_key' ), $time );
		$r    = Marketing::http( 'POST', 'https://' . $host . $path, array( 'Authorization' => $auth, 'X-Amz-Date' => $time, 'Content-Type' => 'application/json' ), $payload );
		return self::result( $r, 'Amazon SES' );
	}

	/**
	 * AWS Signature Version 4 "Authorization" header value.
	 *
	 * @param string $method  HTTP method.
	 * @param string $path    Request path (already URI-encoded).
	 * @param string $query   Canonical query string ('' when none).
	 * @param array  $headers Lower-case header name => value; every one of them is signed.
	 * @param string $payload Body.
	 * @param string $region  AWS region.
	 * @param string $service AWS service id.
	 * @param string $key     Access key id.
	 * @param string $secret  Secret access key.
	 * @param string $time    Time as 20150830T123600Z.
	 * @return string
	 */
	public static function sigv4( $method, $path, $query, array $headers, $payload, $region, $service, $key, $secret, $time ) {
		ksort( $headers );
		$canon_headers = '';
		foreach ( $headers as $k => $v ) {
			$canon_headers .= strtolower( $k ) . ':' . trim( preg_replace( '/\s+/', ' ', (string) $v ) ) . "\n";
		}
		$signed    = implode( ';', array_map( 'strtolower', array_keys( $headers ) ) );
		$canonical = $method . "\n" . $path . "\n" . $query . "\n" . $canon_headers . "\n" . $signed . "\n" . hash( 'sha256', $payload );
		$date      = substr( $time, 0, 8 );
		$scope     = $date . '/' . $region . '/' . $service . '/aws4_request';
		$to_sign   = "AWS4-HMAC-SHA256\n" . $time . "\n" . $scope . "\n" . hash( 'sha256', $canonical );
		$k         = hash_hmac( 'sha256', 'aws4_request', hash_hmac( 'sha256', $service, hash_hmac( 'sha256', $region, hash_hmac( 'sha256', $date, 'AWS4' . $secret, true ), true ), true ), true );
		return 'AWS4-HMAC-SHA256 Credential=' . $key . '/' . $scope . ', SignedHeaders=' . $signed . ', Signature=' . hash_hmac( 'sha256', $to_sign, $k );
	}
}
