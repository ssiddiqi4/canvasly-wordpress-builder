<?php
/**
 * XEditor Paragraph.
 *
 * @package SidcraftSyntex
 */

namespace SidcraftSyntex\XEditor\Elements;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-xeditor-element.php';

class XeParagraph extends XEditorElement {
	public function type() {
		return 'xe_paragraph';
	}

	public function title() {
		return __( 'Paragraph', 'sidcraft-syntex' );
	}

	public function icon() {
		return "\u{00B6}";
	}

	protected function tags() {
		return array( 'p', 'div', 'span', 'blockquote', 'small' );
	}

	public function defaults() {
		return array(
			'text' => __( 'Type your text here. XEditor elements print one clean element with your utility classes.', 'sidcraft-syntex' ),
			'tag'  => 'p',
		);
	}

	protected function own_controls() {
		$sec = __( 'Paragraph', 'sidcraft-syntex' );
		return array(
			'text' => $this->ctrl( 'textarea', __( 'Text', 'sidcraft-syntex' ), 'content', $sec, array( 'dynamic' => true, 'description' => __( 'Line breaks are kept. Basic inline HTML (strong, em, a, br, span, code) is allowed.', 'sidcraft-syntex' ) ) ),
			'tag'  => $this->tag_control( $sec ),
		) + $this->typography_controls();
	}

	protected function needs_group_role( array $s ) {
		return false;
	}

	protected function inner( array $s, $children ) {
		unset( $children );
		$allowed = array(
			'strong' => array(),
			'b'      => array(),
			'em'     => array(),
			'i'      => array(),
			'u'      => array(),
			'br'     => array(),
			'code'   => array(),
			'small'  => array(),
			'span'   => array( 'class' => true ),
			'a'      => array(
				'href'   => true,
				'target' => true,
				'rel'    => true,
			),
		);
		return nl2br( wp_kses( $this->text( $s['text'] ?? '' ), $allowed ), false );
	}
}
