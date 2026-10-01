<?php
/**
 * XEditor Heading.
 *
 * @package SidcraftSyntex
 */

namespace SidcraftSyntex\XEditor\Elements;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-xeditor-element.php';

class XeHeading extends XEditorElement {
	public function type() {
		return 'xe_heading';
	}

	public function title() {
		return __( 'Heading', 'sidcraft-syntex' ) . ' (XEditor)';
	}

	public function icon() {
		return 'H';
	}

	protected function tags() {
		return array( 'h2', 'h1', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span' );
	}

	public function defaults() {
		return array(
			'text' => __( 'Add your heading', 'sidcraft-syntex' ),
			'tag'  => 'h2',
			'link' => '',
		);
	}

	protected function own_controls() {
		$sec = __( 'Heading', 'sidcraft-syntex' );
		return array(
			'text' => $this->ctrl( 'textarea', __( 'Title', 'sidcraft-syntex' ), 'content', $sec, array( 'dynamic' => true, 'description' => __( 'Tokens such as {{post.title}} work inside an XEditor Loop.', 'sidcraft-syntex' ) ) ),
			'tag'  => $this->tag_control( $sec ),
			'link' => $this->ctrl( 'url', __( 'Link', 'sidcraft-syntex' ), 'content', $sec, array( 'dynamic' => true, 'placeholder' => 'https:// or {{post.url}}' ) ),
		) + $this->typography_controls();
	}

	protected function needs_group_role( array $s ) {
		return false;
	}

	protected function inner( array $s, $children ) {
		unset( $children );
		$text = esc_html( $this->text( $s['text'] ?? '' ) );
		$href = trim( (string) ( $s['link'] ?? '' ) ) !== '' ? $this->href( $s['link'] ) : '';
		return '' !== $href ? '<a href="' . esc_attr( $href ) . '">' . $text . '</a>' : $text;
	}
}
