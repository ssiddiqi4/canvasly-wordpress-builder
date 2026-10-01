<?php
/**
 * XEditor Flexbox: a Div Block with flex layout controls. Holds children.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\XEditor\Elements;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-xe-div-block.php';

class XeFlexbox extends XeDivBlock {
	public function type() {
		return 'xe_flexbox';
	}

	public function title() {
		return __( 'Flexbox', 'sidcraft-page-builder' );
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
		$sec  = __( 'Flex Layout', 'sidcraft-page-builder' );
		$wrap = self::LOCAL;
		return parent::own_controls() + array(
			'direction' => $this->ctrl( 'choose', __( 'Direction', 'sidcraft-page-builder' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'row' => __( 'Row', 'sidcraft-page-builder' ), 'column' => __( 'Column', 'sidcraft-page-builder' ), 'row-reverse' => __( 'Row reverse', 'sidcraft-page-builder' ), 'column-reverse' => __( 'Column reverse', 'sidcraft-page-builder' ) ), 'selectors' => array( $wrap => 'flex-direction: {{VALUE}};' ) ) ),
			'justify'   => $this->ctrl( 'select', __( 'Justify Content', 'sidcraft-page-builder' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'flex-start' => __( 'Start', 'sidcraft-page-builder' ), 'center' => __( 'Center', 'sidcraft-page-builder' ), 'flex-end' => __( 'End', 'sidcraft-page-builder' ), 'space-between' => __( 'Space between', 'sidcraft-page-builder' ), 'space-around' => __( 'Space around', 'sidcraft-page-builder' ), 'space-evenly' => __( 'Space evenly', 'sidcraft-page-builder' ) ), 'selectors' => array( $wrap => 'justify-content: {{VALUE}};' ) ) ),
			'align'     => $this->ctrl( 'select', __( 'Align Items', 'sidcraft-page-builder' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'stretch' => __( 'Stretch', 'sidcraft-page-builder' ), 'flex-start' => __( 'Start', 'sidcraft-page-builder' ), 'center' => __( 'Center', 'sidcraft-page-builder' ), 'flex-end' => __( 'End', 'sidcraft-page-builder' ), 'baseline' => __( 'Baseline', 'sidcraft-page-builder' ) ), 'selectors' => array( $wrap => 'align-items: {{VALUE}};' ) ) ),
			'wrap'      => $this->ctrl( 'select', __( 'Wrap', 'sidcraft-page-builder' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'wrap' => __( 'Wrap', 'sidcraft-page-builder' ), 'nowrap' => __( 'No wrap', 'sidcraft-page-builder' ) ), 'selectors' => array( $wrap => 'flex-wrap: {{VALUE}};' ) ) ),
			'gap'       => $this->ctrl( 'slider', __( 'Gap', 'sidcraft-page-builder' ), 'content', $sec, array( 'responsive' => true, 'units' => array( 'px', 'em', 'rem', '%' ), 'range' => array( 'min' => 0, 'max' => 200 ), 'selectors' => array( $wrap => 'gap: {{VALUE}};' ) ) ),
		);
	}
}
