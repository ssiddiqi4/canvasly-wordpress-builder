<?php
namespace SidcraftSyntex\Units;

use SidcraftSyntex\Embed\OEmbed;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Html extends Unit {
	public function type() {
		return 'html';
	}
	public function title() {
		return __( 'HTML', 'sidcraft-syntex' );
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
		if ( class_exists( '\\SidcraftSyntex\\Controls\\Code' ) ) {
			$raw = \SidcraftSyntex\Controls\Code::sanitize_html( $raw );
		} elseif ( class_exists( '\\SidcraftSyntex\\Templates\\ThemeChrome' ) ) {
			$raw = \SidcraftSyntex\Templates\ThemeChrome::safe_html( $raw );
		}
		return '<div class="' . $this->cls( $s ) . ' lb-html">' . $raw . '</div>';
	}
}
