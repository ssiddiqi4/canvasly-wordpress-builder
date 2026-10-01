<?php
/**
 * XEditor Button: <a> when a link is set, otherwise <button type="button">.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\XEditor\Elements;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-xeditor-element.php';

class XeButton extends XEditorElement {
	public function type() {
		return 'xe_button';
	}

	public function title() {
		return __( 'Button', 'sidcraft-page-builder' ) . ' (XEditor)';
	}

	public function icon() {
		return "\u{25AD}";
	}

	public function uses_button() {
		return true;
	}

	protected function tags() {
		return array( 'a', 'button' );
	}

	public function defaults() {
		return array(
			'text'     => __( 'Click here', 'sidcraft-page-builder' ),
			'link'     => '',
			'new_tab'  => false,
			'nofollow' => false,
		);
	}

	protected function own_controls() {
		$sec = __( 'Button', 'sidcraft-page-builder' );
		return array(
			'text'     => $this->ctrl( 'text', __( 'Text', 'sidcraft-page-builder' ), 'content', $sec, array( 'dynamic' => true ) ),
			'link'     => $this->ctrl( 'url', __( 'Link', 'sidcraft-page-builder' ), 'content', $sec, array( 'dynamic' => true, 'placeholder' => 'https:// or {{post.url}}', 'description' => __( 'Without a link the element prints a <button> for scripts and interactions.', 'sidcraft-page-builder' ) ) ),
			'new_tab'  => $this->ctrl( 'switch', __( 'Open in new tab', 'sidcraft-page-builder' ), 'content', $sec ),
			'nofollow' => $this->ctrl( 'switch', __( 'Add nofollow', 'sidcraft-page-builder' ), 'content', $sec ),
		) + $this->typography_controls();
	}

	protected function root_tag( array $s ) {
		return trim( (string) ( $s['link'] ?? '' ) ) !== '' ? 'a' : 'button';
	}

	protected function needs_group_role( array $s ) {
		return false;
	}

	protected function root_attrs( array $s ) {
		if ( 'button' === $this->root_tag( $s ) ) {
			return ' type="button"';
		}
		$href = $this->href( $s['link'] ?? '' );
		$out  = ' href="' . esc_attr( '' !== $href ? $href : '#' ) . '"';
		$rel  = array();
		if ( ! empty( $s['new_tab'] ) ) {
			$out  .= ' target="_blank"';
			$rel[] = 'noopener';
		}
		if ( ! empty( $s['nofollow'] ) ) {
			$rel[] = 'nofollow';
		}
		return $rel ? $out . ' rel="' . esc_attr( implode( ' ', $rel ) ) . '"' : $out;
	}

	protected function inner( array $s, $children ) {
		unset( $children );
		return esc_html( $this->text( $s['text'] ?? '' ) );
	}
}
