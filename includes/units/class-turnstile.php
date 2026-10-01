<?php
/**
 * Cloudflare Turnstile unit (Canvasly Lite).
 *
 * Place it next to (or inside the same container as) a Canvasly Form: the form's
 * submission then requires a valid Turnstile token (verified server-side with
 * Siteverify). It can also sit alone as a visible "verify you are human" widget.
 *
 * Keys: Canvasly → Settings → Integrations → Cloudflare Turnstile.
 *
 * @package CanvaslyLite
 */

namespace CanvaslyLite\Units;

use CanvaslyLite\Integrations\Turnstile as TurnstileService;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Turnstile extends Unit {
	public function type() {
		return 'turnstile';
	}

	public function title() {
		return __( 'Cloudflare Turnstile', 'canvasly-lite' );
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
			'action'       => 'canvasly_form',
			'language'     => 'auto',
			'align'        => 'flex-start',
		);
	}

	public function controls() {
		$sec = __( 'Turnstile', 'canvasly-lite' );
		$def = array( '' => __( 'Site default', 'canvasly-lite' ) );
		return array(
			'protect_form' => $this->ctrl( 'switch', __( 'Protect the form in this container', 'canvasly-lite' ), 'content', $sec, array( 'description' => __( 'Submissions of a Canvasly Form placed in the same container are rejected without a valid Turnstile token.', 'canvasly-lite' ) ) ),
			'theme'        => $this->ctrl( 'select', __( 'Theme', 'canvasly-lite' ), 'content', $sec, array( 'options' => $def + array( 'auto' => __( 'Auto', 'canvasly-lite' ), 'light' => __( 'Light', 'canvasly-lite' ), 'dark' => __( 'Dark', 'canvasly-lite' ) ) ) ),
			'size'         => $this->ctrl( 'select', __( 'Size', 'canvasly-lite' ), 'content', $sec, array( 'options' => $def + array( 'normal' => __( 'Normal (300×65)', 'canvasly-lite' ), 'flexible' => __( 'Flexible (full width)', 'canvasly-lite' ), 'compact' => __( 'Compact (150×140)', 'canvasly-lite' ) ) ) ),
			'appearance'   => $this->ctrl( 'select', __( 'Appearance', 'canvasly-lite' ), 'content', $sec, array( 'options' => $def + array( 'always' => __( 'Always visible', 'canvasly-lite' ), 'interaction-only' => __( 'Only when interaction is needed', 'canvasly-lite' ) ) ) ),
			'action'       => $this->ctrl( 'text', __( 'Action name', 'canvasly-lite' ), 'content', $sec, array( 'description' => __( 'Shown in Cloudflare analytics. Letters, digits, - and _ (max 32).', 'canvasly-lite' ) ) ),
			'language'     => $this->ctrl( 'text', __( 'Language', 'canvasly-lite' ), 'content', $sec, array( 'placeholder' => 'auto', 'description' => __( '"auto" or a code such as en, de, fr, es-es.', 'canvasly-lite' ) ) ),
			'align'        => $this->ctrl( 'choose', __( 'Alignment', 'canvasly-lite' ), 'style', __( 'Layout', 'canvasly-lite' ), array( 'options' => array( 'flex-start' => __( 'Left', 'canvasly-lite' ), 'center' => __( 'Center', 'canvasly-lite' ), 'flex-end' => __( 'Right', 'canvasly-lite' ) ), 'selectors' => array( '{{WRAPPER}} .lb-turnstile-wrap' => 'justify-content: {{VALUE}};' ) ) ),
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
				return '<div class="' . esc_attr( $this->cls( $s ) ) . ' lb-turnstile-missing"><p>' . esc_html__( 'Cloudflare Turnstile: add the site and secret keys under Canvasly → Settings → Integrations.', 'canvasly-lite' ) . '</p></div>';
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
