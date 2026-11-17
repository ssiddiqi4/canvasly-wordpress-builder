<?php
namespace SidcraftPageBuilder\Rendering;

use SidcraftPageBuilder\Design\Components;
use SidcraftPageBuilder\Design\Interactions;
use SidcraftPageBuilder\Design\Optimize;
use SidcraftPageBuilder\Units\CollectionLoop;
use SidcraftPageBuilder\Units\Unit;
use SidcraftPageBuilder\Units\UnitRegistry;
use SidcraftPageBuilder\Templates\TemplateEmbed;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Collects script/style handles declared by units on a document tree and
 * enqueues only those the current page uses. Replaces the hardcoded
 * FrontendRenderer::SCRIPTED_TYPES list.
 *
 * A post's own document goes through UnitMap (enqueue_post), which keeps the
 * result per post so a page view does not walk the tree again. Unit families'
 * CSS (StyleChunks) arrives here as style handles from Unit::get_styles().
 */
class FrontendAssets {
	const SCRIPT = 'sidcraft-page-builder-frontend';
	const STYLE  = 'sidcraft-page-builder-frontend';

	/**
	 * Walk results for this request, keyed by tree + post id.
	 *
	 * @var array<string,array>
	 */
	private static $walked = array();

	/** Forget walk results (tests, or after units change mid-request). */
	public static function reset_runtime() {
		self::$walked = array();
	}

	/**
	 * Unique script and style handles needed by `$nodes`.
	 *
	 * @param array $nodes Document root (or any subtree).
	 * @return array{scripts:string[],styles:string[]}
	 */
	public static function collect( $nodes, $post_id = 0 ) {
		return self::collect_tree( $nodes, $post_id, function_exists( 'has_filter' ) && has_filter( 'sidcraft_page_builder_unit_should_render' ) );
	}

	/**
	 * Handles for every unit in `$nodes`, including units display conditions
	 * hide for this visitor, plus the unit types found. Used for the cached map.
	 *
	 * @param array $nodes
	 * @param int   $post_id
	 * @return array{scripts:string[],styles:string[],types:string[]}
	 */
	public static function collect_all( $nodes, $post_id = 0 ) {
		return self::collect_tree( $nodes, $post_id, false );
	}

	/**
	 * @param array $nodes
	 * @param int   $post_id
	 * @param bool  $respect Leave out nodes `should_render` rejects.
	 * @return array{scripts:string[],styles:string[],types:string[]}
	 */
	private static function collect_tree( $nodes, $post_id, $respect ) {
		$post_id = absint( $post_id );
		$nodes   = is_array( $nodes ) ? $nodes : array();
		// A singular page collects the same tree from wp_enqueue_scripts and again from
		// the_content. Walking it asks every unit for its handles (Pro widgets build a
		// full widget for that), so keep the walk result for the request.
		$key = md5( serialize( array( $nodes, $post_id, $respect ) ) );
		if ( isset( self::$walked[ $key ] ) ) {
			list( $out, $nodes ) = self::$walked[ $key ];
		} else {
			$scripts = array();
			$styles  = array();
			$seen    = array();
			$types   = array();
			if ( $respect ) {
				$nodes = self::omit_hidden( $nodes, $post_id );
			}
			self::walk( $nodes, $scripts, $styles, $seen, $post_id, $respect, $types );
			if ( class_exists( Interactions::class ) && Interactions::has( $nodes ) ) {
				$scripts[ self::SCRIPT ] = true;
			}
			if ( class_exists( Optimize::class ) && Optimize::needs_script( $nodes ) ) {
				$scripts[ self::SCRIPT ] = true;
			}
			$out = array(
				'scripts' => array_keys( $scripts ),
				'styles'  => array_keys( $styles ),
				'types'   => array_keys( $types ),
			);
			if ( count( self::$walked ) >= 32 ) {
				self::$walked = array();
			}
			self::$walked[ $key ] = array( $out, $nodes );
		}
		$filtered = apply_filters( 'sidcraft_page_builder_frontend_assets', $out, $nodes );
		if ( ! is_array( $filtered ) ) {
			return $out;
		}
		return array(
			'scripts' => Unit::normalize_handles( $filtered['scripts'] ?? array() ),
			'styles'  => Unit::normalize_handles( $filtered['styles'] ?? array() ),
			'types'   => array_values( array_map( 'strval', (array) ( $filtered['types'] ?? $out['types'] ) ) ),
		);
	}

	/**
	 * Enqueue the assets of a post's own document from its cached unit map.
	 *
	 * @param int   $post_id
	 * @param array $nodes The post's visible nodes.
	 * @return void
	 */
	public static function enqueue_post( $post_id, array $nodes ) {
		if ( ! class_exists( UnitMap::class ) ) {
			self::enqueue( $nodes, $post_id );
			return;
		}
		self::enqueue_handles( UnitMap::assets( $post_id, $nodes ) );
	}

	/**
	 * Enqueue collected handles. Unknown/unregistered handles are skipped by WP.
	 *
	 * @param array $nodes
	 * @param int   $post_id
	 */
	public static function enqueue( $nodes, $post_id = 0 ) {
		if ( ! function_exists( 'wp_enqueue_script' ) ) {
			return;
		}
		self::enqueue_handles( self::collect( $nodes, $post_id ) );
	}

