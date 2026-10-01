<?php
/**
 * XEditor access controller (server side of the Pro guard).
 *
 * Loop Architecture elements are Sidcraft Syntex Pro features. This guard is the single
 * place that answers "may this node render / be edited?":
 *
 *   - Frontend: `sidcraft-syntex/unit/should_render` returns false for guarded nodes
 *     when Pro is not active, so nothing (wrapper, children, assets) is printed.
 *   - Editor:   the guard state is localized as `SidcraftSyntexData.xeditor.access`
 *     and the editor-side guard (assets/js/xeditor.js → XEditorAccess) blocks
 *     insert, select, drag and panel edits.
 *   - Data:     Lite registers lightweight placeholder units for the guarded types
 *     so saving a page while Pro is off never strips a user's loops.
 *
 * Pro reports its state through `SidcraftSyntexPro\License::is_active()`; add-ons or
 * tests can override with the `sidcraft-syntex/xeditor/pro_active` filter.
 *
 * @package SidcraftSyntex
 */

namespace SidcraftSyntex\XEditor;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XEditorAccess {
	/** Node types that require Sidcraft Syntex Pro. */
	const GUARDED = array( 'xe_loop', 'xe_loop_layout', 'xe_loop_item' );

	/** @var bool|null */
	private static $memo = null;

	public static function init() {
		add_filter( 'sidcraft-syntex/unit/should_render', array( self::class, 'should_render' ), 5, 2 );
	}

	/**
	 * Mirrors `SidcraftSyntexPro.isActive()` in the editor.
	 *
	 * @return bool
	 */
	public static function pro_active() {
		if ( null === self::$memo ) {
			$active = false;
			if ( class_exists( '\\SidcraftSyntexPro\\License' ) && method_exists( '\\SidcraftSyntexPro\\License', 'is_active' ) ) {
				$active = (bool) \SidcraftSyntexPro\License::is_active();
			}
			self::$memo = (bool) apply_filters( 'sidcraft-syntex/xeditor/pro_active', $active );
		}
		return self::$memo;
	}

	/** Reset memo (tests, license changes within one request). */
	public static function flush() {
		self::$memo = null;
	}

	/**
	 * @param string $type
	 * @return bool
	 */
	public static function is_guarded( $type ) {
		return in_array( sanitize_key( (string) $type ), self::guarded_types(), true );
	}

	/** @return string[] */
	public static function guarded_types() {
		$types = apply_filters( 'sidcraft-syntex/xeditor/guarded_types', self::GUARDED );
		return array_values( array_filter( array_map( 'sanitize_key', (array) $types ) ) );
	}

	/**
	 * True when this node, or anything inside it, needs Pro.
	 *
	 * @param array $node
	 * @return bool
	 */
	public static function uses_loop( $node ) {
		if ( ! is_array( $node ) ) {
			return false;
		}
		if ( self::is_guarded( $node['type'] ?? '' ) ) {
			return true;
		}
		foreach ( (array) ( $node['children'] ?? array() ) as $child ) {
			if ( self::uses_loop( $child ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Middleware for rendering.
	 *
	 * @param bool  $render
	 * @param array $node
	 * @return bool
	 */
	public static function should_render( $render, $node ) {
		if ( ! $render || ! is_array( $node ) ) {
			return $render;
		}
		if ( self::is_guarded( $node['type'] ?? '' ) && ! self::pro_active() ) {
			return false;
		}
		return $render;
	}

	/**
	 * Editor payload.
	 *
	 * @return array
	 */
	public static function editor_data() {
		return array(
			'proActive' => self::pro_active(),
			'guarded'   => self::guarded_types(),
			'message'   => __( 'XEditor Loop is a Sidcraft Syntex Pro feature. Activate a Pro license to insert, edit or render it.', 'sidcraft-syntex' ),
			'upgrade'   => function_exists( 'admin_url' ) ? admin_url( 'admin.php?page=sidcraft-syntex-pro-licensing' ) : '',
		);
	}
}
