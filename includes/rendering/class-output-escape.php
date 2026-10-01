<?php
/**
 * Late escaping for rendered builder documents.
 *
 * Units escape their own settings as they render, and the finished document
 * then goes through wp_kses() once more with a builder allowlist before it
 * reaches the_content, the template block or a template shortcode. Only the
 * outermost render is filtered: a template embedded inside a page is
 * escaped with the page.
 *
 * Output that the builder hands over from other code (shortcodes, widget
 * areas, JSON-LD built with wp_json_encode) is marked with raw() and passes
 * through unchanged, the same as WordPress itself treats shortcode output.
 *
 * @package SidcraftSyntex
 */

namespace SidcraftSyntex\Rendering;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class OutputEscape {

	/** @var int Nesting depth of render() calls. */
	private static $depth = 0;

	/** @var string[] Raw fragments, keyed by placeholder index. */
	private static $raw = array();

	/** @var string|null Per-request token so stored content cannot forge a placeholder. */
	private static $token = null;

	/** @var array|null */
	private static $allowed = null;

	/** @var int Number of raw() calls this request, inside render() or not. */
	private static $marks = 0;

	/**
	 * Raw-fragment counter. Unit HTML that grew it during a render holds
	 * request-specific placeholders and must not go into the fragment cache.
	 *
	 * @return int
	 */
	public static function marks() {
		return self::$marks;
	}

	/**
	 * Run a document render and escape its HTML when it is the outermost one.
	 *
	 * @param callable $render Returns the document HTML.
	 * @return string
	 */
	public static function render( callable $render ) {
		++self::$depth;
		try {
			$html = (string) call_user_func( $render );
		} finally {
			--self::$depth;
		}
		if ( self::$depth > 0 ) {
			return $html;
		}
		$html      = self::html( $html );
		self::$raw = array();
		return $html;
	}

	/**
	 * Pass HTML produced by other code through the final kses pass unchanged.
	 * Outside render() (the editor canvas) the HTML is returned as is.
	 *
	 * @param string $html
	 * @return string
	 */
	public static function raw( $html ) {
		$html = (string) $html;
		++self::$marks;
		if ( self::$depth < 1 || '' === $html ) {
			return $html;
		}
		if ( null === self::$token ) {
			self::$token = function_exists( 'wp_generate_password' ) ? wp_generate_password( 16, false ) : md5( uniqid( '', true ) );
		}
		$key               = count( self::$raw );
		self::$raw[ $key ] = $html;
		return '<!--sidsyn-raw:' . self::$token . ':' . $key . '-->';
	}

	/**
	 * Filter document HTML through wp_kses() with the builder allowlist.
	 *
	 * @param string $html
	 * @return string
	 */
	public static function html( $html ) {
		$html = (string) $html;
		if ( '' === $html || ! function_exists( 'wp_kses' ) ) {
			return $html;
		}
		add_filter( 'safe_style_css', array( self::class, 'style_properties' ) );
		add_filter( 'safecss_filter_attr_allow_css', array( self::class, 'allow_css' ), 10, 2 );
		try {
			$html = wp_kses( $html, self::allowed_html() );
		} finally {
			remove_filter( 'safe_style_css', array( self::class, 'style_properties' ) );
			remove_filter( 'safecss_filter_attr_allow_css', array( self::class, 'allow_css' ), 10 );
		}
		if ( self::$raw && null !== self::$token ) {
			$html = preg_replace_callback(
				'/<!--sidsyn-raw:' . preg_quote( self::$token, '/' ) . ':(\d+)-->/',
				function ( $m ) {
					return self::$raw[ (int) $m[1] ] ?? '';
				},
				$html
			);
		}
		return $html;
	}