	/**
	 * @param array{scripts:string[],styles:string[]} $assets
	 * @return void
	 */
	private static function enqueue_handles( array $assets ) {
		if ( ! function_exists( 'wp_enqueue_script' ) ) {
			return;
		}
		foreach ( (array) ( $assets['styles'] ?? array() ) as $handle ) {
			wp_enqueue_style( $handle );
		}
		foreach ( (array) ( $assets['scripts'] ?? array() ) as $handle ) {
			wp_enqueue_script( $handle );
		}
	}

	/**
	 * True when the core frontend bundle is among the collected scripts.
	 *
	 * @param array $nodes
	 * @param int   $post_id
	 */
	public static function needs_script( $nodes, $post_id = 0 ) {
		return in_array( self::SCRIPT, self::collect( $nodes, $post_id )['scripts'], true );
	}

	/**
	 * @param array             $nodes
	 * @param array<string,bool> $scripts
	 * @param array<string,bool> $styles
	 * @param array<int,bool>    $seen Template ids already walked.
	 * @param int                $post_id
	 * @param bool               $respect Skip nodes `should_render` rejects, including embeds.
	 * @param array<string,bool> $types Unit types found.
	 */
	private static function walk( $nodes, &$scripts, &$styles, &$seen, $post_id = 0, $respect = false, &$types = array() ) {
		$reg = class_exists( UnitRegistry::class ) ? UnitRegistry::instance() : null;
		foreach ( (array) $nodes as $n ) {
			if ( ! is_array( $n ) ) {
				continue;
			}
			if ( $respect && class_exists( FrontendRenderer::class ) && ! FrontendRenderer::should_render( $n, $post_id ) ) {
				continue;
			}
			$s    = is_array( $n['settings'] ?? null ) ? $n['settings'] : array();
			$type = (string) ( $n['type'] ?? '' );
			if ( '' !== $type ) {
				$types[ $type ] = true;
			}
			$el   = ( $reg && $type !== '' && method_exists( $reg, 'get' ) ) ? $reg->get( $type ) : null;
			if ( $el && method_exists( $el, 'get_scripts' ) ) {
				foreach ( $el->get_scripts( $s ) as $h ) {
					$scripts[ $h ] = true;
				}
			} elseif ( class_exists( Unit::class ) && Unit::settings_need_frontend( $s ) ) {
				$scripts[ self::SCRIPT ] = true;
			}
			if ( $el && method_exists( $el, 'get_styles' ) ) {
				foreach ( $el->get_styles( $s ) as $h ) {
					$styles[ $h ] = true;
				}
			}
			$tid = self::embedded_template( $type, $s );
			if ( $tid && empty( $seen[ $tid ] ) ) {
				$seen[ $tid ] = true;
				$doc          = class_exists( TemplateEmbed::class ) ? TemplateEmbed::document( $tid ) : null;
				if ( $doc && ! empty( $doc['root'] ) ) {
					self::walk( $doc['root'], $scripts, $styles, $seen, $post_id, $respect, $types );
				}
			}
			// A component renders its own stored document.
			$cid = 'component' === $type ? absint( $s['component_id'] ?? 0 ) : 0;
			if ( $cid && empty( $seen[ 'c' . $cid ] ) && class_exists( Components::class ) ) {
				$seen[ 'c' . $cid ] = true;
				$component          = Components::get( $cid );
				if ( is_array( $component ) && ! empty( $component['document']['root'] ) ) {
					self::walk( $component['document']['root'], $scripts, $styles, $seen, $post_id, $respect, $types );
				}
			}
			if ( ! empty( $n['children'] ) ) {
				self::walk( $n['children'], $scripts, $styles, $seen, $post_id, $respect, $types );
			}
		}
	}

	/**
	 * Template id a node embeds, including a loop-item template chosen by
	 * `sidcraft_page_builder_loop_template_id`.
	 *
	 * @param string $type
	 * @param array  $settings
	 * @return int
	 */
	private static function embedded_template( $type, array $settings ) {
		if ( 'template' === $type ) {
			return absint( $settings['template_id'] ?? 0 );
		}
		if ( 'collection_loop' === $type && class_exists( CollectionLoop::class ) ) {
			return CollectionLoop::embedded_template_id( $settings );
		}
		return 0;
	}

	/**
	 * Drop nodes (and their descendants) that `should_render` rejects.
	 *
	 * @param array $nodes
	 * @param int   $post_id
	 * @return array
	 */
	private static function omit_hidden( $nodes, $post_id ) {
		$out = array();
		foreach ( (array) $nodes as $n ) {
			if ( ! is_array( $n ) ) {
				continue;
			}
			if ( class_exists( FrontendRenderer::class ) && ! FrontendRenderer::should_render( $n, $post_id ) ) {
				continue;
			}
			if ( ! empty( $n['children'] ) && is_array( $n['children'] ) ) {
				$n['children'] = self::omit_hidden( $n['children'], $post_id );
			}
			$out[] = $n;
		}
		return $out;
	}
}
