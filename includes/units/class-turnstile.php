<?php
/**
 * Cloudflare Turnstile unit (Sidcraft Syntex).
 *
 * Place it next to (or inside the same container as) a Sidcraft Syntex Form: the form's
 * submission then requires a valid Turnstile token (verified server-side with
 * Siteverify). It can also sit alone as a visible "verify you are human" widget.
 *
 * Keys: Sidcraft Syntex → Settings → Integrations → Cloudflare Turnstile.
 *
 * @package SidcraftSyntex
 */

namespace SidcraftSyntex\Units;

use SidcraftSyntex\Integrations\Turnstile as TurnstileService;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Turnstile extends Unit {
	public function type() {
		return 'turnstile';
	}

	public function title() {
		return __( 'Cloudflare Turnstile', 'sidcraft-syntex' );
	}

	public function icon() {
		return "\u{2601}";
	}

	public function category() {
		return 'advanced';
	}

	public function keywords() {
		return array( 'turnstile', 'cloudflare', 'captcha', 'spam', 'security', 'recaptcha', 'bot', 'form' );
	}

	public function defaults() {
		return array(
			'protect_form' => true,
			'theme'        => '',
			'size'         => '',
			'appearance'   => '',
			'action'       => 'sidcraft_syntex_form',
			'language'     => 'auto',
			'align'        => 'flex-start',
		);
	}

	public function controls() {
		$sec = __( 'Turnstile', 'sidcraft-syntex' );
		$def = array( '' => __( 'Site default', 'sidcraft-syntex' ) );
		return array(
			'protect_form' => $this->ctrl( 'switch', __( 'Protect the form in this container', 'sidcraft-syntex' ), 'content', $sec, array( 'description' => __( 'Submissions of a Sidcraft Syntex Form placed in the same container are rejected without a valid Turnstile token.', 'sidcraft-syntex' ) ) ),
			'theme'        => $this->ctrl( 'select', __( 'Theme', 'sidcraft-syntex' ), 'content', $sec, array( 'options' => $def + array( 'auto' => __( 'Auto', 'sidcraft-syntex' ), 'light' => __( 'Light', 'sidcraft-syntex' ), 'dark' => __( 'Dark', 'sidcraft-syntex' ) ) ) ),
			'size'         => $this->ctrl( 'select', __( 'Size', 'sidcraft-syntex' ), 'content', $sec, array( 'options' => $def + array( 'normal' => __( 'Normal (300×65)', 'sidcraft-syntex' ), 'flexible' => __( 'Flexible (full width)', 'sidcraft-syntex' ), 'compact' => __( 'Compact (150×140)', 'sidcraft-syntex' ) ) ) ),
			'appearance'   => $this->ctrl( 'select', __( 'Appearance', 'sidcraft-syntex' ), 'content', $sec, array( 'options' => $def + array( 'always' => __( 'Always visible', 'sidcraft-syntex' ), 'interaction-only' => __( 'Only when interaction is needed', 'sidcraft-syntex' ) ) ) ),
			'action'       => $this->ctrl( 'text', __( 'Action name', 'sidcraft-syntex' ), 'content', $sec, array( 'description' => __( 'Shown in Cloudflare analytics. Letters, digits, - and _ (max 32).', 'sidcraft-syntex' ) ) ),
			'language'     => $this->ctrl( 'text', __( 'Language', 'sidcraft-syntex' ), 'content', $sec, array( 'placeholder' => 'auto', 'description' => __( '"auto" or a code such as en, de, fr, es-es.', 'sidcraft-syntex' ) ) ),
			'align'        => $this->ctrl( 'choose', __( 'Alignment', 'sidcraft-syntex' ), 'style', __( 'Layout', 'sidcraft-syntex' ), array( 'options' => array( 'flex-start' => __( 'Left', 'sidcraft-syntex' ), 'center' => __( 'Center', 'sidcraft-syntex' ), 'flex-end' => __( 'Right', 'sidcraft-syntex' ) ), 'selectors' => array( '{{WRAPPER}} .lb-turnstile-wrap' => 'justify-content: {{VALUE}};' ) ) ),
		);
	}

	public function scripts( $settings = array() ) {
		unset( $settings );
		return class_exists( TurnstileService::class ) ? TurnstileService::handles() : array();
	}

	public function render( $settings, $children = '' ) {
		unset( $children );
		$s = array_merge( $this->defaults(), is_array( $settings ) ? $settings : array() );
		if ( ! class_exists( TurnstileService::class ) || ! TurnstileService::enabled() ) {
			if ( function_exists( 'current_user_can' ) && current_user_can( 'manage_options' ) ) {
				return '<div class="' . esc_attr( $this->cls( $s ) ) . ' lb-turnstile-missing"><p>' . esc_html__( 'Cloudflare Turnstile: add the site and secret keys under Sidcraft Syntex → Settings → Integrations.', 'sidcraft-syntex' ) . '</p></div>';
			}
			return '';
		}
		$widget = TurnstileService::markup(
			array(
				'theme'      => (string) $s['theme'],
				'size'       => (string) $s['size'],
				'appearance' => (string) $s['appearance'],
				'action'     => (string) $s['action'],
				'language'   => (string) $s['language'],
				'standalone' => ! empty( $s['protect_form'] ),
			)
		);
		return '<div class="' . esc_attr( $this->cls( $s ) ) . ' lb-turnstile-wrap" style="display:flex">' . $widget . '</div>';
	}
}
