<?php
/**
 * Base class for XEditor Atomic Elements.
 *
 * An atomic element is ONE HTML element on the frontend: the renderer merges the
 * node shell (id, data attributes, interactions) onto the element's own root tag
 * instead of wrapping it in an extra <div>. Styling is class-first:
 *
 *   1. Utility classes from the Classes Manager (settings.xe_classes, stacked).
 *   2. Optional local styles, emitted inside :where() so they never outrank (1).
 *
 * Subclasses implement type(), title(), icon(), own_controls() and markup().
 *
 * @package CanvaslyLite
 */

namespace CanvaslyLite\XEditor\Elements;

use CanvaslyLite\Units\Unit;
use CanvaslyLite\XEditor\XEditorClassesManager;
use CanvaslyLite\XEditor\XEditorContext;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class XEditorElement extends Unit {
	/** Local-style selector: zero specificity, matches editor shell child and flattened frontend element. */
	const LOCAL = ':where({{WRAPPER}}.xe-el,{{WRAPPER}}>.xe-el)';

	public function category() {
		return 'xeditor';
	}

	public function source() {
		return 'lite';
	}

	/** Renderer contract: the node shell is merged onto this element's root tag. */
	public function single_element() {
		return true;
	}

	/** Renderer contract: aria-label/role are printed by render(), not the shell. */
	public function handles_aria() {
		return true;
	}

	public function keywords() {
		return array( $this->type(), $this->title(), 'xeditor', 'atomic' );
	}

	/** Allowed root tags. First entry is the default. */
	protected function tags() {
		return array( 'div' );
	}

	/** Content controls specific to the element. */
	abstract protected function own_controls();

	/**
	 * Inner HTML (children or text). The base class prints the root tag.
	 *
	 * @param array  $s
	 * @param string $children
	 * @return string
	 */
	abstract protected function inner( array $s, $children );

	public function styles( $settings = array() ) {
		unset( $settings );
		return array( 'canvasly-xeditor' );
	}

	public function controls() {
		return $this->own_controls() + $this->local_style_controls();
	}

	/**
	 * Lean control set: element controls + attribute controls. Classic shared
	 * style controls are omitted on purpose; XEditor styles through classes.
	 */
	protected function base_controls() {
		$shared = self::shared_controls();
		$keep   = array( 'css_id', 'css_class', 'aria_label', 'role', 'html_attributes', 'custom_css', 'xe_classes', 'hide_desktop', 'hide_tablet', 'hide_mobile' );
		$out    = $this->controls();
		foreach ( $keep as $k ) {
			if ( isset( $shared[ $k ] ) && ! isset( $out[ $k ] ) ) {
				$out[ $k ] = $shared[ $k ];
			}
		}
		return $out;
	}

	/**
	 * Local (element-level) style controls. Values go through :where() selectors.
	 *
	 * @return array
	 */
	protected function local_style_controls() {
		$sec = __( 'Local Style', 'canvasly-lite' );
		$len = array( 'px', '%', 'em', 'rem', 'vw', 'vh' );
		return array(
			'xe_width'      => $this->ctrl( 'slider', __( 'Width', 'canvasly-lite' ), 'style', $sec, array( 'responsive' => true, 'units' => $len, 'range' => array( 'min' => 0, 'max' => 1600 ), 'selectors' => array( self::LOCAL => 'width: {{VALUE}};' ) ) ),
			'xe_max_width'  => $this->ctrl( 'slider', __( 'Max Width', 'canvasly-lite' ), 'style', $sec, array( 'responsive' => true, 'units' => $len, 'range' => array( 'min' => 0, 'max' => 2000 ), 'selectors' => array( self::LOCAL => 'max-width: {{VALUE}};' ) ) ),
			'xe_min_height' => $this->ctrl( 'slider', __( 'Min Height', 'canvasly-lite' ), 'style', $sec, array( 'responsive' => true, 'units' => $len, 'range' => array( 'min' => 0, 'max' => 1200 ), 'selectors' => array( self::LOCAL => 'min-height: {{VALUE}};' ) ) ),
			'xe_padding'    => $this->ctrl( 'dimensions', __( 'Padding', 'canvasly-lite' ), 'style', $sec, array( 'responsive' => true, 'selectors' => array( self::LOCAL => 'padding: {{VALUE}};' ) ) ),
			'xe_margin'     => $this->ctrl( 'dimensions', __( 'Margin', 'canvasly-lite' ), 'style', $sec, array( 'responsive' => true, 'selectors' => array( self::LOCAL => 'margin: {{VALUE}};' ) ) ),
			'xe_color'      => $this->ctrl( 'color', __( 'Text Color', 'canvasly-lite' ), 'style', $sec, array( 'selectors' => array( self::LOCAL => 'color: {{VALUE}};' ) ) ),
			'xe_background' => $this->ctrl( 'color', __( 'Background', 'canvasly-lite' ), 'style', $sec, array( 'selectors' => array( self::LOCAL => 'background-color: {{VALUE}};' ) ) ),
			'xe_radius'     => $this->ctrl( 'dimensions', __( 'Border Radius', 'canvasly-lite' ), 'style', $sec, array( 'selectors' => array( self::LOCAL => 'border-radius: {{VALUE}};' ) ) ),
		);
	}

	/**
	 * Typography controls for text elements.
	 *
	 * @return array
	 */
	protected function typography_controls() {
		$sec = __( 'Local Style', 'canvasly-lite' );
		return array(
			'xe_typography' => $this->ctrl( 'typography', __( 'Typography', 'canvasly-lite' ), 'style', $sec, array( 'selectors' => array( self::LOCAL => '{{VALUE}}' ) ) ),
			'xe_align'      => $this->ctrl(
				'choose',
				__( 'Alignment', 'canvasly-lite' ),
				'style',
				$sec,
				array(
					'responsive' => true,
					'options'    => array(
						'left'    => __( 'Left', 'canvasly-lite' ),
						'center'  => __( 'Center', 'canvasly-lite' ),
						'right'   => __( 'Right', 'canvasly-lite' ),
						'justify' => __( 'Justify', 'canvasly-lite' ),
					),
					'selectors'  => array( self::LOCAL => 'text-align: {{VALUE}};' ),
				)
			),
		);
	}

	/**
	 * Tag select control.
	 *
	 * @param string $section
	 * @return array
	 */
	protected function tag_control( $section ) {
		$opts = array();
		foreach ( $this->tags() as $t ) {
			$opts[ $t ] = strtoupper( $t );
		}
		return $this->ctrl( 'select', __( 'HTML Tag', 'canvasly-lite' ), 'content', $section, array( 'options' => $opts, 'default' => $this->tags()[0] ) );
	}

	/**
	 * @param array $s
	 * @return string
	 */
	protected function root_tag( array $s ) {
		$tag = sanitize_key( (string) ( $s['tag'] ?? '' ) );
		return in_array( $tag, $this->tags(), true ) ? $tag : $this->tags()[0];
	}

	/**
	 * Element classes: `xe-el xe-{type}` + stacked utility classes + CSS classes.
	 *
	 * @param array $s
	 * @return string
	 */
	protected function element_classes( array $s ) {
		$c = 'xe-el xe-' . str_replace( '_', '-', preg_replace( '/^xe_/', '', $this->type() ) );
		return trim( $c . ' ' . $this->cls( $s ) );
	}

	/**
	 * Extra root attributes (href, src ...). Values must already be escaped.
	 *
	 * @param array $s
	 * @return string
	 */
	protected function root_attrs( array $s ) {
		unset( $s );
		return '';
	}

	/**
	 * ARIA on the element itself (valid because the element has a real role).
	 *
	 * @param array $s
	 * @return string
	 */
	protected function aria( array $s ) {
		$out   = '';
		$label = trim( (string) ( $s['aria_label'] ?? '' ) );
		$role  = sanitize_key( (string) ( $s['role'] ?? '' ) );
		if ( '' !== $role ) {
			$out .= ' role="' . esc_attr( $role ) . '"';
		} elseif ( '' !== $label && $this->needs_group_role( $s ) ) {
			// aria-label on a generic div/span is ignored by assistive tech; name it as a group.
			$out .= ' role="group"';
		}
		if ( '' !== $label ) {
			$out .= ' aria-label="' . esc_attr( XEditorContext::apply( $label ) ) . '"';
		}
		return $out;
	}

	/**
	 * @param array $s
	 * @return bool
	 */
	protected function needs_group_role( array $s ) {
		return in_array( $this->root_tag( $s ), array( 'div', 'span', 'p' ), true );
	}

	/**
	 * Custom attributes (aria-*, data-*, title, rel, download) from the Attributes section.
	 *
	 * @param array $s
	 * @return string
	 */
	protected function custom_attrs( array $s ) {
		$copy = $s;
		unset( $copy['aria_label'], $copy['role'] );
		return parent::attrs( $copy );
	}

	/**
	 * Shell attributes: aria is printed on the element, so the shell only carries custom attributes.
	 *
	 * @param array $s
	 * @return string
	 */
	public function attrs( $s ) {
		unset( $s );
		return '';
	}

	public function render( $settings, $children = '' ) {
		$s   = array_merge( $this->get_defaults(), is_array( $settings ) ? $settings : array() );
		$tag = $this->root_tag( $s );
		$open = '<' . $tag . ' class="' . esc_attr( $this->element_classes( $s ) ) . '"' . $this->root_attrs( $s ) . $this->aria( $s ) . $this->custom_attrs( $s ) . '>';
		if ( in_array( $tag, array( 'img', 'hr', 'input' ), true ) ) {
			return $open;
		}
		return $open . $this->inner( $s, is_string( $children ) ? $children : '' ) . '</' . $tag . '>';
	}

	/**
	 * Token-aware plain text.
	 *
	 * @param mixed $v
	 * @return string
	 */
	protected function text( $v ) {
		return XEditorContext::apply( $v );
	}

	/**
	 * Safe href (tokens resolved, javascript: stripped, #anchors supported).
	 *
	 * @param mixed $v
	 * @return string
	 */
	protected function href( $v ) {
		return self::link_href( XEditorContext::apply( $v ) );
	}

	/**
	 * Flat accessor for responsive-or-scalar settings.
	 *
	 * @param mixed $v
	 * @return string
	 */
	protected function flat( $v ) {
		if ( is_array( $v ) ) {
			$v = $v['desktop'] ?? reset( $v );
		}
		return is_scalar( $v ) ? (string) $v : '';
	}

	/** Stack helper for subclasses. */
	protected function stack( array $s ) {
		return XEditorClassesManager::stack( $s['xe_classes'] ?? array() );
	}
}
