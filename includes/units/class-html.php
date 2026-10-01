<?php
namespace SidcraftPageBuilder\Units;

use SidcraftPageBuilder\Embed\OEmbed;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Html extends Unit {
	public function type() {
		return 'html';
	}
	public function title() {
		return __( 'HTML', 'sidcraft-page-builder' );
	}
	public function icon() {
		return '<>';
	}
	public function category() {
		return 'basic';
	}
	public function defaults() {
		return array( 'html' => '' );
	}
	public function controls() {
		return array( 'html' => 'code' );
	}
	public function render( $s, $children = '' ) {
		$raw  = (string) ( $s['html'] ?? '' );
		$trim = trim( $raw );
		if ( $trim !== '' && class_exists( OEmbed::class ) && OEmbed::is_url( $trim ) ) {
			$html = OEmbed::html( $trim );
			if ( $html !== '' ) {
				return '<div class="' . $this->cls( $s ) . ' lb-html lb-html-embed">' . $html . '</div>';
			}
		}
		if ( class_exists( '\\SidcraftPageBuilder\\Controls\\Code' ) ) {
			$raw = \SidcraftPageBuilder\Controls\Code::sanitize_html( $raw );
		} elseif ( class_exists( '\\SidcraftPageBuilder\\Templates\\ThemeChrome' ) ) {
			$raw = \SidcraftPageBuilder\Templates\ThemeChrome::safe_html( $raw );
		}
		return '<div class="' . $this->cls( $s ) . ' lb-html">' . $raw . '</div>';
	}
}
