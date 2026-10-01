<?php
/**
 * XEditor Grid: a Div Block with CSS grid controls. Holds children.
 *
 * @package SidcraftSyntex
 */

namespace SidcraftSyntex\XEditor\Elements;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-xe-div-block.php';

class XeGrid extends XeDivBlock {
	public function type() {
		return 'xe_grid';
	}

	public function title() {
		return __( 'Grid', 'sidcraft-syntex' ) . ' (XEditor)';
	}

	public function icon() {
		return "\u{25A6}";
	}

	public function defaults() {
		return parent::defaults() + array(
			'columns'    => '3',
			'col_gap'    => '20px',
			'row_gap'    => '20px',
			'template'   => '',
			'rows'       => '',
			'align'      => 'stretch',
			'justify'    => 'stretch',
		);
	}

	protected function own_controls() {
		$sec  = __( 'Grid Layout', 'sidcraft-syntex' );
		$wrap = self::LOCAL;
		return parent::own_controls() + array(
			'columns'  => $this->ctrl( 'number', __( 'Columns', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'range' => array( 'min' => 1, 'max' => 12, 'step' => 1 ), 'selectors' => array( $wrap => 'grid-template-columns: repeat({{RAW}}, minmax(0, 1fr));' ) ) ),
			'template' => $this->ctrl( 'text', __( 'Custom Columns', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'placeholder' => '2fr 1fr', 'description' => __( 'Overrides Columns, e.g. "2fr 1fr" or "repeat(auto-fill, minmax(220px, 1fr))".', 'sidcraft-syntex' ), 'selectors' => array( $wrap => 'grid-template-columns: {{RAW}};' ) ) ),
			'rows'     => $this->ctrl( 'text', __( 'Rows', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'placeholder' => 'auto', 'selectors' => array( $wrap => 'grid-template-rows: {{RAW}};' ) ) ),
			'col_gap'  => $this->ctrl( 'slider', __( 'Column Gap', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'units' => array( 'px', 'em', 'rem', '%' ), 'range' => array( 'min' => 0, 'max' => 200 ), 'selectors' => array( $wrap => 'column-gap: {{VALUE}};' ) ) ),
			'row_gap'  => $this->ctrl( 'slider', __( 'Row Gap', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'units' => array( 'px', 'em', 'rem', '%' ), 'range' => array( 'min' => 0, 'max' => 200 ), 'selectors' => array( $wrap => 'row-gap: {{VALUE}};' ) ) ),
			'align'    => $this->ctrl( 'select', __( 'Align Items', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'stretch' => __( 'Stretch', 'sidcraft-syntex' ), 'start' => __( 'Start', 'sidcraft-syntex' ), 'center' => __( 'Center', 'sidcraft-syntex' ), 'end' => __( 'End', 'sidcraft-syntex' ) ), 'selectors' => array( $wrap => 'align-items: {{VALUE}};' ) ) ),
			'justify'  => $this->ctrl( 'select', __( 'Justify Items', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'options' => array( 'stretch' => __( 'Stretch', 'sidcraft-syntex' ), 'start' => __( 'Start', 'sidcraft-syntex' ), 'center' => __( 'Center', 'sidcraft-syntex' ), 'end' => __( 'End', 'sidcraft-syntex' ) ), 'selectors' => array( $wrap => 'justify-items: {{VALUE}};' ) ) ),
		);
	}
}
