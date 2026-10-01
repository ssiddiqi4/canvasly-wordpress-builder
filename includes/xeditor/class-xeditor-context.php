<?php
/**
 * XEditor render context + dynamic token resolver.
 *
 * XEditorLoop (Pro) pushes each queried item while its XEditorLoopItem template
 * renders; atomic elements resolve `{{post.title}}`-style tokens against the top
 * of the stack, or against the current singular post outside a loop.
 *
 * Supported tokens (all output is escaped by the element that prints it):
 *   {{post.id}} {{post.title}} {{post.url}} {{post.excerpt}} {{post.date}}
 *   {{post.modified}} {{post.author}} {{post.author_url}} {{post.featured_image}}
 *   {{post.featured_image:medium}} {{post.comments}} {{post.type}}
 *   {{post.terms:category}} {{post.meta:field_key}}
 *   {{term.id}} {{term.name}} {{term.url}} {{term.count}} {{term.description}} {{term.slug}}
 *   {{loop.index}} {{loop.number}} {{site.name}} {{site.url}}
 *
 * @package CanvaslyLite
 */

namespace CanvaslyLite\XEditor;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XEditorContext {
	/** @var array<int,array{item:mixed,index:int}> */
	private static $stack = array();

	/**
	 * @param mixed $item  WP_Post|WP_Term
	 * @param int   $index Zero-based position in the loop.
	 */
	public static function push( $item, $index = 0 ) {
		self::$stack[] = array(
			'item'  => $item,
			'index' => (int) $index,
		);
	}

	public static function pop() {
		array_pop( self::$stack );
	}

	/** @return array{item:mixed,index:int}|null */
	public static function current() {
		return self::$stack ? self::$stack[ count( self::$stack ) - 1 ] : null;
	}

	/** @return bool */
	public static function in_loop() {
		return ! empty( self::$stack );
	}

	/** @return int */
	public static function post_id() {
		$cur = self::current();
		if ( $cur && is_object( $cur['item'] ) && isset( $cur['item']->ID ) ) {
			return (int) $cur['item']->ID;
		}
		if ( function_exists( 'get_the_ID' ) && get_the_ID() ) {
			return (int) get_the_ID();
		}
		return function_exists( 'get_queried_object_id' ) ? (int) get_queried_object_id() : 0;
	}

	/** @return object|null */
	public static function term() {
		$cur = self::current();
		if ( $cur && is_object( $cur['item'] ) && isset( $cur['item']->term_id ) ) {
			return $cur['item'];
		}
		return null;
	}

	/**
	 * Replace tokens in a string. Unknown tokens are left untouched.
	 *
	 * @param mixed $text
	 * @return string
	 */
	public static function apply( $text ) {
		$text = is_scalar( $text ) ? (string) $text : '';
		if ( false === strpos( $text, '{{' ) ) {
			return $text;
		}
		return (string) preg_replace_callback(
			'/\{\{\s*([a-z]+)\.([a-z_]+)(?::([a-zA-Z0-9_\-]+))?\s*\}\}/',
			static function ( $m ) {
				$val = self::token( $m[1], $m[2], $m[3] ?? '' );
				return null === $val ? $m[0] : $val;
			},
			$text
		);
	}

	/**
	 * Resolve a token. Returns null when the token is unknown.
	 *
	 * @param string $group
	 * @param string $key
	 * @param string $arg
	 * @return string|null
	 */
	public static function token( $group, $key, $arg = '' ) {
		$pre = apply_filters( 'canvasly-lite/xeditor/token', null, $group, $key, $arg, self::current() );
		if ( null !== $pre ) {
			return (string) $pre;
		}
		if ( 'loop' === $group ) {
			$cur = self::current();
			$i   = $cur ? $cur['index'] : 0;
			return 'index' === $key ? (string) $i : ( 'number' === $key ? (string) ( $i + 1 ) : null );
		}
		if ( 'site' === $group ) {
			if ( 'name' === $key ) {
				return function_exists( 'get_bloginfo' ) ? (string) get_bloginfo( 'name' ) : '';
			}
			return 'url' === $key && function_exists( 'home_url' ) ? (string) home_url( '/' ) : null;
		}
		if ( 'term' === $group ) {
			$t = self::term();
			if ( ! $t ) {
				return '';
			}
			switch ( $key ) {
				case 'id':
					return (string) $t->term_id;
				case 'name':
					return (string) $t->name;
				case 'slug':
					return (string) $t->slug;
				case 'count':
					return (string) (int) $t->count;
				case 'description':
					return (string) $t->description;
				case 'url':
					$u = function_exists( 'get_term_link' ) ? get_term_link( $t ) : '';
					return is_string( $u ) ? $u : '';
			}
			return null;
		}
		if ( 'post' !== $group ) {
			return null;
		}
		$id = self::post_id();
		if ( ! $id || ! function_exists( 'get_post' ) ) {
			return '';
		}
		$p = get_post( $id );
		if ( ! $p ) {
			return '';
		}
		switch ( $key ) {
			case 'id':
				return (string) $p->ID;
			case 'title':
				return self::call( 'get_the_title', $p->ID );
			case 'url':
				return self::call( 'get_permalink', $p->ID );
			case 'excerpt':
				$ex = trim( (string) ( $p->post_excerpt ?? '' ) );
				if ( '' === $ex ) {
					$raw = (string) ( $p->post_content ?? '' );
					$raw = function_exists( 'strip_shortcodes' ) ? strip_shortcodes( $raw ) : $raw;
					$raw = trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( $raw ) ) );
					$ex  = function_exists( 'wp_trim_words' ) ? wp_trim_words( $raw, 30 ) : implode( ' ', array_slice( explode( ' ', $raw ), 0, 30 ) );
				}
				return $ex;
			case 'date':
				return self::call( 'get_the_date', '', $p->ID );
			case 'modified':
				return self::call( 'get_the_modified_date', '', $p->ID );
			case 'author':
				return self::call( 'get_the_author_meta', 'display_name', (int) $p->post_author );
			case 'author_url':
				return self::call( 'get_author_posts_url', (int) $p->post_author );
			case 'featured_image':
				$u = self::call( 'get_the_post_thumbnail_url', $p->ID, '' !== $arg ? sanitize_key( $arg ) : 'large' );
				return $u ? (string) $u : '';
			case 'comments':
				return (string) (int) self::call( 'get_comments_number', $p->ID );
			case 'type':
				return (string) $p->post_type;
			case 'terms':
				$names = function_exists( 'wp_get_post_terms' ) ? wp_get_post_terms( $p->ID, '' !== $arg ? sanitize_key( $arg ) : 'category', array( 'fields' => 'names' ) ) : array();
				return is_array( $names ) ? implode( ', ', $names ) : '';
			case 'meta':
				if ( '' === $arg || '_' === $arg[0] ) {
					return '';
				}
				$v = get_post_meta( $p->ID, $arg, true );
				return is_scalar( $v ) ? (string) $v : '';
		}
		return null;
	}

	/**
	 * Call a WordPress template function when it exists (keeps tokens safe in CLI / tests).
	 *
	 * @param string $fn
	 * @param mixed  ...$args
	 * @return string
	 */
	private static function call( $fn, ...$args ) {
		if ( ! function_exists( $fn ) ) {
			return '';
		}
		$v = $fn( ...$args );
		return is_scalar( $v ) ? (string) $v : '';
	}
}