	/**
	 * Tags and attributes units render: post content tags plus SVG, form
	 * controls, embeds and media.
	 *
	 * @return array
	 */
	public static function allowed_html() {
		if ( null !== self::$allowed ) {
			return self::$allowed;
		}
		$global = array_fill_keys(
			array(
				'class', 'id', 'style', 'title', 'role', 'hidden', 'tabindex', 'lang', 'dir', 'data-*',
				'itemprop', 'itemscope', 'itemtype', 'itemid', 'draggable', 'inert', 'translate', 'part',
				'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'aria-expanded',
				'aria-controls', 'aria-current', 'aria-selected', 'aria-live', 'aria-atomic', 'aria-busy',
				'aria-haspopup', 'aria-pressed', 'aria-checked', 'aria-disabled', 'aria-modal',
				'aria-orientation', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext',
				'aria-roledescription', 'aria-level', 'aria-posinset', 'aria-setsize', 'aria-required',
				'aria-invalid', 'aria-owns', 'aria-autocomplete', 'aria-multiselectable', 'aria-details',
			),
			true
		);
		$tags  = array(
			'a'              => array( 'href', 'target', 'rel', 'download', 'hreflang', 'type', 'referrerpolicy', 'name' ),
			'img'            => array( 'src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding', 'fetchpriority', 'usemap', 'crossorigin' ),
			'picture'        => array(),
			'source'         => array( 'src', 'srcset', 'sizes', 'type', 'media', 'width', 'height' ),
			'track'          => array( 'kind', 'src', 'srclang', 'label', 'default' ),
			'video'          => array( 'src', 'poster', 'controls', 'autoplay', 'muted', 'loop', 'playsinline', 'preload', 'width', 'height', 'disablepictureinpicture', 'disableremoteplayback', 'controlslist', 'crossorigin' ),
			'audio'          => array( 'src', 'controls', 'autoplay', 'muted', 'loop', 'preload', 'crossorigin' ),
			'iframe'         => array( 'src', 'srcdoc', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy', 'name', 'sandbox', 'scrolling' ),
			'canvas'         => array( 'width', 'height' ),
			'form'           => array( 'action', 'method', 'enctype', 'novalidate', 'target', 'name', 'autocomplete', 'accept-charset', 'rel' ),
			'input'          => array( 'type', 'name', 'value', 'placeholder', 'required', 'checked', 'disabled', 'readonly', 'min', 'max', 'step', 'pattern', 'minlength', 'maxlength', 'size', 'autocomplete', 'autofocus', 'multiple', 'accept', 'list', 'form', 'inputmode', 'spellcheck', 'enterkeyhint', 'alt', 'src', 'width', 'height' ),
			'select'         => array( 'name', 'multiple', 'required', 'disabled', 'size', 'autocomplete', 'form' ),
			'option'         => array( 'value', 'selected', 'disabled', 'label' ),
			'optgroup'       => array( 'label', 'disabled' ),
			'textarea'       => array( 'name', 'rows', 'cols', 'placeholder', 'required', 'disabled', 'readonly', 'maxlength', 'minlength', 'autocomplete', 'wrap', 'form', 'spellcheck' ),
			'button'         => array( 'type', 'name', 'value', 'disabled', 'form', 'popovertarget', 'popovertargetaction' ),
			'label'          => array( 'for', 'form' ),
			'fieldset'       => array( 'disabled', 'name', 'form' ),
			'legend'         => array(),
			'output'         => array( 'for', 'name', 'form' ),
			'datalist'       => array(),
			'progress'       => array( 'value', 'max' ),
			'meter'          => array( 'value', 'min', 'max', 'low', 'high', 'optimum' ),
			'details'        => array( 'open', 'name' ),
			'summary'        => array(),
			'dialog'         => array( 'open' ),
			'time'           => array( 'datetime' ),
			'data'           => array( 'value' ),
			'meta'           => array( 'content', 'name' ),
			'main'           => array(),
			'search'         => array(),
			'noscript'       => array(),
			'template'       => array(),
			'slot'           => array( 'name' ),
			'svg'            => array( 'viewbox', 'xmlns', 'xmlns:xlink', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'focusable', 'preserveaspectratio', 'version', 'x', 'y', 'overflow' ),
			'g'              => array( 'visibility', 'fill', 'stroke', 'stroke-width', 'transform', 'opacity', 'clip-path', 'mask', 'filter' ),
			'path'           => array( 'd', 'fill', 'fill-rule', 'clip-rule', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'transform', 'opacity', 'pathlength', 'vector-effect' ),
			'circle'         => array( 'cx', 'cy', 'r', 'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'transform', 'opacity', 'pathlength', 'vector-effect' ),
			'ellipse'        => array( 'cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'transform', 'opacity' ),
			'rect'           => array( 'x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'fill-opacity', 'stroke', 'stroke-width', 'transform', 'opacity' ),
			'line'           => array( 'x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-dasharray', 'transform', 'opacity', 'vector-effect' ),
			'polyline'       => array( 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'transform', 'opacity' ),
			'polygon'        => array( 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linejoin', 'transform', 'opacity' ),
			'defs'           => array(),
			'lineargradient' => array( 'x1', 'y1', 'x2', 'y2', 'gradientunits', 'gradienttransform', 'spreadmethod', 'href' ),
			'radialgradient' => array( 'cx', 'cy', 'r', 'fx', 'fy', 'gradientunits', 'gradienttransform', 'spreadmethod', 'href' ),
			'stop'           => array( 'offset', 'stop-color', 'stop-opacity' ),
			'clippath'       => array( 'clippathunits' ),
			'mask'           => array( 'x', 'y', 'width', 'height', 'maskunits', 'maskcontentunits' ),
			'pattern'        => array( 'x', 'y', 'width', 'height', 'patternunits', 'patterncontentunits', 'patterntransform', 'viewbox' ),
			'symbol'         => array( 'viewbox', 'preserveaspectratio', 'width', 'height' ),
			'use'            => array( 'href', 'xlink:href', 'x', 'y', 'width', 'height', 'fill', 'stroke' ),
			'text'           => array( 'visibility', 'x', 'y', 'dx', 'dy', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'letter-spacing', 'fill', 'stroke', 'transform', 'textlength', 'lengthadjust' ),
			'tspan'          => array( 'visibility', 'x', 'y', 'dx', 'dy', 'text-anchor', 'dominant-baseline', 'font-size', 'font-weight', 'fill' ),
			'textpath'       => array( 'href', 'xlink:href', 'startoffset', 'method', 'spacing', 'side', 'textlength', 'lengthadjust', 'text-anchor' ),
			'desc'           => array(),
			'foreignobject'  => array( 'x', 'y', 'width', 'height' ),
		);
		$allowed = wp_kses_allowed_html( 'post' );
		foreach ( $tags as $tag => $attrs ) {
			$allowed[ $tag ] = array_merge( $allowed[ $tag ] ?? array(), array_fill_keys( $attrs, true ) );
		}
		foreach ( $allowed as $tag => $attrs ) {
			$allowed[ $tag ] = array_merge( is_array( $attrs ) ? $attrs : array(), $global );
		}
		self::$allowed = $allowed;
		return $allowed;
	}

	/**
	 * CSS properties units write into style attributes, added to the
	 * safe_style_css list while a document is filtered.
	 *
	 * @param string[] $props
	 * @return string[]
	 */
	public static function style_properties( $props ) {
		$extra = array(
			'accent-color', 'align-content', 'align-items', 'align-self', 'animation', 'animation-delay', 'animation-direction',
			'animation-duration', 'animation-fill-mode', 'animation-iteration-count', 'animation-name', 'animation-play-state',
			'animation-timing-function', 'appearance', 'aspect-ratio', 'backdrop-filter', 'backface-visibility',
			'background-attachment', 'background-blend-mode', 'background-clip', 'background-origin', 'background-position-x',
			'background-position-y', 'block-size', 'border-block', 'border-block-end', 'border-block-start', 'border-end-end-radius',
			'border-end-start-radius', 'border-image', 'border-inline', 'border-inline-end', 'border-inline-start',
			'border-start-end-radius', 'border-start-start-radius', 'bottom', 'box-sizing', 'caret-color', 'clip-path', 'color-scheme',
			'column-fill', 'columns', 'contain', 'container', 'container-name', 'container-type', 'content-visibility', 'cursor', 'display',
			'fill', 'fill-opacity', 'filter', 'flex', 'flex-basis', 'flex-direction', 'flex-flow', 'flex-grow', 'flex-shrink', 'flex-wrap',
			'float', 'font-feature-settings', 'font-variation-settings', 'gap', 'grid-area', 'grid-auto-columns', 'grid-auto-flow',
			'grid-auto-rows', 'grid-column', 'grid-column-end', 'grid-column-start', 'grid-row', 'grid-row-end', 'grid-row-start',
			'grid-template', 'grid-template-areas', 'grid-template-columns', 'grid-template-rows', 'hyphens', 'inline-size', 'inset',
			'inset-block', 'inset-block-end', 'inset-block-start', 'inset-inline', 'inset-inline-end', 'inset-inline-start', 'isolation',
			'justify-content', 'justify-items', 'justify-self', 'left', 'line-clamp', '-webkit-line-clamp', '-webkit-box-orient',
			'mask', 'mask-image', 'mask-position', 'mask-repeat', 'mask-size', '-webkit-mask', '-webkit-mask-image', '-webkit-mask-position',
			'-webkit-mask-repeat', '-webkit-mask-size', 'max-block-size', 'max-inline-size', 'min-block-size', 'min-inline-size',
			'mix-blend-mode', 'object-fit', 'object-position', 'offset-path', 'offset-distance', 'opacity', 'order', 'outline',
			'outline-color', 'outline-offset', 'outline-style', 'outline-width', 'overflow-wrap', 'overflow-x', 'overflow-y',
			'overscroll-behavior', 'perspective', 'perspective-origin', 'place-content', 'place-items', 'place-self', 'pointer-events',
			'position', 'resize', 'right', 'rotate', 'row-gap', 'scale', 'scroll-behavior', 'scroll-margin', 'scroll-margin-top',
			'scroll-padding', 'scroll-snap-align', 'scroll-snap-type', 'scrollbar-width', 'stroke', 'stroke-dasharray',
			'stroke-dashoffset', 'stroke-linecap', 'stroke-width', 'tab-size', 'text-overflow', 'text-shadow', 'text-wrap',
			'-webkit-text-fill-color', '-webkit-text-stroke', '-webkit-background-clip', 'top', 'touch-action', 'transform',
			'transform-origin', 'transform-style', 'transition', 'transition-delay', 'transition-duration', 'transition-property',
			'transition-timing-function', 'translate', 'user-select', 'visibility', 'white-space', 'will-change', 'word-break', 'z-index', 'zoom',
		);
		return array_values( array_unique( array_merge( (array) $props, $extra ) ) );
	}

	/**
	 * Core rejects any style value containing a parenthesis outside var() and
	 * calc(), which drops rgba(), translate() and similar. Allow those, while
	 * still rejecting escapes, closing braces, comments and script-like values.
	 *
	 * @param bool   $allow
	 * @param string $test  The declaration with url(), var() and calc() removed.
	 * @return bool
	 */
	public static function allow_css( $allow, $test ) {
		if ( $allow ) {
			return true;
		}
		return ! preg_match( '%[\\\\}{<>]|/\*|expression\s*\(|javascript:|vbscript:|behaviou?r\s*:|-moz-binding|@import|url\s*\(%i', (string) $test );
	}
}
