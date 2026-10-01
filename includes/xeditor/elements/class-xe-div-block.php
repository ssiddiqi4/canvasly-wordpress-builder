<?php
/**
 * XEditor Div Block: the universal single-element box. Holds children.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\XEditor\Elements;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-xeditor-element.php';

class XeDivBlock extends XEditorElement {
	public function type() {
		return 'xe_div_block';
	}

	public function title() {
		return __( 'Div Block', 'sidcraft-page-builder' );
	}

	public function icon() {
		return "\u{25A2}";
	}

	public function supports_children() {
		return true;
	}

	protected function tags() {
		return array( 'div', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav', 'figure', 'a', 'span' );
	}

	public function defaults() {
		return array(
			'tag'     => 'div',
			'link'    => '',
			'new_tab' => false,
		);
	}

	protected function own_controls() {
		$sec = __( 'Element', 'sidcraft-page-builder' );
		return array(
			'tag'     => $this->tag_control( $sec ),
			'link'    => $this->ctrl( 'url', __( 'Link', 'sidcraft-page-builder' ), 'content', $sec, array( 'condition' => array( 'tag' => 'a' ), 'dynamic' => true, 'placeholder' => 'https:// or {{post.url}}' ) ),
			'new_tab' => $this->ctrl( 'switch', __( 'Open in new tab', 'sidcraft-page-builder' ), 'content', $sec, array( 'condition' => array( 'tag' => 'a' ) ) ),
		);
	}

	protected function root_attrs( array $s ) {
		if ( 'a' !== $this->root_tag( $s ) ) {
			return '';
		}
		$href = $this->href( $s['link'] ?? '' );
		$out  = ' href="' . esc_attr( '' !== $href ? $href : '#' ) . '"';
		if ( ! empty( $s['new_tab'] ) ) {
			$out .= ' target="_blank" rel="noopener"';
		}
		return $out;
	}

	protected function needs_group_role( array $s ) {
		return in_array( $this->root_tag( $s ), array( 'div', 'span', 'figure' ), true );
	}

	protected function inner( array $s, $children ) {
		return $children;
	}
}
