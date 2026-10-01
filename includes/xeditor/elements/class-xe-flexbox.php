<?php
/**
 * XEditor Flexbox: a Div Block with flex layout controls. Holds children.
 *
 * @package SidcraftSyntex
 */

namespace SidcraftSyntex\XEditor\Elements;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-xe-div-block.php';

class XeFlexbox extends XeDivBlock {
	public function type() {
		return 'xe_flexbox';
	}

	public function title() {
		return __( 'Flexbox', 'sidcraft-syntex' );
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
		$sec  = __( 'Flex Layout', 'sidcraft-syntex' );
		$wrap = self::LOCAL;
		return parent::own_controls() + array(
			'direction' => $this->ctrl( 'choose', __( 'Direction', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'row' => __( 'Row', 'sidcraft-syntex' ), 'column' => __( 'Column', 'sidcraft-syntex' ), 'row-reverse' => __( 'Row reverse', 'sidcraft-syntex' ), 'column-reverse' => __( 'Column reverse', 'sidcraft-syntex' ) ), 'selectors' => array( $wrap => 'flex-direction: {{VALUE}};' ) ) ),
			'justify'   => $this->ctrl( 'select', __( 'Justify Content', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'flex-start' => __( 'Start', 'sidcraft-syntex' ), 'center' => __( 'Center', 'sidcraft-syntex' ), 'flex-end' => __( 'End', 'sidcraft-syntex' ), 'space-between' => __( 'Space between', 'sidcraft-syntex' ), 'space-around' => __( 'Space around', 'sidcraft-syntex' ), 'space-evenly' => __( 'Space evenly', 'sidcraft-syntex' ) ), 'selectors' => array( $wrap => 'justify-content: {{VALUE}};' ) ) ),
			'align'     => $this->ctrl( 'select', __( 'Align Items', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'stretch' => __( 'Stretch', 'sidcraft-syntex' ), 'flex-start' => __( 'Start', 'sidcraft-syntex' ), 'center' => __( 'Center', 'sidcraft-syntex' ), 'flex-end' => __( 'End', 'sidcraft-syntex' ), 'baseline' => __( 'Baseline', 'sidcraft-syntex' ) ), 'selectors' => array( $wrap => 'align-items: {{VALUE}};' ) ) ),
			'wrap'      => $this->ctrl( 'select', __( 'Wrap', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'wrap' => __( 'Wrap', 'sidcraft-syntex' ), 'nowrap' => __( 'No wrap', 'sidcraft-syntex' ) ), 'selectors' => array( $wrap => 'flex-wrap: {{VALUE}};' ) ) ),
			'gap'       => $this->ctrl( 'slider', __( 'Gap', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'units' => array( 'px', 'em', 'rem', '%' ), 'range' => array( 'min' => 0, 'max' => 200 ), 'selectors' => array( $wrap => 'gap: {{VALUE}};' ) ) ),
		);
	}
}
