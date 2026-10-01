<?php
/**
 * XEditorEngine — boots the unified, CSS-first XEditor layer of Sidcraft Page Builder.
 *
 * Responsibilities:
 *   - registers the Atomic Elements (Div Block, Flexbox, Grid, Heading, Paragraph,
 *     Image, Button) and the Loop data model (engine supplied by Sidcraft Builder Pro);
 *   - registers the `xe_classes` control type (class stacking on every unit);
 *   - exposes REST routes for the Classes & Variables Manager;
 *   - enqueues the editor module (assets/js/xeditor.js) and localizes its data;
 *   - prints the compiled `--xe-var-*` / `.xe-class-*` stylesheet on the frontend.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\XEditor;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-xeditor-classes-manager.php';
require_once __DIR__ . '/class-xeditor-context.php';
require_once __DIR__ . '/class-xeditor-access.php';

class XEditorEngine {
	const VERSION      = '1.0.0';
	const STYLE_HANDLE = 'sidcraft-page-builder-xeditor';

	/** @var bool */
	private static $booted = false;

	/**
	 * Element type => [file, class]. Files live in includes/xeditor/.
	 *
	 * @return array<string,array{0:string,1:string}>
	 */
	public static function elements() {
		$el = 'elements/';
		$ns = 'SidcraftPageBuilder\\XEditor\\Elements\\';
		$lp = 'SidcraftPageBuilder\\XEditor\\';
		return array(
			'xe_div_block'   => array( $el . 'class-xe-div-block.php', $ns . 'XeDivBlock' ),
			'xe_flexbox'     => array( $el . 'class-xe-flexbox.php', $ns . 'XeFlexbox' ),
			'xe_grid'        => array( $el . 'class-xe-grid.php', $ns . 'XeGrid' ),
			'xe_heading'     => array( $el . 'class-xe-heading.php', $ns . 'XeHeading' ),
			'xe_paragraph'   => array( $el . 'class-xe-paragraph.php', $ns . 'XeParagraph' ),
			'xe_image'       => array( $el . 'class-xe-image.php', $ns . 'XeImage' ),
			'xe_button'      => array( $el . 'class-xe-button.php', $ns . 'XeButton' ),
			'xe_loop'        => array( 'class-xeditor-loop-schema.php', $lp . 'XEditorLoopUnit' ),
			'xe_loop_layout' => array( 'class-xeditor-loop-schema.php', $lp . 'XEditorLoopLayoutUnit' ),
			'xe_loop_item'   => array( 'class-xeditor-loop-schema.php', $lp . 'XEditorLoopItemUnit' ),
		);
	}

	/**
	 * Types that are nodes of the XEditor tree (atomic + loop).
	 *
	 * @return string[]
	 */
	public static function types() {
		return array_keys( self::elements() );
	}

	public static function init() {
		if ( self::$booted ) {
			return;
		}
		self::$booted = true;
		XEditorAccess::init();
		add_action( 'sidcraft-page-builder/units/register', array( self::class, 'register_units' ), 5 );
		add_action( 'sidcraft-page-builder/controls/register', array( self::class, 'register_controls' ) );
		add_action( 'sidcraft-page-builder/rest/register_routes', array( self::class, 'routes' ) );
		add_action( 'sidcraft-page-builder/editor/enqueue', array( self::class, 'enqueue_editor' ) );
		add_filter( 'sidcraft-page-builder/editor/localize_data', array( self::class, 'localize' ), 20, 2 );
		add_action( 'sidcraft-page-builder/frontend/enqueue', array( self::class, 'register_frontend' ) );
		add_filter( 'sidcraft-page-builder/unit/styles', array( self::class, 'unit_styles' ), 10, 3 );
		add_filter( 'sidcraft-page-builder/unit/cacheable', array( self::class, 'cacheable' ), 10, 2 );
	}

	/**
	 * @param object $registry UnitRegistry
	 */
	public static function register_units( $registry ) {
		if ( ! is_object( $registry ) ) {
			return;
		}
		$base = __DIR__ . '/';
		foreach ( self::elements() as $type => $spec ) {
			if ( method_exists( $registry, 'has' ) && $registry->has( $type ) ) {
				continue;
			}
			if ( method_exists( $registry, 'register_lazy' ) ) {
				$registry->register_lazy( $type, $base . $spec[0], $spec[1] );
			} else {
				require_once $base . $spec[0];
				$registry->register( $spec[1] );
			}
		}
	}

	/**
	 * `xe_classes` control: a stack of class names, stored as an array.
	 *
	 * @param object $controls Controls registry.
	 */
	public static function register_controls( $controls ) {
		if ( ! is_object( $controls ) || ! method_exists( $controls, 'register' ) ) {
			return;
		}
		$controls->register(
			'xe_classes',
			static function ( $value ) {
				return XEditorClassesManager::stack( $value );
			},
			null,
			array(
				'label'   => __( 'Classes', 'sidcraft-page-builder' ),
				'default' => array(),
			)
		);
	}

	/* ------------------------------------------------------------------ *
	 * REST
	 * ------------------------------------------------------------------ */

	/**
	 * @param string $ns
	 */
	public static function routes( $ns = 'sidcraft-page-builder/v1' ) {
		$ns = is_string( $ns ) && '' !== $ns ? $ns : 'sidcraft-page-builder/v1';
		register_rest_route(
			$ns,
			'/xeditor/design',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'rest_get' ),
					'permission_callback' => array( self::class, 'can_read' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'rest_save' ),
					'permission_callback' => array( self::class, 'can_design' ),
				),
			)
		);
	}

	/** @return bool */
	public static function can_read() {
		if ( class_exists( '\\SidcraftPageBuilder\\Settings\\Roles' ) && method_exists( '\\SidcraftPageBuilder\\Settings\\Roles', 'can_edit' ) ) {
			return \SidcraftPageBuilder\Settings\Roles::can_edit();
		}
		return current_user_can( 'edit_posts' );
	}

	/** @return bool */
	public static function can_design() {
		if ( class_exists( '\\SidcraftPageBuilder\\Api\\Rest' ) && method_exists( '\\SidcraftPageBuilder\\Api\\Rest', 'can_design' ) ) {
			return \SidcraftPageBuilder\Api\Rest::can_design();
		}
		return current_user_can( 'manage_options' );
	}

	public static function rest_get() {
		return rest_ensure_response(
			array(
				'design' => XEditorClassesManager::get(),
				'css'    => XEditorClassesManager::css(),
			)
		);
	}

	/**
	 * @param \WP_REST_Request $req
	 */
	public static function rest_save( $req ) {
		$body   = $req->get_json_params();
		$design = is_array( $body ) && isset( $body['design'] ) && is_array( $body['design'] ) ? $body['design'] : ( is_array( $body ) ? $body : array() );
		$saved  = XEditorClassesManager::save( $design );
		return rest_ensure_response(
			array(
				'design' => $saved,
				'css'    => XEditorClassesManager::css(),
			)
		);
	}

	/* ------------------------------------------------------------------ *
	 * Editor
	 * ------------------------------------------------------------------ */

	/**
	 * @param int $post_id
	 */
	public static function enqueue_editor( $post_id = 0 ) {
		unset( $post_id );
		$root = defined( 'SIDCRAFT_PAGE_BUILDER_PATH' ) ? SIDCRAFT_PAGE_BUILDER_PATH : dirname( __DIR__, 2 ) . '/';
		$url  = defined( 'SIDCRAFT_PAGE_BUILDER_URL' ) ? SIDCRAFT_PAGE_BUILDER_URL : '';
		$ver  = ( defined( 'SIDCRAFT_PAGE_BUILDER_VERSION' ) ? SIDCRAFT_PAGE_BUILDER_VERSION : self::VERSION ) . '-' . ( file_exists( $root . 'assets/js/xeditor.js' ) ? filemtime( $root . 'assets/js/xeditor.js' ) : '0' );
		wp_enqueue_style( 'sidcraft-page-builder-xeditor-editor', $url . 'assets/css/xeditor-editor.css', array( 'sidcraft-page-builder-editor' ), $ver );
		wp_enqueue_script( 'sidcraft-page-builder-xeditor-editor', $url . 'assets/js/xeditor.js', array( 'sidcraft-page-builder-editor' ), $ver, true );
	}

	/**
	 * @param array $data
	 * @param int   $post_id
	 * @return array
	 */
	public static function localize( $data, $post_id = 0 ) {
		unset( $post_id );
		if ( ! is_array( $data ) ) {
			$data = array();
		}
		$data['xeditor'] = array(
			'version'  => self::VERSION,
			'design'   => XEditorClassesManager::get(),
			'baseCss'  => self::base_css(),
			'access'   => XEditorAccess::editor_data(),
			'elements' => self::menu(),
			'tokens'   => self::token_catalog(),
			'rest'     => function_exists( 'rest_url' ) ? esc_url_raw( rest_url( 'sidcraft-page-builder/v1/xeditor/design' ) ) : '',
			'canSave'  => self::can_design(),
		);
		// The old "Atomic" catalog now points at XEditor elements so legacy UI stays consistent.
		$data['atomicTypes'] = array();
		foreach ( self::menu() as $row ) {
			$data['atomicTypes'][ $row['type'] ] = $row['title'];
		}
		return $data;
	}

	/**
	 * XEditor insert menu (top bar). Classic units that fit the atomic workflow are
	 * listed too so the old Atomic entries keep working.
	 *
	 * @return array<int,array{type:string,title:string,group:string,icon:string}>
	 */
	public static function menu() {
		$rows = array(
			array( 'xe_div_block', __( 'Div Block', 'sidcraft-page-builder' ), 'structure', "\u{25A2}" ),
			array( 'xe_flexbox', __( 'Flexbox', 'sidcraft-page-builder' ), 'structure', "\u{21C6}" ),
			array( 'xe_grid', __( 'Grid', 'sidcraft-page-builder' ), 'structure', "\u{25A6}" ),
			array( 'xe_heading', __( 'Heading', 'sidcraft-page-builder' ), 'basic', 'H' ),
			array( 'xe_paragraph', __( 'Paragraph', 'sidcraft-page-builder' ), 'basic', "\u{00B6}" ),
			array( 'xe_image', __( 'Image', 'sidcraft-page-builder' ), 'basic', "\u{25A7}" ),
			array( 'xe_button', __( 'Button', 'sidcraft-page-builder' ), 'basic', "\u{25AD}" ),
			array( 'xe_loop', __( 'Loop', 'sidcraft-page-builder' ), 'pro', "\u{27F3}" ),
			array( 'icon', __( 'Icon', 'sidcraft-page-builder' ), 'classic', "\u{2605}" ),
			array( 'spacer', __( 'Spacer', 'sidcraft-page-builder' ), 'classic', "\u{2195}" ),
			array( 'divider', __( 'Divider', 'sidcraft-page-builder' ), 'classic', "\u{2015}" ),
			array( 'video', __( 'Video', 'sidcraft-page-builder' ), 'classic', "\u{25B6}" ),
			array( 'icon_box', __( 'Icon Box', 'sidcraft-page-builder' ), 'classic', "\u{2606}" ),
			array( 'image_box', __( 'Image Box', 'sidcraft-page-builder' ), 'classic', "\u{25A3}" ),
			array( 'container', __( 'Container', 'sidcraft-page-builder' ), 'classic', "\u{25A1}" ),
		);
		$out = array();
		foreach ( $rows as $r ) {
			$out[] = array(
				'type'  => $r[0],
				'title' => $r[1],
				'group' => $r[2],
				'icon'  => $r[3],
			);
		}
		return $out;
	}

	/** @return array<int,array{token:string,label:string}> */
	public static function token_catalog() {
		$t = array(
			'{{post.title}}'          => __( 'Post title', 'sidcraft-page-builder' ),
			'{{post.url}}'            => __( 'Post URL', 'sidcraft-page-builder' ),
			'{{post.excerpt}}'        => __( 'Excerpt', 'sidcraft-page-builder' ),
			'{{post.featured_image}}' => __( 'Featured image URL', 'sidcraft-page-builder' ),
			'{{post.date}}'           => __( 'Publish date', 'sidcraft-page-builder' ),
			'{{post.author}}'         => __( 'Author name', 'sidcraft-page-builder' ),
			'{{post.terms:category}}' => __( 'Categories', 'sidcraft-page-builder' ),
			'{{post.comments}}'       => __( 'Comment count', 'sidcraft-page-builder' ),
			'{{post.meta:key}}'       => __( 'Custom field (replace key)', 'sidcraft-page-builder' ),
			'{{term.name}}'           => __( 'Term name (term loops)', 'sidcraft-page-builder' ),
			'{{term.url}}'            => __( 'Term URL (term loops)', 'sidcraft-page-builder' ),
			'{{term.count}}'          => __( 'Term post count', 'sidcraft-page-builder' ),
			'{{loop.number}}'         => __( 'Item number (1, 2, 3...)', 'sidcraft-page-builder' ),
		);
		$out = array();
		foreach ( $t as $token => $label ) {
			$out[] = array(
				'token' => $token,
				'label' => $label,
			);
		}
		return $out;
	}

	/* ------------------------------------------------------------------ *
	 * Frontend
	 * ------------------------------------------------------------------ */

	/**
	 * Defaults for XEditor elements. Everything sits in :where() so a utility
	 * class (single-class specificity) always wins.
	 *
	 * @return string
	 */
	public static function base_css() {
		return ':where(.xe-el){box-sizing:border-box;min-width:0}'
			. ':where(.xe-flexbox){display:flex;flex-wrap:wrap;gap:16px}'
			. ':where(.xe-grid){display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}'
			. ':where(.xe-heading){margin:0}'
			. ':where(.xe-paragraph){margin:0}'
			. ':where(.xe-image){display:block;max-width:100%;height:auto}'
			. ':where(.xe-button){display:inline-flex;align-items:center;justify-content:center;gap:.5em;padding:.7em 1.3em;border:0;border-radius:6px;background:#1f2937;color:#fff;font:inherit;line-height:1.2;text-decoration:none;cursor:pointer}'
			. ':where(.xe-button:hover){filter:brightness(1.12)}'
			. ':where(.xe-button:focus-visible){outline:2px solid currentColor;outline-offset:2px}'
			. ':where(.xe-loop){display:block}'
			. ':where(.xe-loop-layout--grid){display:grid;grid-template-columns:repeat(var(--xe-loop-cols,3),minmax(0,1fr));gap:var(--xe-loop-row-gap,var(--xe-loop-gap,24px)) var(--xe-loop-gap,24px);list-style:none;padding:0;margin:0}'
			. ':where(.xe-loop-layout--list){display:flex;flex-direction:column;gap:var(--xe-loop-row-gap,var(--xe-loop-gap,24px));list-style:none;padding:0;margin:0}'
			. ':where(.xe-loop-layout--masonry){column-count:var(--xe-loop-cols,3);column-gap:var(--xe-loop-gap,24px);padding:0;margin:0}'
			. ':where(.xe-loop-layout--masonry>*){break-inside:avoid;display:block;margin:0 0 var(--xe-loop-row-gap,var(--xe-loop-gap,24px))}'
			. ':where(.xe-loop-item){min-width:0}'
			. ':where(.xe-loop-empty){margin:0;padding:1em;color:inherit;opacity:.75}'
			. ':where(.xe-loop-pages){display:flex;flex-wrap:wrap;gap:.4em;margin-top:1.5em}'
			. ':where(.xe-loop-pages a,.xe-loop-pages span){padding:.35em .7em;border:1px solid currentColor;border-radius:4px;text-decoration:none;color:inherit}'
			. ':where(.xe-loop-pages .current){font-weight:700;opacity:.7}';
	}

	public static function register_frontend() {
		if ( ! function_exists( 'wp_register_style' ) ) {
			return;
		}
		wp_register_style( self::STYLE_HANDLE, false, array(), defined( 'SIDCRAFT_PAGE_BUILDER_VERSION' ) ? SIDCRAFT_PAGE_BUILDER_VERSION : self::VERSION );
		wp_add_inline_style( self::STYLE_HANDLE, wp_strip_all_tags( self::base_css() . XEditorClassesManager::css() ) );
	}

	/**
	 * Any unit with stacked XEditor classes needs the XEditor stylesheet.
	 *
	 * @param string[] $handles
	 * @param object   $unit
	 * @param array    $settings
	 * @return string[]
	 */
	public static function unit_styles( $handles, $unit = null, $settings = array() ) {
		unset( $unit );
		$handles = is_array( $handles ) ? $handles : array();
		if ( is_array( $settings ) && ! empty( $settings['xe_classes'] ) && ! in_array( self::STYLE_HANDLE, $handles, true ) ) {
			$handles[] = self::STYLE_HANDLE;
		}
		return $handles;
	}

	/**
	 * Loops and token-bearing elements are request dependent; never cache them.
	 *
	 * @param bool  $ok
	 * @param array $node
	 * @return bool
	 */
	public static function cacheable( $ok, $node ) {
		if ( ! $ok || ! is_array( $node ) ) {
			return $ok;
		}
		$type = (string) ( $node['type'] ?? '' );
		if ( XEditorAccess::is_guarded( $type ) ) {
			return false;
		}
		if ( 0 === strpos( $type, 'xe_' ) ) {
			foreach ( (array) ( $node['settings'] ?? array() ) as $v ) {
				if ( is_string( $v ) && false !== strpos( $v, '{{' ) ) {
					return false;
				}
			}
			if ( 'featured' === ( $node['settings']['source'] ?? '' ) ) {
				return false;
			}
		}
		return $ok;
	}
}
