<?php
/**
 * XEditor Flexbox: a Div Block with flex layout controls. Holds children.
 *
 * @package CanvaslyLite
 */

namespace CanvaslyLite\XEditor\Elements;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-xe-div-block.php';

class XeFlexbox extends XeDivBlock {
	public function type() {
		return 'xe_flexbox';
	}

	public function title() {
		return __( 'Flexbox', 'canvasly-lite' );
	}

	public function icon() {
		return "\u{21C6}";
	}

	public function defaults() {
		return parent::defaults() + array(
			'direction' => 'row',
			'justify'   => 'flex-start',
			'align'     => 'stretch',
			'wrap'      => 'wrap',
			'gap'       => '16px',
		);
	}

	protected function own_controls() {
		$sec  = __( 'Flex Layout', 'canvasly-lite' );
		$wrap = self::LOCAL;
		return parent::own_controls() + array(
			'direction' => $this->ctrl( 'choose', __( 'Direction', 'canvasly-lite' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'row' => __( 'Row', 'canvasly-lite' ), 'column' => __( 'Column', 'canvasly-lite' ), 'row-reverse' => __( 'Row reverse', 'canvasly-lite' ), 'column-reverse' => __( 'Column reverse', 'canvasly-lite' ) ), 'selectors' => array( $wrap => 'flex-direction: {{VALUE}};' ) ) ),
			'justify'   => $this->ctrl( 'select', __( 'Justify Content', 'canvasly-lite' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'flex-start' => __( 'Start', 'canvasly-lite' ), 'center' => __( 'Center', 'canvasly-lite' ), 'flex-end' => __( 'End', 'canvasly-lite' ), 'space-between' => __( 'Space between', 'canvasly-lite' ), 'space-around' => __( 'Space around', 'canvasly-lite' ), 'space-evenly' => __( 'Space evenly', 'canvasly-lite' ) ), 'selectors' => array( $wrap => 'justify-content: {{VALUE}};' ) ) ),
			'align'     => $this->ctrl( 'select', __( 'Align Items', 'canvasly-lite' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'stretch' => __( 'Stretch', 'canvasly-lite' ), 'flex-start' => __( 'Start', 'canvasly-lite' ), 'center' => __( 'Center', 'canvasly-lite' ), 'flex-end' => __( 'End', 'canvasly-lite' ), 'baseline' => __( 'Baseline', 'canvasly-lite' ) ), 'selectors' => array( $wrap => 'align-items: {{VALUE}};' ) ) ),
			'wrap'      => $this->ctrl( 'select', __( 'Wrap', 'canvasly-lite' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'wrap' => __( 'Wrap', 'canvasly-lite' ), 'nowrap' => __( 'No wrap', 'canvasly-lite' ) ), 'selectors' => array( $wrap => 'flex-wrap: {{VALUE}};' ) ) ),
			'gap'       => $this->ctrl( 'slider', __( 'Gap', 'canvasly-lite' ), 'content', $sec, array( 'responsive' => true, 'units' => array( 'px', 'em', 'rem', '%' ), 'range' => array( 'min' => 0, 'max' => 200 ), 'selectors' => array( $wrap => 'gap: {{VALUE}};' ) ) ),
		);
	}
}
