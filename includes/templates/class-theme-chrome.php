<?php
namespace SidcraftSyntex\Templates;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Detects whether the active theme already supplies a header and footer.
 *
 * When both exist, the editor canvas inherits them and does not offer its own
 * Header and Footer areas. When either is missing, those areas are the header
 * and footer.
 */
class ThemeChrome {
	const MAX_HTML = 250000;

	/**
	 * @var bool
	 */
	private static $capturing = false;

	/**
	 * @var array{header:string,footer:string}|null
	 */
	private static $public_parts = null;

	/**
	 * @var bool
	 */
	private static $fetching = false;

	public static function init() {
		add_action( 'rest_api_init', array( self::class, 'register_route' ) );
	}

	public static function register_route() {
		register_rest_route(
			'sidcraft-syntex/v1',
			'/theme-chrome',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'rest' ),
				'permission_callback' => array( self::class, 'can_read' ),
			)
		);
	}

	/**
	 * @return bool
	 */
	public static function can_read() {
		if ( class_exists( '\\SidcraftSyntex\\Settings\\Roles' ) && ! \SidcraftSyntex\Settings\Roles::can_edit() ) {
			return false;
		}
		return current_user_can( 'edit_posts' ) || current_user_can( 'edit_pages' );
	}

	/**
	 * @return \WP_REST_Response|array
	 */
	/**
	 * @param mixed $request
	 * @return \WP_REST_Response|array
	 */
	public static function rest( $request = null ) {
		$post_id = 0;
		if ( is_object( $request ) && method_exists( $request, 'get_param' ) ) {
			$post_id = absint( $request->get_param( 'post_id' ) );
		}
		if ( class_exists( ThemeChromeEdits::class ) ) {
			$payload = ThemeChromeEdits::payload( $post_id );
		} else {
			$inherit = self::provides();
			$payload = array(
				'inherit' => $inherit,
				'header'  => $inherit ? self::markup( 'header' ) : '',
				'footer'  => $inherit ? self::markup( 'footer' ) : '',
				'scope'   => 'page',
			);
		}
		return function_exists( 'rest_ensure_response' ) ? rest_ensure_response( $payload ) : $payload;
	}

	/**
	 * Editor flag: inherit only when the theme has both parts.
	 *
	 * @return array{header:bool,footer:bool,inherit:bool}
	 */
	public static function export() {
		$header = self::has( 'header' );
		$footer = self::has( 'footer' );
		return array(
			'header'  => $header,
			'footer'  => $footer,
			'inherit' => $header && $footer,
		);
	}

	/**
	 * Styles the editor iframe needs so an inherited header and footer match the theme.
	 *
	 * Block themes paint layout from global styles, which are not part of the header
	 * fragment. Classic themes need their stylesheet as an absolute URL because the
	 * editor canvas is a srcdoc document.
	 *
	 * @return array{css:string,links:string[]}
	 */
	public static function editor_styles() {
		$css   = '';
		$links = array();
		if ( function_exists( 'wp_get_global_stylesheet' ) ) {
			$css .= (string) wp_get_global_stylesheet( array( 'variables', 'presets', 'styles' ) );
			$css .= (string) wp_get_global_stylesheet( array( 'base-layout-styles' ) );
		}
		if ( function_exists( 'get_stylesheet_uri' ) ) {
			$uri = (string) get_stylesheet_uri();
			if ( '' !== $uri ) {
				$links[] = $uri;
			}
		}
		if ( function_exists( 'get_template_directory_uri' ) && function_exists( 'get_stylesheet' ) && function_exists( 'get_template' ) && get_template() !== get_stylesheet() ) {
			$links[] = trailingslashit( (string) get_template_directory_uri() ) . 'style.css';
		}
		if ( function_exists( 'includes_url' ) ) {
			$rtl     = function_exists( 'is_rtl' ) && is_rtl();
			$links[] = includes_url( 'css/dist/block-library/style' . ( $rtl ? '-rtl' : '' ) . '.min.css' );
		}
		if ( function_exists( 'wp_get_custom_css' ) ) {
			$css .= (string) wp_get_custom_css();
		}
		$links = array_values( array_unique( array_filter( $links ) ) );
		return array(
			'css'   => $css,
			'links' => $links,
		);
	}

	/**
	 * @param string $part header|footer
	 * @return bool
	 */
	public static function has( $part ) {
		$part  = $part === 'footer' ? 'footer' : 'header';
		$found = self::classic_file( $part ) || ( self::is_block_theme() && self::block_part( $part ) );
		$found = apply_filters( 'sidcraft-syntex/theme/has_part', $found, $part );
		return (bool) $found;
	}

	/**
	 * True when the theme can supply both a header and a footer.
	 *
	 * @return bool
	 */
	public static function provides() {
		$on = self::has( 'header' ) && self::has( 'footer' );
		return (bool) apply_filters( 'sidcraft-syntex/theme/provides_chrome', $on );
	}

	/**
	 * @return bool
	 */
	public static function is_block_theme() {
		return function_exists( 'wp_is_block_theme' ) && wp_is_block_theme();
	}

	/**
	 * Captured theme markup for the editor canvas. Empty when the part is absent.
	 *
	 * @param string $part   header|footer
	 * @param int    $post_id Page the theme builder should treat as current.
	 * @param bool   $remote When local capture has no footer or header, read the public page.
	 * @return string
	 */
	public static function markup( $part, $post_id = 0, $remote = false ) {
		$part = $part === 'footer' ? 'footer' : 'header';
		if ( self::$capturing || ! self::has( $part ) ) {
			return '';
		}
		self::$capturing = true;
		$html            = self::fragment(
			self::with_post(
				$post_id,
				function () use ( $part ) {
					return self::capture_part( $part );
				}
			)
		);
		if ( $post_id && ! self::visible_html( $html ) ) {
			$plain = self::fragment( self::capture_part( $part ) );
			if ( self::visible_html( $plain ) ) {
				$html = $plain;
			}
		}
		self::$capturing = false;
		if ( $remote && ! self::acceptable_part( $html, $part ) ) {
			$public = self::public_parts( $post_id );
			$better = isset( $public[ $part ] ) ? (string) $public[ $part ] : '';
			$usable = self::visible_html( $better );
			if ( $usable && ( self::acceptable_part( $better, $part ) || ! self::visible_html( $html ) ) ) {
				$html = $better;
			}
		}
		return self::visible_html( $html ) ? self::with_builder_css( self::reveal_lazy_media( $html ) ) : '';
	}

	/**
	 * Classes the inherited header and footer need so theme and Elementor
	 * rules written for the body still match inside the editor canvas.
	 *
	 * @return string
	 */
	public static function editor_body_class() {
		$classes = array();
		if ( function_exists( 'get_body_class' ) ) {
			$found = get_body_class();
			if ( is_array( $found ) ) {
				$classes = $found;
			}
		}
		$kit = self::elementor_kit_id();
		if ( $kit ) {
			$classes[] = 'elementor-kit-' . $kit;
		}
		$skip = array( 'admin-bar', 'logged-in', 'wp-toolbar', 'customize-support', 'no-customize-support' );
		$keep = array();
		foreach ( $classes as $class ) {
			$class = is_string( $class ) ? trim( $class ) : '';
			if ( '' === $class || in_array( $class, $skip, true ) || ! preg_match( '/^[A-Za-z0-9_-]+$/', $class ) ) {
				continue;
			}
			$keep[] = $class;
		}
		return implode( ' ', array_values( array_unique( $keep ) ) );
	}

	/**
	 * Document ids printed on an Elementor header or footer.
	 *
	 * @param string $html
	 * @return int[]
	 */
	public static function elementor_document_ids( $html ) {
		$ids = array();
		if ( preg_match_all( '/\bdata-elementor-id=(["\'])(\d+)\1/i', (string) $html, $named ) ) {
			foreach ( $named[2] as $id ) {
				$ids[] = absint( $id );
			}
		}
		if ( preg_match_all( '/\belementor-(\d+)\b/', (string) $html, $classes ) ) {
			foreach ( $classes[1] as $id ) {
				$ids[] = absint( $id );
			}
		}
		$ids = array_values( array_unique( array_filter( $ids ) ) );
		return $ids;
	}

	/**
	 * Elementor sizes the site logo in the header template stylesheet. A local
	 * header capture does not include that file, so the canvas shows the full
	 * attachment instead of the width set in the Elementor editor.
	 *
	 * @param string $html
	 * @return string
	 */
	public static function with_builder_css( $html ) {
		$html = (string) $html;
		if ( '' === trim( $html ) ) {
			return $html;
		}
		$extra = self::builder_css( $html );
		$extra = (string) apply_filters( 'sidcraft-syntex/theme/builder_css', $extra, $html );
		$extra = trim( $extra );
		if ( '' === $extra ) {
			return $html;
		}
		return $extra . $html;
	}

	/**
	 * @param string $html
	 * @return string
	 */
	private static function builder_css( $html ) {
		$tags = '';
		$seen = array();
		foreach ( self::elementor_document_ids( $html ) as $id ) {
			$seen[ $id ] = true;
			$tags       .= self::elementor_css_tag( $id, $html );
		}
		$kit = self::elementor_kit_id();
		if ( $kit && empty( $seen[ $kit ] ) ) {
			$tags .= self::elementor_css_tag( $kit, $html );
		}
		$tags .= self::elementor_frontend_links( $html );
		if ( false === strpos( $html, 'data-lb-builder-css="logo"' ) && preg_match( '/<img\b/i', $html ) ) {
			$tags .= '<style data-lb-builder-css="logo">' . self::logo_baseline_css() . '</style>';
		}
		return $tags;
	}

	/**
	 * Lazy loaders leave a placeholder in src and the real file in data-src.
	 * The canvas drops scripts, so the logo would stay blank.
	 *
	 * Native `loading="lazy"` needs no script to leave a logo blank: the
	 * browser only fetches the file once it thinks the image is near the
	 * viewport, and inside the builder's offscreen/hidden canvas iframe that
	 * check can simply never fire. WordPress's own get_custom_logo() adds
	 * this attribute by default, so a theme's header logo commonly carries
	 * it even though nothing else on the page is "lazy" in the data- sense.
	 * Force it to load immediately, the same as everything else in the
	 * captured chrome.
	 *
	 * @param string $html
	 * @return string
	 */
	public static function reveal_lazy_media( $html ) {
		$html = (string) $html;
		if ( '' === $html || ( false === stripos( $html, 'data-' ) && false === stripos( $html, 'loading=' ) ) ) {
			return $html;
		}
		$out = preg_replace_callback(
			'/<img\b[^>]*>/i',
			function ( $match ) {
				$tag = $match[0];
				if ( preg_match( '/\bloading\s*=\s*(["\'])lazy\1/i', $tag ) ) {
					$tag = preg_replace( '/\bloading\s*=\s*(["\'])lazy\1/i', 'loading="eager"', $tag, 1 );
				}
				$src  = '';
				$lazy = '';
				if ( preg_match( '/\bsrc\s*=\s*(["\'])(.*?)\1/i', $tag, $found ) ) {
					$src = html_entity_decode( $found[2], ENT_QUOTES, 'UTF-8' );
				}
				if ( preg_match( '/\bdata-(?:lazy-src|ll-src|orig-src|orig-file|src)\s*=\s*(["\'])(.*?)\1/i', $tag, $found ) ) {
					$lazy = self::safe_media_url( $found[2] );
				}
				if ( '' === $lazy || ! self::src_is_placeholder( $src ) ) {
					return $tag;
				}
				$quoted = '"' . $lazy . '"';
				if ( preg_match( '/\bsrc\s*=/i', $tag ) ) {
					$tag = preg_replace( '/\bsrc\s*=\s*(["\']).*?\1/i', 'src=' . $quoted, $tag, 1 );
				} else {
					$tag = preg_replace( '/<img\b/i', '<img src=' . $quoted, $tag, 1 );
				}
				if ( preg_match( '/\bdata-(?:lazy-srcset|srcset)\s*=\s*(["\'])(.*?)\1/i', $tag, $set ) ) {
					$srcset = self::safe_srcset( $set[2] );
					if ( '' !== $srcset ) {
						if ( preg_match( '/\bsrcset\s*=/i', $tag ) ) {
							$tag = preg_replace( '/\bsrcset\s*=\s*(["\']).*?\1/i', 'srcset="' . $srcset . '"', $tag, 1 );
						} else {
							$tag = preg_replace( '/<img\b/i', '<img srcset="' . $srcset . '"', $tag, 1 );
						}
					}
				}
				return $tag;
			},
			$html
		);
		return is_string( $out ) ? $out : $html;
	}

	/**
	 * @param string $src
	 * @return bool
	 */
	private static function src_is_placeholder( $src ) {
		$src = trim( (string) $src );
		if ( '' === $src || '#' === $src || 'about:blank' === strtolower( $src ) ) {
			return true;
		}
		if ( 0 === stripos( $src, 'data:' ) ) {
			return true;
		}
		return (bool) preg_match( '/(?:placeholder|blank\.(?:gif|png|svg)|1x1|lazy)/i', $src );
	}

	/**
	 * @param string $url
	 * @return string
	 */
	private static function safe_media_url( $url ) {
		$url = trim( html_entity_decode( (string) $url, ENT_QUOTES, 'UTF-8' ) );
		if ( '' === $url || preg_match( '/[\s"\'<>]/', $url ) ) {
			return '';
		}
		if ( preg_match( '#^(?:https?:)?//#i', $url ) || '/' === substr( $url, 0, 1 ) ) {
			return $url;
		}
		return '';
	}

	/**
	 * @param string $srcset
	 * @return string
	 */
	private static function safe_srcset( $srcset ) {
		$srcset = trim( html_entity_decode( (string) $srcset, ENT_QUOTES, 'UTF-8' ) );
		if ( '' === $srcset || preg_match( '/[<>"\']/', $srcset ) ) {
			return '';
		}
		foreach ( preg_split( '/\s*,\s*/', $srcset ) as $part ) {
			$url = preg_split( '/\s+/', trim( $part ) );
			$url = isset( $url[0] ) ? (string) $url[0] : '';
			if ( '' === self::safe_media_url( $url ) ) {
				return '';
			}
		}
		return $srcset;
	}

	/**
	 * Keep a logo's aspect ratio when the theme file stored the full image size
	 * in the width and height attributes.
	 *
	 * @return string
	 */
	private static function logo_baseline_css() {
		return '.custom-logo,.custom-logo-link img,.site-logo img,.site-branding img,.elementor-widget-theme-site-logo img,.elementor-widget-image .elementor-widget-container img{height:auto;max-width:100%;}'
			. '.elementor-location-header .elementor-widget-theme-site-logo,.elementor-location-header .elementor-widget-hfe-site-logo,.elementor-location-header .elementor-widget-image,.elementor-location-header .custom-logo-link,.elementor-location-header .site-branding,.elementor-location-header .hfe-site-logo{flex:0 0 auto;width:max-content;max-width:220px;min-width:64px;overflow:visible;}'
			. '.elementor-location-header .custom-logo,.elementor-location-header .custom-logo-link img,.elementor-location-header .site-branding img,.elementor-location-header .elementor-widget-theme-site-logo img,.elementor-location-header .elementor-widget-image img,.elementor-location-header .hfe-site-logo-img{display:block;width:auto;height:auto;max-width:100%;max-height:110px;object-fit:contain;}';
	}

	/**
	 * @param int    $id
	 * @param string $html
	 * @return string
	 */
	private static function elementor_css_tag( $id, $html ) {
		$id = absint( $id );
		if ( ! $id || false !== strpos( $html, 'data-lb-builder-css="' . $id . '"' ) ) {
			return '';
		}
		$css = self::elementor_document_css( $id );
		if ( '' === trim( $css ) ) {
			return '';
		}
		return '<style data-lb-builder-css="' . $id . '">' . $css . '</style>';
	}

	/**
	 * @param int $id
	 * @return string
	 */
	private static function elementor_document_css( $id ) {
		$id  = absint( $id );
		$css = '';
		if ( $id && class_exists( '\Elementor\Core\Files\CSS\Post' ) ) {
			try {
				$file = new \Elementor\Core\Files\CSS\Post( $id );
				if ( method_exists( $file, 'get_content' ) ) {
					$css = (string) $file->get_content();
				}
			} catch ( \Throwable $e ) {
				$css = '';
			}
		}
		if ( '' === trim( $css ) ) {
			$css = self::elementor_css_file( $id );
		}
		return str_replace( '</style', '', (string) $css );
	}

	/**
	 * @param int $id
	 * @return string
	 */
	private static function elementor_css_file( $id ) {
		$id = absint( $id );
		if ( ! $id || ! function_exists( 'wp_upload_dir' ) ) {
			return '';
		}
		$upload = wp_upload_dir();
		if ( ! is_array( $upload ) || empty( $upload['basedir'] ) ) {
			return '';
		}
		$path = rtrim( (string) $upload['basedir'], '/\\' ) . '/elementor/css/post-' . $id . '.css';
		if ( ! is_readable( $path ) ) {
			return '';
		}
		$css = file_get_contents( $path );
		return is_string( $css ) ? $css : '';
	}

	/**
	 * @return int
	 */
	private static function elementor_kit_id() {
		if ( class_exists( '\Elementor\Plugin' ) && isset( \Elementor\Plugin::$instance->kits_manager ) && is_object( \Elementor\Plugin::$instance->kits_manager ) && method_exists( \Elementor\Plugin::$instance->kits_manager, 'get_active_id' ) ) {
			return absint( \Elementor\Plugin::$instance->kits_manager->get_active_id() );
		}
		if ( function_exists( 'get_option' ) ) {
			return absint( get_option( 'elementor_active_kit' ) );
		}
		return 0;
	}

	/**
	 * @param string $html
	 * @return string
	 */
	private static function elementor_frontend_links( $html ) {
		if ( false !== strpos( $html, 'sidcraft-syntex-builder-frontend-' ) ) {
			return '';
		}
		$files = array();
		if ( defined( 'ELEMENTOR__FILE__' ) ) {
			$files[] = array( ELEMENTOR__FILE__, 'assets/css/frontend.min.css' );
			$files[] = array( ELEMENTOR__FILE__, 'assets/css/frontend.css' );
			$files[] = array( ELEMENTOR__FILE__, 'assets/css/widget-image.min.css' );
		}
		if ( defined( 'ELEMENTOR_PRO__FILE__' ) ) {
			$files[] = array( ELEMENTOR_PRO__FILE__, 'assets/css/widget-theme-elements.min.css' );
		}
		$tags = '';
		$seen = array();
		if ( ! class_exists( '\\WP_Styles' ) ) {
			return '';
		}
		// Printed by WordPress core's style printer (a private WP_Styles
		// instance) so the fragment gets standard stylesheet tags without
		// adding Elementor's files to the page's global queue.
		static $printer = null;
		if ( null === $printer ) {
			$printer = new \WP_Styles();
		}
		foreach ( $files as $file ) {
			$base = plugin_dir_path( $file[0] ) . $file[1];
			if ( isset( $seen[ $file[1] ] ) || ! is_readable( $base ) ) {
				continue;
			}
			$seen[ $file[1] ] = true;
			$handle           = 'sidcraft-syntex-builder-frontend-' . sanitize_key( str_replace( array( '/', '.' ), '-', $file[1] ) );
			if ( ! isset( $printer->registered[ $handle ] ) ) {
				$printer->add( $handle, plugins_url( $file[1], $file[0] ), array(), null );
			}
			ob_start();
			$printer->do_item( $handle );
			$tags .= (string) ob_get_clean();
		}
		return $tags;
	}

	/**
	 * Run a callback with the page as the main query so theme builders print
	 * the header and footer they show to visitors.
	 *
	 * @param int      $post_id
	 * @param callable $callback
	 * @return mixed
	 */
	public static function with_post( $post_id, $callback ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || ! function_exists( 'get_post' ) || ! class_exists( '\WP_Query' ) ) {
			return $callback();
		}
		$post = get_post( $post_id );
		if ( ! $post ) {
			return $callback();
		}
		global $wp_query, $wp_the_query;
		$prev_query = isset( $wp_query ) ? $wp_query : null;
		$prev_the   = isset( $wp_the_query ) ? $wp_the_query : null;
		$prev_post  = isset( $GLOBALS['post'] ) ? $GLOBALS['post'] : null;
		$type = 'any';
		if ( is_object( $post ) && ! empty( $post->post_type ) ) {
			$type = (string) $post->post_type;
		}
		$query = new \WP_Query(
			array(
				'p'           => $post_id,
				'post_type'   => $type,
				'post_status' => 'any',
			)
		);
		if ( empty( $query->posts ) ) {
			$query->posts             = array( $post );
			$query->post              = $post;
			$query->post_count        = 1;
			$query->found_posts       = 1;
			$query->queried_object    = $post;
			$query->queried_object_id = $post_id;
			$query->is_singular       = true;
			$query->is_single         = 'page' !== $type;
			$query->is_page           = 'page' === $type;
			$query->is_home           = false;
			$query->is_front_page     = false;
			$query->is_archive        = false;
			$query->is_404            = false;
		}
		$wp_query        = $query;
		$wp_the_query    = $query;
		$GLOBALS['post'] = $post;
		if ( function_exists( 'setup_postdata' ) ) {
			setup_postdata( $post );
		}
		try {
			return $callback();
		} finally {
			$wp_query         = $prev_query;
			$wp_the_query     = $prev_the;
			$GLOBALS['post']  = $prev_post;
			if ( function_exists( 'wp_reset_postdata' ) ) {
				wp_reset_postdata();
			}
		}
	}

	/**
	 * @param string $part
	 * @return bool
	 */
	private static function classic_file( $part ) {
		if ( ! function_exists( 'locate_template' ) ) {
			return false;
		}
		$path = locate_template( array( $part . '.php' ), false, false );
		return is_string( $path ) && $path !== '';
	}

	/**
	 * @param string $part
	 * @return bool
	 */
	private static function block_part( $part ) {
		if ( function_exists( 'get_block_template' ) && function_exists( 'get_stylesheet' ) ) {
			$ids = array( get_stylesheet() . '//' . $part );
			if ( function_exists( 'get_template' ) && get_template() !== get_stylesheet() ) {
				$ids[] = get_template() . '//' . $part;
			}
			foreach ( $ids as $id ) {
				$tpl = get_block_template( $id, 'wp_template_part' );
				if ( is_object( $tpl ) && ! empty( $tpl->content ) ) {
					return true;
				}
			}
		}
		$dirs = array();
		if ( function_exists( 'get_stylesheet_directory' ) ) {
			$dirs[] = get_stylesheet_directory();
		}
		if ( function_exists( 'get_template_directory' ) ) {
			$dirs[] = get_template_directory();
		}
		foreach ( array_unique( $dirs ) as $dir ) {
			$dir = rtrim( (string) $dir, '/\\' );
			if ( $dir === '' ) {
				continue;
			}
			if ( is_readable( $dir . '/parts/' . $part . '.html' ) || is_readable( $dir . '/block-template-parts/' . $part . '.html' ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param string $part header|footer
	 * @return string
	 */
	private static function capture_part( $part ) {
		$html = self::capture(
			function () use ( $part ) {
				if ( self::is_block_theme() ) {
					if ( 'header' === $part && function_exists( 'block_header_area' ) ) {
						block_header_area();
					} elseif ( 'footer' === $part && function_exists( 'block_footer_area' ) ) {
						block_footer_area();
					}
				} elseif ( 'header' === $part && function_exists( 'get_header' ) ) {
					get_header();
				} elseif ( 'footer' === $part && function_exists( 'get_footer' ) ) {
					get_footer();
				}
			}
		);
		if ( self::acceptable_part( $html, $part ) || ! function_exists( 'elementor_theme_do_location' ) ) {
			return $html;
		}
		$located = self::capture(
			function () use ( $part ) {
				elementor_theme_do_location( $part );
			}
		);
		if ( self::acceptable_part( $located, $part ) ) {
			return $located;
		}
		if ( self::looks_like_part( $located, $part ) && ! self::looks_like_part( $html, $part ) ) {
			return $located;
		}
		return $html;
	}

	/**
	 * Keep every byte written during capture, including buffers a theme flushes.
	 *
	 * @param callable $callback
	 * @return string
	 */
	private static function capture( $callback ) {
		$chunks = '';
		$level  = ob_get_level();
		ob_start(
			function ( $buffer ) use ( &$chunks ) {
				$chunks .= (string) $buffer;
				return '';
			}
		);
		try {
			$callback();
		} catch ( \Throwable $e ) {
			while ( ob_get_level() > $level ) {
				ob_end_clean();
			}
			return '';
		}
		while ( ob_get_level() > $level ) {
			ob_end_flush();
		}
		return $chunks;
	}

	/**
	 * True when the fragment still has a header or footer a visitor would see.
	 *
	 * @param string $html
	 * @param string $part header|footer
	 * @return bool
	 */
	public static function looks_like_part( $html, $part ) {
		$html = trim( (string) $html );
		if ( '' === $html || false !== stripos( $html, 'lb-chrome-empty' ) ) {
			return false;
		}
		$part = 'footer' === $part ? 'footer' : 'header';
		if ( 'footer' === $part && preg_match( '/<footer\b|elementor-location-footer|data-elementor-type=(["\'])footer\1|role=(["\'])contentinfo\2|site-footer|id=(["\'])(?:[\w-]*footer[\w-]*|colophon)\2|(^|[\s"\'])footer[\w-]*/i', $html ) ) {
			return true;
		}
		if ( 'header' === $part && preg_match( '/<header\b|<nav\b|elementor-location-header|role=(["\'])banner\1|site-header|id=(["\'])masthead\1/i', $html ) ) {
			return true;
		}
		if ( preg_match( '/<html\b|<body\b/i', $html ) ) {
			return false;
		}
		$text = trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( $html ) ) );
		return \SidcraftSyntex\Utils\Text::length( $text ) > 12;
	}

	/**
	 * A theme file can print an empty footer tag while the real bar comes from
	 * a builder location. That stub must not block the location or the page fetch.
	 *
	 * @param string $html
	 * @param string $part header|footer
	 * @return bool
	 */
	private static function acceptable_part( $html, $part ) {
		if ( ! self::looks_like_part( $html, $part ) ) {
			return false;
		}
		if ( self::builder_locations_active() && ! self::has_builder_location( $html, $part ) ) {
			return false;
		}
		return true;
	}

	/**
	 * @return bool
	 */
	private static function builder_locations_active() {
		return function_exists( 'elementor_theme_do_location' );
	}

	/**
	 * @param string $html
	 * @param string $part header|footer
	 * @return bool
	 */
	private static function has_builder_location( $html, $part ) {
		$part = 'footer' === $part ? 'footer' : 'header';
		return (bool) preg_match( '/elementor-location-' . $part . '|data-elementor-type=(["\'])' . $part . '\\1/i', (string) $html );
	}

	/**
	 * Header and footer taken from a public front-end page.
	 *
	 * Theme builders often print the footer only on a real page view. The editor
	 * request is not one, so the canvas reads the visitor HTML when local
	 * capture comes back empty.
	 *
	 * @param int $post_id
	 * @return array{header:string,footer:string}
	 */
	private static function public_parts( $post_id ) {
		if ( is_array( self::$public_parts ) ) {
			return self::$public_parts;
		}
		self::$public_parts = array(
			'header' => '',
			'footer' => '',
		);
		if ( self::$fetching ) {
			return self::$public_parts;
		}
		$html = self::fetch_public_html( $post_id );
		if ( '' === $html ) {
			return self::$public_parts;
		}
		self::$public_parts['header'] = self::extract_part( $html, 'header' );
		self::$public_parts['footer'] = self::extract_part( $html, 'footer' );
		return self::$public_parts;
	}

	/**
	 * @param int $post_id
	 * @return string
	 */
	private static function fetch_public_html( $post_id ) {
		if ( ! function_exists( 'wp_remote_get' ) || ! function_exists( 'home_url' ) ) {
			return '';
		}
		$urls  = self::page_urls( $post_id );
		$best  = '';
		self::$fetching = true;
		foreach ( $urls as $url ) {
			$body = self::http_get( $url );
			if ( '' === $body || self::is_login_html( $body ) ) {
				continue;
			}
			$footer = self::extract_part( $body, 'footer' );
			if ( ! self::looks_like_part( $footer, 'footer' ) ) {
				continue;
			}
			if ( '' === $best || self::has_builder_location( $footer, 'footer' ) ) {
				$best = $body;
			}
			if ( ! self::builder_locations_active() || self::has_builder_location( $footer, 'footer' ) ) {
				break;
			}
		}
		self::$fetching = false;
		return $best;
	}

	/**
	 * The page itself, including an unpublished preview, before the homepage.
	 * A footer condition scoped to this page does not match the homepage.
	 *
	 * @param int $post_id
	 * @return string[]
	 */
	private static function page_urls( $post_id ) {
		$urls    = array();
		$post_id = absint( $post_id );
		if ( $post_id && function_exists( 'get_permalink' ) ) {
			$status = function_exists( 'get_post_status' ) ? (string) get_post_status( $post_id ) : '';
			$link   = get_permalink( $post_id );
			$link   = is_string( $link ) ? $link : '';
			if ( '' !== $link && 'publish' === $status ) {
				$urls[] = $link;
			}
			if ( function_exists( 'get_preview_post_link' ) ) {
				$preview = get_preview_post_link( $post_id );
				if ( is_string( $preview ) && '' !== $preview ) {
					$urls[] = $preview;
				}
			} elseif ( '' !== $link ) {
				$urls[] = $link . ( false === strpos( $link, '?' ) ? '?' : '&' ) . 'preview=true';
			}
		}
		if ( function_exists( 'home_url' ) ) {
			$urls[] = home_url( '/' );
		}
		return array_values( array_unique( array_filter( $urls ) ) );
	}

	/**
	 * @param string $html
	 * @return bool
	 */
	private static function is_login_html( $html ) {
		return (bool) preg_match( '/<form\b[^>]*\baction=(["\'])[^"\']*wp-login\.php/i', (string) $html );
	}

	/**
	 * @param string $url
	 * @return string
	 */
	private static function http_get( $url ) {
		$args = array(
			'timeout'     => 12,
			'redirection' => 3,
			'blocking'    => true,
			'headers'     => array(
				'Cache-Control' => 'no-cache',
			),
		);
		// A loopback request to the site's own domain (self::same_site())
		// is what this fallback almost always is. Many hosts fail that
		// request on a bad/self-signed local cert or a strict SSL config
		// that a real visitor's browser never hits; relaxing verification
		// only for that same-site case keeps the header/footer fallback
		// working without weakening verification for any external host.
		if ( self::same_site( $url ) ) {
			$args['sslverify'] = false;
			$url                = add_query_arg( array( 'sidcraft_syntex_chrome' => '1', '_' => (string) time() ), $url );
		}
		$cookies = self::auth_cookies( $url );
		if ( $cookies ) {
			$args['cookies'] = $cookies;
		}
		$response = wp_remote_get( $url, $args );
		if ( function_exists( 'is_wp_error' ) && is_wp_error( $response ) ) {
			if ( function_exists( 'error_log' ) && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				error_log( 'Sidcraft Syntex: theme-chrome fetch of ' . $url . ' failed: ' . $response->get_error_message() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			}
			return '';
		}
		$code = function_exists( 'wp_remote_retrieve_response_code' ) ? (int) wp_remote_retrieve_response_code( $response ) : 0;
		if ( $code < 200 || $code >= 400 ) {
			return '';
		}
		return function_exists( 'wp_remote_retrieve_body' ) ? (string) wp_remote_retrieve_body( $response ) : '';
	}

	/**
	 * Logged-in cookies so a draft preview resolves the same footer visitors of that page see.
	 *
	 * @param string $url
	 * @return array<int, array{name:string,value:string}>
	 */
	private static function auth_cookies( $url ) {
		if ( empty( $_COOKIE ) || ! is_array( $_COOKIE ) || ! self::same_site( $url ) ) {
			return array();
		}
		$cookies = array();
		foreach ( $_COOKIE as $name => $value ) {
			if ( ! is_string( $name ) || '' === $name || ! is_scalar( $value ) ) {
				continue;
			}
			$cookies[] = array(
				'name'  => $name,
				'value' => function_exists( 'wp_unslash' ) ? (string) wp_unslash( $value ) : (string) $value,
			);
			if ( count( $cookies ) >= 20 ) {
				break;
			}
		}
		return $cookies;
	}

	/**
	 * @param string $url
	 * @return bool
	 */
	private static function same_site( $url ) {
		if ( ! function_exists( 'home_url' ) || ! function_exists( 'wp_parse_url' ) ) {
			return false;
		}
		$home   = wp_parse_url( home_url( '/' ) );
		$target = wp_parse_url( (string) $url );
		$home_host   = is_array( $home ) && isset( $home['host'] ) ? strtolower( (string) $home['host'] ) : '';
		$target_host = is_array( $target ) && isset( $target['host'] ) ? strtolower( (string) $target['host'] ) : '';
		return '' !== $home_host && $home_host === $target_host;
	}

	/**
	 * Pull one chrome landmark, plus the style tags printed beside it, out of a full page.
	 *
	 * @param string $html
	 * @param string $part header|footer
	 * @return string
	 */
	public static function extract_part( $html, $part ) {
		$part = 'footer' === $part ? 'footer' : 'header';
		$html = (string) $html;
		if ( '' === trim( $html ) || ! class_exists( 'DOMDocument' ) ) {
			return '';
		}
		$dom  = new \DOMDocument();
		$prev = libxml_use_internal_errors( true );
		$dom->loadHTML( '<?xml encoding="utf-8">' . $html );
		libxml_clear_errors();
		libxml_use_internal_errors( $prev );
		$node = self::find_part_node( $dom, $part );
		if ( ! $node ) {
			return '';
		}
		$assets = self::head_assets( $dom );
		$walk   = $node->previousSibling;
		while ( $walk ) {
			if ( $walk instanceof \DOMText && '' === trim( $walk->textContent ) ) {
				$walk = $walk->previousSibling;
				continue;
			}
			if ( $walk instanceof \DOMElement && in_array( strtolower( $walk->tagName ), array( 'link', 'style' ), true ) ) {
				$assets = $dom->saveHTML( $walk ) . $assets;
				$walk   = $walk->previousSibling;
				continue;
			}
			break;
		}
		$out = self::safe_html( $assets . $dom->saveHTML( $node ) );
		if ( strlen( $out ) > self::MAX_HTML ) {
			$out = \SidcraftSyntex\Utils\Text::cut_bytes( $out, 0, self::MAX_HTML );
		}
		return trim( $out );
	}

	/**
	 * Styles printed for a builder footer live in the document head, not inside the landmark.
	 *
	 * @param \DOMDocument $dom
	 * @return string
	 */
	private static function head_assets( $dom ) {
		$head = $dom->getElementsByTagName( 'head' )->item( 0 );
		if ( ! $head ) {
			return '';
		}
		$out = '';
		foreach ( $head->childNodes as $child ) {
			if ( ! $child instanceof \DOMElement ) {
				continue;
			}
			$tag = strtolower( $child->tagName );
			if ( 'style' === $tag ) {
				$out .= $dom->saveHTML( $child );
				continue;
			}
			if ( 'link' !== $tag ) {
				continue;
			}
			$rel = strtolower( $child->getAttribute( 'rel' ) );
			if ( ! preg_match( '/(^|\s)stylesheet(\s|$)/', $rel ) ) {
				continue;
			}
			$out .= $dom->saveHTML( $child );
		}
		return $out;
	}

	/**
	 * @param \DOMDocument $dom
	 * @param string       $part
	 * @return \DOMElement|null
	 */
	private static function find_part_node( $dom, $part ) {
		$strict         = null;
		$loose_best     = null;
		$loose_best_len = -1;
		foreach ( $dom->getElementsByTagName( '*' ) as $el ) {
			if ( ! $el instanceof \DOMElement ) {
				continue;
			}
			if ( self::has_part_ancestor( $el, $part ) ) {
				continue;
			}
			if ( self::is_strict_landmark( $el, $part ) ) {
				if ( null === $strict ) {
					$strict = $el;
				}
				continue;
			}
			if ( ! self::is_part_landmark( $el, $part ) ) {
				continue;
			}
			// A class/id name merely containing "footer" (e.g. a mobile
			// off-canvas menu's duplicated footer widgets, a cookie banner,
			// a popup appended near the end of the body) is common on real
			// sites and can otherwise out-rank the genuine footer just by
			// appearing later in the document. Score by visible content
			// instead of position so the real, fullest landmark wins.
			$len = \SidcraftSyntex\Utils\Text::length( trim( preg_replace( '/\s+/', ' ', (string) $el->textContent ) ) );
			if ( $len > $loose_best_len ) {
				$loose_best     = $el;
				$loose_best_len = $len;
			}
		}
		return $strict ? $strict : $loose_best;
	}

	/**
	 * Unambiguous landmark: a real <header>/<footer> tag, matching ARIA
	 * role, Elementor location type, or a canonical id. Unlike the broader
	 * class/id token matching in is_part_landmark(), these signals are
	 * reliable enough that the first one found can be trusted outright.
	 *
	 * @param \DOMElement $el
	 * @param string      $part header|footer
	 * @return bool
	 */
	private static function is_strict_landmark( $el, $part ) {
		$part = 'footer' === $part ? 'footer' : 'header';
		$tag  = strtolower( $el->tagName );
		$id   = strtolower( $el->getAttribute( 'id' ) );
		$role = strtolower( $el->getAttribute( 'role' ) );
		$type = strtolower( $el->getAttribute( 'data-elementor-type' ) );
		if ( 'footer' === $part ) {
			return 'footer' === $tag || 'footer' === $type || 'contentinfo' === $role || in_array( $id, array( 'colophon', 'site-footer', 'footer' ), true );
		}
		return 'header' === $tag || 'header' === $type || 'banner' === $role || in_array( $id, array( 'masthead', 'site-header', 'header' ), true );
	}

	/**
	 * @param \DOMElement $el
	 * @param string      $part
	 * @return bool
	 */
	private static function has_part_ancestor( $el, $part ) {
		$parent = $el->parentNode;
		while ( $parent instanceof \DOMElement ) {
			if ( self::is_part_landmark( $parent, $part ) ) {
				return true;
			}
			$parent = $parent->parentNode;
		}
		return false;
	}

	/**
	 * Keep the visible header/footer fragment and its styles. Drop the document
	 * shell and active content so the editor iframe can show the theme chrome.
	 *
	 * @param string $html
	 * @return string
	 */
	public static function fragment( $html ) {
		$html = (string) $html;
		if ( $html === '' ) {
			return '';
		}
		$styles = '';
		if ( preg_match( '#<head\b[^>]*>(.*?)</head>#is', $html, $head ) ) {
			if ( preg_match_all( '#<link\b[^>]*>#i', $head[1], $links ) ) {
				foreach ( $links[0] as $tag ) {
					if ( preg_match( '#\brel\s*=\s*([\'"])stylesheet\1#i', $tag ) || preg_match( '#\brel\s*=\s*stylesheet\b#i', $tag ) ) {
						$styles .= $tag;
					}
				}
			}
			if ( preg_match_all( '#<style\b[^>]*>.*?</style>#is', $head[1], $blocks ) ) {
				$styles .= implode( '', $blocks[0] );
			}
			$html = preg_replace( '#<head\b[^>]*>.*?</head>#is', '', $html );
		}
		$html = preg_replace( '#<!DOCTYPE[^>]*>#i', '', (string) $html );
		$html = preg_replace( '#</?(?:html|body)\b[^>]*>#i', '', (string) $html );
		$html = self::strip_active( $styles . (string) $html );
		$html = self::drop_stray_closers( $html );
		$html = self::isolate( $html );
		if ( strlen( $html ) > self::MAX_HTML ) {
			$html = \SidcraftSyntex\Utils\Text::cut_bytes( $html, 0, self::MAX_HTML );
		}
		return trim( $html );
	}

	/**
	 * footer.php closes wrappers header.php opened, so the fragment starts with
	 * closing tags. Wrapped for parsing, the first stray </div> would close the
	 * wrapper and push the footer outside it.
	 *
	 * @param string $html
	 * @return string
	 */
	public static function drop_stray_closers( $html ) {
		$html = (string) $html;
		if ( false === strpos( $html, '</' ) ) {
			return $html;
		}
		$void  = array( 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr' );
		$stack = array();
		$out   = preg_replace_callback(
			'#<!--.*?-->|<(style|textarea|title)\b[^>]*>.*?</\1\s*>|<(/?)([a-zA-Z][a-zA-Z0-9:-]*)\b[^>]*>#is',
			function ( $m ) use ( &$stack, $void ) {
				if ( ! isset( $m[3] ) || '' === $m[3] ) {
					return $m[0];
				}
				$name = strtolower( $m[3] );
				if ( '/' !== $m[2] ) {
					if ( ! in_array( $name, $void, true ) && '/>' !== substr( $m[0], -2 ) ) {
						$stack[] = $name;
					}
					return $m[0];
				}
				$at = array_search( $name, array_reverse( $stack, true ), true );
				if ( false === $at ) {
					return '';
				}
				array_splice( $stack, $at );
				return $m[0];
			},
			$html
		);
		return is_string( $out ) ? $out : $html;
	}

	/**
	 * True when the fragment shows something: text, an image, or an icon.
	 *
	 * @param string $html
	 * @return bool
	 */
	public static function visible_html( $html ) {
		$html = preg_replace( '#<(style|script|noscript|template)\b[^>]*>.*?</\1\s*>#is', '', (string) $html );
		$html = preg_replace( '#<link\b[^>]*>#i', '', (string) $html );
		if ( preg_match( '#<(img|svg|picture|video|canvas)\b#i', (string) $html ) ) {
			return true;
		}
		$text = html_entity_decode( wp_strip_all_tags( (string) $html ), ENT_QUOTES, 'UTF-8' );
		return '' !== trim( preg_replace( '/[\s\x{00A0}]+/u', ' ', (string) $text ) );
	}

	/**
	 * Drop the document shell header.php and footer.php leave around the bar.
	 *
	 * Those files open #page and #content and close them in the other file.
	 * Kept as an empty well, theme CSS often gives that well min-height:100vh
	 * and a white background, so the editor canvas and the page content sit
	 * under a blank viewport. Preloaders stay up too, because their hide
	 * script is stripped with the rest of the active markup.
	 *
	 * @param string $html
	 * @return string
	 */
	public static function isolate( $html ) {
		$html = self::drop_stray_closers( (string) $html );
		if ( '' === trim( $html ) || ! class_exists( 'DOMDocument' ) ) {
			return $html;
		}
		$out = self::isolate_dom( $html );
		if ( ! self::visible_html( $out ) && self::visible_html( $html ) ) {
			return trim( $html );
		}
		return $out;
	}

	/**
	 * @param string $html
	 * @return string
	 */
	private static function isolate_dom( $html ) {
		$dom  = new \DOMDocument();
		$prev = libxml_use_internal_errors( true );
		$dom->loadHTML( '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><div id="lb-chrome-root">' . $html . '</div></body></html>' );
		libxml_clear_errors();
		libxml_use_internal_errors( $prev );
		$found = ( new \DOMXPath( $dom ) )->query( '//*[@id="lb-chrome-root"]' );
		$root  = ( $found && $found->length ) ? $found->item( 0 ) : null;
		if ( ! $root ) {
			return $html;
		}
		$head = $dom->getElementsByTagName( 'head' )->item( 0 );
		if ( $head ) {
			$hoisted = array();
			foreach ( $head->childNodes as $child ) {
				if ( $child instanceof \DOMElement && in_array( strtolower( $child->tagName ), array( 'link', 'style' ), true ) ) {
					$hoisted[] = $child;
				}
			}
			foreach ( $hoisted as $el ) {
				$root->insertBefore( $el, $root->firstChild );
			}
		}
		self::prune_shells( $root );
		$out = '';
		foreach ( iterator_to_array( $root->childNodes ) as $child ) {
			$out .= $dom->saveHTML( $child );
		}
		return trim( $out );
	}

	/**
	 * @param \DOMNode $node
	 */
	private static function prune_shells( $node ) {
		if ( ! $node->hasChildNodes() ) {
			return;
		}
		$children = array();
		foreach ( $node->childNodes as $child ) {
			$children[] = $child;
		}
		foreach ( $children as $child ) {
			if ( ! $child instanceof \DOMElement || ! $child->parentNode ) {
				continue;
			}
			if ( self::is_preloader( $child ) && ! self::is_chrome_landmark( $child ) && ! self::has_landmark( $child ) && ! self::has_visible( $child ) ) {
				$child->parentNode->removeChild( $child );
				continue;
			}
			if ( self::is_content_well( $child ) ) {
				if ( self::has_landmark( $child ) || self::has_visible( $child ) ) {
					self::unwrap( $child );
					self::prune_shells( $node );
					return;
				}
				$child->parentNode->removeChild( $child );
				continue;
			}
			if ( self::is_page_shell( $child ) ) {
				self::unwrap( $child );
				self::prune_shells( $node );
				return;
			}
			self::prune_shells( $child );
		}
	}

	/**
	 * @param \DOMElement $el
	 */
	private static function unwrap( $el ) {
		$parent = $el->parentNode;
		if ( ! $parent ) {
			return;
		}
		while ( $el->firstChild ) {
			$parent->insertBefore( $el->firstChild, $el );
		}
		$parent->removeChild( $el );
	}

	/**
	 * @param \DOMElement $el
	 * @return bool
	 */
	private static function has_landmark( $el ) {
		if ( self::is_chrome_landmark( $el ) ) {
			return true;
		}
		foreach ( $el->getElementsByTagName( '*' ) as $child ) {
			if ( $child instanceof \DOMElement && self::is_chrome_landmark( $child ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Header and footer bars, including Elementor theme-builder markup that
	 * uses a div instead of a footer element.
	 *
	 * @param \DOMElement $el
	 * @return bool
	 */
	private static function is_chrome_landmark( $el ) {
		return self::is_part_landmark( $el, 'header' ) || self::is_part_landmark( $el, 'footer' );
	}

	/**
	 * @param \DOMElement $el
	 * @param string      $part header|footer
	 * @return bool
	 */
	private static function is_part_landmark( $el, $part ) {
		$part    = 'footer' === $part ? 'footer' : 'header';
		$tag     = strtolower( $el->tagName );
		$id      = strtolower( $el->getAttribute( 'id' ) );
		$role    = strtolower( $el->getAttribute( 'role' ) );
		$type    = strtolower( $el->getAttribute( 'data-elementor-type' ) );
		$tokens  = self::class_tokens( $el );
		if ( '' !== $id ) {
			$tokens[] = $id;
		}
		$footer  = 'footer' === $tag || 'footer' === $type || 'contentinfo' === $role || in_array( $id, array( 'colophon', 'site-footer', 'footer' ), true );
		$header  = 'header' === $tag || 'header' === $type || 'banner' === $role || in_array( $id, array( 'masthead', 'site-header', 'header' ), true );
		foreach ( $tokens as $token ) {
			if ( preg_match( '/(^|-)(footer|colophon)($|-)/', $token ) ) {
				$footer = true;
			}
			if ( preg_match( '/(^|-)(header|masthead)($|-)/', $token ) && false === strpos( $token, 'content' ) ) {
				$header = true;
			}
		}
		if ( 'footer' === $part ) {
			return $footer;
		}
		if ( $footer ) {
			return false;
		}
		if ( 'nav' === $tag && ! self::inside_part( $el, 'footer' ) ) {
			return true;
		}
		return $header;
	}

	/**
	 * @param \DOMElement $el
	 * @param string      $part
	 * @return bool
	 */
	private static function inside_part( $el, $part ) {
		$parent = $el->parentNode;
		while ( $parent instanceof \DOMElement ) {
			if ( self::is_part_landmark( $parent, $part ) ) {
				return true;
			}
			$parent = $parent->parentNode;
		}
		return false;
	}

	/**
	 * @param \DOMElement $el
	 * @return bool
	 */
	private static function has_visible( $el ) {
		$text = trim( preg_replace( '/\s+/', ' ', $el->textContent ) );
		if ( '' !== $text ) {
			return true;
		}
		foreach ( array( 'img', 'svg', 'picture', 'video' ) as $tag ) {
			if ( $el->getElementsByTagName( $tag )->length > 0 ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param \DOMElement $el
	 * @return string[]
	 */
	private static function class_tokens( $el ) {
		$class = strtolower( $el->getAttribute( 'class' ) );
		$parts = preg_split( '/\s+/', $class, -1, PREG_SPLIT_NO_EMPTY );
		return is_array( $parts ) ? $parts : array();
	}

	/**
	 * @param \DOMElement $el
	 * @return bool
	 */
	private static function is_preloader( $el ) {
		$id     = strtolower( $el->getAttribute( 'id' ) );
		$tokens = self::class_tokens( $el );
		if ( in_array( $id, array( 'preloader', 'page-loader', 'loader', 'loading', 'site-loader', 'qloverlay' ), true ) ) {
			return true;
		}
		foreach ( $tokens as $token ) {
			if ( in_array( $token, array( 'preloader', 'page-loader', 'site-loader', 'loading-screen', 'loader-wrapper', 'preloader-wrap' ), true ) ) {
				return true;
			}
		}
		$style = strtolower( $el->getAttribute( 'style' ) );
		if ( '' === $style || ! preg_match( '/position\s*:\s*fixed/', $style ) ) {
			return false;
		}
		$covers = preg_match( '/(?:inset\s*:\s*0|height\s*:\s*100(?:%|vh)|bottom\s*:\s*0)/', $style ) && preg_match( '/(?:width\s*:\s*100%|left\s*:\s*0|inset\s*:\s*0)/', $style );
		return (bool) $covers;
	}

	/**
	 * @param \DOMElement $el
	 * @return bool
	 */
	private static function is_content_well( $el ) {
		$tag = strtolower( $el->tagName );
		if ( 'header' === $tag || 'footer' === $tag ) {
			return false;
		}
		$id = strtolower( $el->getAttribute( 'id' ) );
		if ( in_array( $id, array( 'content', 'primary', 'main', 'content-wrap', 'primary-content' ), true ) ) {
			return true;
		}
		if ( 'main' === $tag ) {
			return true;
		}
		$tokens = self::class_tokens( $el );
		foreach ( $tokens as $token ) {
			if ( in_array( $token, array( 'site-content', 'content-area', 'site-main', 'content-wrap' ), true ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param \DOMElement $el
	 * @return bool
	 */
	private static function is_page_shell( $el ) {
		$tag = strtolower( $el->tagName );
		if ( 'header' === $tag || 'footer' === $tag || 'nav' === $tag ) {
			return false;
		}
		$id = strtolower( $el->getAttribute( 'id' ) );
		if ( in_array( $id, array( 'page', 'wrapper', 'wrap' ), true ) ) {
			return true;
		}
		$tokens = self::class_tokens( $el );
		foreach ( $tokens as $token ) {
			if ( in_array( $token, array( 'site', 'hfeed' ), true ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param string $html
	 * @return string
	 */
	/**
	 * Drop scripts and inline handlers from theme or editor HTML.
	 *
	 * @param string $html
	 * @return string
	 */
	public static function safe_html( $html ) {
		return self::strip_active( (string) $html );
	}

	/**
	 * @param string $html
	 * @return string
	 */
	private static function strip_active( $html ) {
		$html = preg_replace( '#<(script|iframe|object|embed)\b[^>]*>.*?</\1>#is', '', (string) $html );
		$html = preg_replace( '#<(script|iframe|object|embed)\b[^>]*\/?>#i', '', (string) $html );
		$html = preg_replace( '#\son[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)#i', '', (string) $html );
		$html = preg_replace( '#javascript\s*:#i', '', (string) $html );
		return (string) $html;
	}
}
