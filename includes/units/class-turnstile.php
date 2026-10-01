<?php
/**
 * Cloudflare Turnstile unit (Sidcraft Page Builder).
 *
 * Place it next to (or inside the same container as) a Sidcraft Page Builder Form: the form's
 * submission then requires a valid Turnstile token (verified server-side with
 * Siteverify). It can also sit alone as a visible "verify you are human" widget.
 *
 * Keys: Sidcraft Page Builder → Settings → Integrations → Cloudflare Turnstile.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Units;

use SidcraftPageBuilder\Integrations\Turnstile as TurnstileService;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Turnstile extends Unit {
	public function type() {
		return 'turnstile';
	}

	public function title() {
		return __( 'Cloudflare Turnstile', 'sidcraft-page-builder' );
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
			'action'       => 'sidcraft_page_builder_form',
			'language'     => 'auto',
			'align'        => 'flex-start',
		);
	}

	public function controls() {
		$sec = __( 'Turnstile', 'sidcraft-page-builder' );
		$def = array( '' => __( 'Site default', 'sidcraft-page-builder' ) );
		return array(
			'protect_form' => $this->ctrl( 'switch', __( 'Protect the form in this container', 'sidcraft-page-builder' ), 'content', $sec, array( 'description' => __( 'Submissions of a Sidcraft Page Builder Form placed in the same container are rejected without a valid Turnstile token.', 'sidcraft-page-builder' ) ) ),
			'theme'        => $this->ctrl( 'select', __( 'Theme', 'sidcraft-page-builder' ), 'content', $sec, array( 'options' => $def + array( 'auto' => __( 'Auto', 'sidcraft-page-builder' ), 'light' => __( 'Light', 'sidcraft-page-builder' ), 'dark' => __( 'Dark', 'sidcraft-page-builder' ) ) ) ),
			'size'         => $this->ctrl( 'select', __( 'Size', 'sidcraft-page-builder' ), 'content', $sec, array( 'options' => $def + array( 'normal' => __( 'Normal (300×65)', 'sidcraft-page-builder' ), 'flexible' => __( 'Flexible (full width)', 'sidcraft-page-builder' ), 'compact' => __( 'Compact (150×140)', 'sidcraft-page-builder' ) ) ) ),
			'appearance'   => $this->ctrl( 'select', __( 'Appearance', 'sidcraft-page-builder' ), 'content', $sec, array( 'options' => $def + array( 'always' => __( 'Always visible', 'sidcraft-page-builder' ), 'interaction-only' => __( 'Only when interaction is needed', 'sidcraft-page-builder' ) ) ) ),
			'action'       => $this->ctrl( 'text', __( 'Action name', 'sidcraft-page-builder' ), 'content', $sec, array( 'description' => __( 'Shown in Cloudflare analytics. Letters, digits, - and _ (max 32).', 'sidcraft-page-builder' ) ) ),
			'language'     => $this->ctrl( 'text', __( 'Language', 'sidcraft-page-builder' ), 'content', $sec, array( 'placeholder' => 'auto', 'description' => __( '"auto" or a code such as en, de, fr, es-es.', 'sidcraft-page-builder' ) ) ),
			'align'        => $this->ctrl( 'choose', __( 'Alignment', 'sidcraft-page-builder' ), 'style', __( 'Layout', 'sidcraft-page-builder' ), array( 'options' => array( 'flex-start' => __( 'Left', 'sidcraft-page-builder' ), 'center' => __( 'Center', 'sidcraft-page-builder' ), 'flex-end' => __( 'Right', 'sidcraft-page-builder' ) ), 'selectors' => array( '{{WRAPPER}} .lb-turnstile-wrap' => 'justify-content: {{VALUE}};' ) ) ),
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
				return '<div class="' . esc_attr( $this->cls( $s ) ) . ' lb-turnstile-missing"><p>' . esc_html__( 'Cloudflare Turnstile: add the site and secret keys under Sidcraft Page Builder → Settings → Integrations.', 'sidcraft-page-builder' ) . '</p></div>';
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
