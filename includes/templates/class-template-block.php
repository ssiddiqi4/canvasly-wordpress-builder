<?php
namespace SidcraftSyntex\Templates;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Gutenberg `sidcraft-syntex/template` block.
 *
 * Loaded from the plugin bootstrap *and* from the native-editor zero-bootstrap
 * path so the block still appears in post.php / post-new.php.
 */
class TemplateBlock {
	const NAME   = 'sidcraft-syntex/template';
	const SCRIPT = 'sidcraft-syntex-template-block';
	const STYLE  = 'sidcraft-syntex-template-block-editor';

	/** @var bool */
	private static $booted = false;

	public static function bootstrap() {
		if ( self::$booted ) {
			return;
		}
		self::$booted = true;
		add_action( 'init', array( self::class, 'register' ), 9 );
		add_filter( 'block_categories_all', array( self::class, 'category' ), 10, 2 );
	}

	/**
	 * @param array $categories
	 * @return array
	 */
	public static function category( $categories, $context = null ) {
		$categories = is_array( $categories ) ? $categories : array();
		foreach ( $categories as $cat ) {
			if ( is_array( $cat ) && ( $cat['slug'] ?? '' ) === 'sidcraft-syntex' ) {
				return $categories;
			}
		}
		$categories[] = array(
			'slug'  => 'sidcraft-syntex',
			'title' => __( 'Sidcraft Syntex', 'sidcraft-syntex' ),
			'icon'  => 'layout',
		);
		return $categories;
	}

	public static function register() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}
		self::register_assets();
		$dir = defined( 'SIDCRAFT_SYNTEX_PATH' ) ? SIDCRAFT_SYNTEX_PATH . 'assets/blocks/template' : '';
		$args = array(
			'editor_script'   => self::SCRIPT,
			'editor_style'    => self::STYLE,
			'render_callback' => array( self::class, 'render' ),
			'attributes'      => array(
				'id' => array(
					'type'    => 'number',
					'default' => 0,
				),
			),
		);
		if ( $dir !== '' && is_readable( $dir . '/block.json' ) ) {
			register_block_type( $dir, $args );
			return;
		}
		$args['api_version'] = 3;
		$args['title']       = __( 'Sidcraft Syntex Template', 'sidcraft-syntex' );
		$args['category']    = 'sidcraft-syntex';
		$args['icon']        = 'layout';
		$args['supports']    = array(
			'html'      => false,
			'align'     => array( 'wide', 'full' ),
			'anchor'    => true,
			'className' => true,
		);
		register_block_type( self::NAME, $args );
	}

	public static function register_assets() {
		if ( ! function_exists( 'wp_register_script' ) ) {
			return;
		}
		$ver = defined( 'SIDCRAFT_SYNTEX_VERSION' ) ? SIDCRAFT_SYNTEX_VERSION : '0';
		$url = defined( 'SIDCRAFT_SYNTEX_URL' ) ? SIDCRAFT_SYNTEX_URL : '';
		$js  = defined( 'SIDCRAFT_SYNTEX_PATH' ) ? SIDCRAFT_SYNTEX_PATH . 'assets/js/blocks/template.js' : '';
		$css = defined( 'SIDCRAFT_SYNTEX_PATH' ) ? SIDCRAFT_SYNTEX_PATH . 'assets/css/blocks/template-editor.css' : '';
		$mtime = function_exists( 'is_admin' ) && is_admin();
		if ( $js && is_readable( $js ) ) {
			$jsver = $ver . ( $mtime ? '-' . (string) filemtime( $js ) : '' );
			wp_register_script(
				self::SCRIPT,
				$url . 'assets/js/blocks/template.js',
				array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n', 'wp-server-side-render', 'wp-api-fetch' ),
				$jsver,
				true
			);
			if ( function_exists( 'wp_set_script_translations' ) && defined( 'SIDCRAFT_SYNTEX_PATH' ) ) {
				wp_set_script_translations( self::SCRIPT, 'sidcraft-syntex', SIDCRAFT_SYNTEX_PATH . 'languages' );
			}
		}
		if ( $css && is_readable( $css ) ) {
			$cssver = $ver . ( $mtime ? '-' . (string) filemtime( $css ) : '' );
			wp_register_style(
				self::STYLE,
				$url . 'assets/css/blocks/template-editor.css',
				array(),
				$cssver
			);
		}
	}

	/**
	 * @param array $attrs
	 * @return string
	 */
	public static function render( $attrs ) {
		if ( class_exists( TemplateEmbed::class ) ) {
			return TemplateEmbed::block_render( is_array( $attrs ) ? $attrs : array() );
		}
		return '';
	}
}
