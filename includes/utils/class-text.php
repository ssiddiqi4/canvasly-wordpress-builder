<?php
/**
 * UTF-8 aware string helpers.
 *
 * PHP's substr()/strlen() work on bytes, so truncating text that contains
 * multibyte characters (accents, symbols, CJK, emoji) can cut a character in
 * half and leave invalid UTF-8 behind. Browsers then render that as "?" or as
 * mojibake. Use these helpers for any user-visible or HTML text instead.
 *
 * @package CanvaslyLite
 */

namespace CanvaslyLite\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Text {

	const CHARSET = 'UTF-8';

	/**
	 * Character length of a UTF-8 string.
	 *
	 * @param string $s Input.
	 * @return int
	 */
	public static function length( $s ) {
		$s = (string) $s;
		return function_exists( 'mb_strlen' ) ? mb_strlen( $s, self::CHARSET ) : (int) preg_match_all( '/./us', $s );
	}

	/**
	 * Character-based substring (UTF-8 safe replacement for substr()).
	 *
	 * @param string   $s      Input.
	 * @param int      $start  Start, in characters.
	 * @param int|null $length Length, in characters.
	 * @return string
	 */
	public static function sub( $s, $start, $length = null ) {
		$s = (string) $s;
		if ( function_exists( 'mb_substr' ) ) {
			return mb_substr( $s, (int) $start, $length, self::CHARSET );
		}
		$chars = preg_split( '//u', $s, -1, PREG_SPLIT_NO_EMPTY );
		if ( ! is_array( $chars ) ) {
			return substr( $s, (int) $start, $length ); // Not valid UTF-8; fall back to bytes.
		}
		return implode( '', array_slice( $chars, (int) $start, $length ) );
	}

	/**
	 * Truncate to a maximum number of characters, appending $more when cut.
	 *
	 * @param string $s     Input.
	 * @param int    $max   Maximum characters including $more.
	 * @param string $more  Suffix added when the text was shortened.
	 * @return string
	 */
	public static function truncate( $s, $max, $more = '...' ) {
		$s   = (string) $s;
		$max = max( 0, (int) $max );
		if ( self::length( $s ) <= $max ) {
			return $s;
		}
		return self::sub( $s, 0, max( 0, $max - self::length( $more ) ) ) . $more;
	}

	/**
	 * Cut to at most $bytes bytes without splitting a multibyte character.
	 * Use for storage/size caps that are defined in bytes.
	 *
	 * @param string $s     Input.
	 * @param int    $start Start offset in bytes (moved back to a character boundary).
	 * @param int    $bytes Maximum byte length.
	 * @return string
	 */
	public static function cut_bytes( $s, $start, $bytes ) {
		$s = (string) $s;
		if ( function_exists( 'mb_strcut' ) ) {
			return mb_strcut( $s, (int) $start, (int) $bytes, self::CHARSET );
		}
		$out = substr( $s, (int) $start, (int) $bytes );
		// Drop a trailing partial sequence (lead byte plus fewer continuation bytes than it needs).
		return (string) preg_replace( '/(?:[\xC0-\xDF]|[\xE0-\xEF][\x80-\xBF]?|[\xF0-\xF7][\x80-\xBF]{0,2})$/', '', $out );
	}

	/**
	 * Send an explicit UTF-8 Content-Type header if output has not started.
	 *
	 * @param string $type MIME type, e.g. text/html or application/json.
	 */
	public static function send_header( $type = 'text/html' ) {
		if ( ! headers_sent() ) {
			header( 'Content-Type: ' . $type . '; charset=' . self::CHARSET );
		}
	}
}
