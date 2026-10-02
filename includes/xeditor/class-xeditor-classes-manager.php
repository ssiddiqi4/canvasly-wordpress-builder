<?php
/**
 * XEditor Classes & Variables Manager (server side).
 *
 * One option holds the whole XEditor design layer:
 *
 *   variables: global tokens  -> CSS custom properties  --xe-var-{name}
 *   classes:   utility presets -> CSS classes            .xe-class-{name}
 *
 * Elements reference classes by name in `settings.xe_classes` (a stack). Class
 * rules have single-class specificity; element-local styles are emitted inside
 * :where() (zero specificity), so a stacked utility class always wins over a
 * local value. Among classes, the manager's `order` decides priority (a later
 * class in the stylesheet wins), which the editor exposes as drag-to-reorder.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\XEditor;

use SidcraftPageBuilder\Settings\Breakpoints;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XEditorClassesManager {
	const OPTION     = 'sidcraft_page_builder_xeditor_design';
	const CSS_OPTION = 'sidcraft_page_builder_xeditor_css';
	const VAR_PREFIX = '--xe-var-';
	const CLS_PREFIX = 'xe-class-';
	const STATES     = array( 'base', 'hover', 'focus', 'active', 'focus_visible' );
	const VAR_TYPES  = array( 'color', 'font', 'size', 'spacing', 'custom' );
	const MAX_ITEMS  = 400;

	/** @var array|null */
	private static $memo = null;

	/**
	 * Empty design document.
	 *
	 * @return array
	 */
	public static function blank() {
		return array(
			'version'   => 1,
			'variables' => array(),
			'classes'   => array(),
			'updated'   => '',
		);
	}

	/**
	 * Stored design, sanitized.
	 *
	 * @return array
	 */
	public static function get() {
		if ( null !== self::$memo ) {
			return self::$memo;
		}
		$raw        = function_exists( 'get_option' ) ? get_option( self::OPTION, array() ) : array();
		self::$memo = self::sanitize( is_array( $raw ) ? $raw : array() );
		return self::$memo;
	}

	/**
	 * Replace the design and rebuild the cached stylesheet.
	 *
	 * @param mixed $raw
	 * @return array Saved design.
	 */
	public static function save( $raw ) {
		$clean            = self::sanitize( is_array( $raw ) ? $raw : array() );
		$clean['updated'] = gmdate( 'c' );
		if ( function_exists( 'update_option' ) ) {
			update_option( self::OPTION, $clean, false );
			update_option( self::CSS_OPTION, self::compile( $clean ), false );
		}
		self::$memo = $clean;
		if ( function_exists( 'do_action' ) ) {
			do_action( 'sidcraft_page_builder_xeditor_design_saved', $clean );
		}
		return $clean;
	}

	/** Forget the per-request memo (tests, imports). */
	public static function flush() {
		self::$memo = null;
	}

	/* ------------------------------------------------------------------ *
	 * Sanitizing
	 * ------------------------------------------------------------------ */

	/**
	 * @param array $raw
	 * @return array
	 */
	public static function sanitize( array $raw ) {
		$out  = self::blank();
		$seen = array();
		foreach ( array_slice( (array) ( $raw['variables'] ?? array() ), 0, self::MAX_ITEMS ) as $v ) {
			$v = self::sanitize_variable( $v );
			if ( $v && ! isset( $seen[ 'v:' . $v['name'] ] ) ) {
				$seen[ 'v:' . $v['name'] ] = true;
				$out['variables'][]        = $v;
			}
		}
		foreach ( array_slice( (array) ( $raw['classes'] ?? array() ), 0, self::MAX_ITEMS ) as $i => $c ) {
			$c = self::sanitize_class( $c, $i );
			if ( $c && ! isset( $seen[ 'c:' . $c['name'] ] ) ) {
				$seen[ 'c:' . $c['name'] ] = true;
				$out['classes'][]          = $c;
			}
		}
		usort(
			$out['classes'],
			static function ( $a, $b ) {
				return $a['order'] <=> $b['order'];
			}
		);
		foreach ( $out['classes'] as $i => $c ) {
			$out['classes'][ $i ]['order'] = $i;
		}
		$out['updated'] = is_string( $raw['updated'] ?? null ) ? substr( preg_replace( '/[^0-9T:+\-Z]/', '', $raw['updated'] ), 0, 32 ) : '';
		return $out;
	}

	/**
	 * Token / class name: lowercase letters, digits and hyphens.
	 *
	 * @param mixed $name
	 * @return string
	 */
	public static function slug( $name ) {
		$name = strtolower( trim( (string) $name ) );
		$name = preg_replace( '/^(--xe-var-|xe-class-|\.|\$)/', '', $name );
		$name = preg_replace( '/[^a-z0-9-]+/', '-', $name );
		$name = trim( preg_replace( '/-+/', '-', $name ), '-' );
		if ( '' !== $name && ctype_digit( $name[0] ) ) {
			$name = 'x' . $name;
		}
		return substr( $name, 0, 48 );
	}

	/**
	 * @param mixed $v
	 * @return array|null
	 */
	private static function sanitize_variable( $v ) {
		if ( ! is_array( $v ) ) {
			return null;
		}
		$name = self::slug( $v['name'] ?? '' );
		if ( '' === $name ) {
			return null;
		}
		$type  = in_array( $v['type'] ?? '', self::VAR_TYPES, true ) ? $v['type'] : 'custom';
		$value = self::css_value( $v['value'] ?? '' );
		$out   = array(
			'id'     => self::id( $v['id'] ?? '', 'v' ),
			'name'   => $name,
			'label'  => self::text( $v['label'] ?? $name ),
			'type'   => $type,
			'value'  => $value,
			'values' => array(),
		);
		foreach ( (array) ( $v['values'] ?? array() ) as $bp => $val ) {
			$bp = self::breakpoint( $bp );
			if ( '' !== $bp && 'desktop' !== $bp ) {
				$val = self::css_value( $val );
				if ( '' !== $val ) {
					$out['values'][ $bp ] = $val;
				}
			}
		}
		return $out;
	}

	/**
	 * @param mixed $c
	 * @param int   $index
	 * @return array|null
	 */
	private static function sanitize_class( $c, $index = 0 ) {
		if ( ! is_array( $c ) ) {
			return null;
		}
		$name = self::slug( $c['name'] ?? '' );
		if ( '' === $name ) {
			return null;
		}
		$styles = array();
		foreach ( (array) ( $c['styles'] ?? array() ) as $state => $by_bp ) {
			$state = sanitize_key( (string) $state );
			if ( ! in_array( $state, self::STATES, true ) || ! is_array( $by_bp ) ) {
				continue;
			}
			foreach ( $by_bp as $bp => $props ) {
				$bp = self::breakpoint( $bp );
				if ( '' === $bp || ! is_array( $props ) ) {
					continue;
				}
				$clean = self::props( $props );
				if ( $clean ) {
					$styles[ $state ][ $bp ] = $clean;
				}
			}
		}
		return array(
			'id'     => self::id( $c['id'] ?? '', 'c' ),
			'name'   => $name,
			'label'  => self::text( $c['label'] ?? $name ),
			'order'  => isset( $c['order'] ) ? (int) $c['order'] : (int) $index,
			'styles' => $styles,
		);
	}

	/**
	 * @param array $props property => value
	 * @return array
	 */
	public static function props( array $props ) {
		$out = array();
		foreach ( $props as $prop => $value ) {
			$prop = strtolower( trim( (string) $prop ) );
			if ( ! preg_match( '/^-{0,2}[a-z][a-z0-9-]{0,60}$/', $prop ) ) {
				continue;
			}
			$value = self::css_value( $value );
			if ( '' !== $value ) {
				$out[ $prop ] = $value;
			}
			if ( count( $out ) >= 80 ) {
				break;
			}
		}
		return $out;
	}

	/**
	 * A single CSS value. `$name` shorthand expands to var(--xe-var-name).
	 *
	 * @param mixed $value
	 * @return string
	 */
	public static function css_value( $value ) {
		if ( is_array( $value ) || is_object( $value ) ) {
			return '';
		}
		$value = trim( (string) $value );
		$value = str_replace( array( '{', '}', ';', '<', '>', '\\' ), '', $value );
		if ( preg_match( '/(expression\s*\(|javascript:|@import|behavio(u)?r\s*:|-moz-binding)/i', $value ) ) {
			return '';
		}
		$value = preg_replace_callback(
			'/\$([a-z0-9][a-z0-9-]*)/i',
			static function ( $m ) {
				return 'var(' . self::VAR_PREFIX . self::slug( $m[1] ) . ')';
			},
			$value
		);
		return substr( $value, 0, 400 );
	}

	/**
	 * @param mixed $bp
	 * @return string
	 */
	private static function breakpoint( $bp ) {
		$bp    = sanitize_key( (string) $bp );
		$names = class_exists( Breakpoints::class ) ? Breakpoints::names() : array( 'desktop', 'tablet', 'mobile' );
		return in_array( $bp, $names, true ) ? $bp : '';
	}

	/**
	 * @param mixed  $id
	 * @param string $prefix
	 * @return string
	 */
	private static function id( $id, $prefix ) {
		$id = preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) $id );
		if ( '' === $id ) {
			$id = $prefix . '_' . substr( md5( uniqid( '', true ) ), 0, 10 );
		}
		return substr( $id, 0, 40 );
	}

	/**
	 * @param mixed $s
	 * @return string
	 */
	private static function text( $s ) {
		$s = function_exists( 'sanitize_text_field' ) ? sanitize_text_field( (string) $s ) : trim( wp_strip_all_tags( (string) $s ) );
		return substr( $s, 0, 80 );
	}

	/* ------------------------------------------------------------------ *
	 * Lookup
	 * ------------------------------------------------------------------ */

	/**
	 * @param string $name
	 * @return array|null
	 */
	public static function find_class( $name ) {
		$name = self::slug( $name );
		foreach ( self::get()['classes'] as $c ) {
			if ( $c['name'] === $name ) {
				return $c;
			}
		}
		return null;
	}

	/**
	 * @param string $name
	 * @return array|null
	 */
	public static function find_variable( $name ) {
		$name = self::slug( $name );
		foreach ( self::get()['variables'] as $v ) {
			if ( $v['name'] === $name ) {
				return $v;
			}
		}
		return null;
	}

	/**
	 * Stack of class names on a node's settings (array or space separated).
	 *
	 * @param mixed $value
	 * @return string[]
	 */
	public static function stack( $value ) {
		if ( is_string( $value ) ) {
			$value = preg_split( '/[\s,]+/', $value );
		}
		$out = array();
		foreach ( (array) $value as $name ) {
			$name = self::slug( is_scalar( $name ) ? $name : '' );
			if ( '' !== $name && ! in_array( $name, $out, true ) ) {
				$out[] = $name;
			}
			if ( count( $out ) >= 24 ) {
				break;
			}
		}
		return $out;
	}

	/**
	 * `xe-class-a xe-class-b` for a node's stack.
	 *
	 * @param mixed $value
	 * @return string
	 */
	public static function class_attr( $value ) {
		$names = self::stack( $value );
		return $names ? self::CLS_PREFIX . implode( ' ' . self::CLS_PREFIX, $names ) : '';
	}

	/* ------------------------------------------------------------------ *
	 * Compilation
	 * ------------------------------------------------------------------ */

	/**
	 * Full stylesheet for a design (variables first, then classes by priority).
	 *
	 * @param array|null $design
	 * @return string
	 */
	public static function compile( $design = null ) {
		$design = is_array( $design ) ? $design : self::get();
		$root   = '';
		$by_bp  = array();
		foreach ( $design['variables'] as $v ) {
			if ( '' !== $v['value'] ) {
				$root .= self::VAR_PREFIX . $v['name'] . ':' . $v['value'] . ';';
			}
			foreach ( $v['values'] as $bp => $val ) {
				$by_bp[ $bp ] = ( $by_bp[ $bp ] ?? '' ) . self::VAR_PREFIX . $v['name'] . ':' . $val . ';';
			}
		}
		$css = '' !== $root ? ':root{' . $root . '}' : '';
		foreach ( self::bp_order() as $bp ) {
			if ( ! empty( $by_bp[ $bp ] ) ) {
				$css .= self::wrap( $bp, ':root{' . $by_bp[ $bp ] . '}' );
			}
		}
		$media = array();
		foreach ( $design['classes'] as $c ) {
			foreach ( $c['styles'] as $state => $bps ) {
				$sel = '.' . self::CLS_PREFIX . $c['name'] . self::pseudo( $state );
				foreach ( $bps as $bp => $props ) {
					$rule = $sel . '{' . self::declarations( $props ) . '}';
					if ( 'desktop' === $bp ) {
						$css .= $rule;
					} else {
						$media[ $bp ] = ( $media[ $bp ] ?? '' ) . $rule;
					}
				}
			}
		}
		foreach ( self::bp_order() as $bp ) {
			if ( ! empty( $media[ $bp ] ) ) {
				$css .= self::wrap( $bp, $media[ $bp ] );
			}
		}
		if ( function_exists( 'apply_filters' ) ) {
			$css = (string) apply_filters( 'sidcraft_page_builder_xeditor_css', $css, $design );
		}
		return $css;
	}

	/**
	 * Cached stylesheet for the stored design.
	 *
	 * @return string
	 */
	public static function css() {
		$cached = function_exists( 'get_option' ) ? get_option( self::CSS_OPTION, null ) : null;
		if ( is_string( $cached ) ) {
			return $cached;
		}
		$css = self::compile();
		if ( function_exists( 'update_option' ) ) {
			update_option( self::CSS_OPTION, $css, false );
		}
		return $css;
	}

	/** @return bool */
	public static function has_css() {
		return '' !== self::css();
	}

	/**
	 * @param array $props
	 * @return string
	 */
	public static function declarations( array $props ) {
		$out = '';
		foreach ( $props as $prop => $value ) {
			$out .= $prop . ':' . $value . ';';
		}
		return $out;
	}

	/**
	 * @param string $state
	 * @return string
	 */
	private static function pseudo( $state ) {
		$map = array(
			'base'          => '',
			'hover'         => ':hover',
			'focus'         => ':focus',
			'active'        => ':active',
			'focus_visible' => ':focus-visible',
		);
		return $map[ $state ] ?? '';
	}

	/**
	 * Breakpoints narrowest last so cascading max-width queries win in order.
	 *
	 * @return string[]
	 */
	private static function bp_order() {
		if ( class_exists( Breakpoints::class ) && method_exists( Breakpoints::class, 'cascade_order' ) ) {
			return Breakpoints::cascade_order();
		}
		return array( 'tablet', 'mobile' );
	}

	/**
	 * @param string $bp
	 * @param string $css
	 * @return string
	 */
	private static function wrap( $bp, $css ) {
		if ( class_exists( Breakpoints::class ) && method_exists( Breakpoints::class, 'wrap_cascade' ) ) {
			return Breakpoints::wrap_cascade( $bp, $css );
		}
		$q = array(
			'tablet' => '(max-width:1024px)',
			'mobile' => '(max-width:767px)',
		);
		return isset( $q[ $bp ] ) ? '@media' . $q[ $bp ] . '{' . $css . '}' : $css;
	}
}
