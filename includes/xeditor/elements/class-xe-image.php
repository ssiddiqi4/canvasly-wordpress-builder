<?php
/**
 * XEditor Image: a single <img>.
 *
 * @package CanvaslyLite
 */

namespace CanvaslyLite\XEditor\Elements;

use CanvaslyLite\XEditor\XEditorContext;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/class-xeditor-element.php';

class XeImage extends XEditorElement {
	public function type() {
		return 'xe_image';
	}

	public function title() {
		return __( 'Image', 'canvasly-lite' ) . ' (XEditor)';
	}

	public function icon() {
		return "\u{25A7}";
	}

	protected function tags() {
		return array( 'img' );
	}

	public function defaults() {
		return array(
			'source'    => 'media',
			'image_id'  => 0,
			'image_url' => '',
			'src'       => '',
			'size'      => 'large',
			'alt'       => '',
			'loading'   => 'lazy',
		);
	}

	protected function own_controls() {
		$sec = __( 'Image', 'canvasly-lite' );
		return array(
			'source'    => $this->ctrl( 'select', __( 'Source', 'canvasly-lite' ), 'content', $sec, array( 'options' => array( 'media' => __( 'Media Library', 'canvasly-lite' ), 'featured' => __( 'Featured image (current post / loop item)', 'canvasly-lite' ), 'url' => __( 'URL or token', 'canvasly-lite' ) ) ) ),
			'image_id'  => $this->ctrl( 'media', __( 'Choose Image', 'canvasly-lite' ), 'content', $sec, array( 'condition' => array( 'source' => 'media' ) ) ),
			'image_url' => $this->ctrl( 'url', __( 'Image URL', 'canvasly-lite' ), 'content', $sec, array( 'hidden' => true ) ),
			'src'       => $this->ctrl( 'text', __( 'Image URL', 'canvasly-lite' ), 'content', $sec, array( 'condition' => array( 'source' => 'url' ), 'placeholder' => 'https:// or {{post.featured_image}}', 'dynamic' => true ) ),
			'size'      => $this->ctrl( 'select', __( 'Image Size', 'canvasly-lite' ), 'content', $sec, array( 'options' => array( 'thumbnail' => 'Thumbnail', 'medium' => 'Medium', 'medium_large' => 'Medium Large', 'large' => 'Large', 'full' => 'Full' ) ) ),
			'alt'       => $this->ctrl( 'text', __( 'Alt Text', 'canvasly-lite' ), 'content', $sec, array( 'dynamic' => true, 'description' => __( 'Leave empty to use the media library alt text. Tokens such as {{post.title}} are allowed.', 'canvasly-lite' ) ) ),
			'loading'   => $this->ctrl( 'select', __( 'Loading', 'canvasly-lite' ), 'content', $sec, array( 'options' => array( 'lazy' => __( 'Lazy', 'canvasly-lite' ), 'eager' => __( 'Eager', 'canvasly-lite' ) ) ) ),
			'xe_fit'    => $this->ctrl( 'select', __( 'Object Fit', 'canvasly-lite' ), 'style', __( 'Local Style', 'canvasly-lite' ), array( 'options' => array( '' => __( 'Default', 'canvasly-lite' ), 'cover' => 'Cover', 'contain' => 'Contain', 'fill' => 'Fill', 'none' => 'None' ), 'selectors' => array( self::LOCAL => 'object-fit: {{VALUE}};' ) ) ),
			'xe_height' => $this->ctrl( 'slider', __( 'Height', 'canvasly-lite' ), 'style', __( 'Local Style', 'canvasly-lite' ), array( 'responsive' => true, 'units' => array( 'px', '%', 'vh', 'em', 'rem' ), 'range' => array( 'min' => 0, 'max' => 1200 ), 'selectors' => array( self::LOCAL => 'height: {{VALUE}};' ) ) ),
		);
	}

	protected function needs_group_role( array $s ) {
		return false;
	}

	/**
	 * @param array $s
	 * @return array{0:string,1:int} url + attachment id
	 */
	public function resolve_src( array $s ) {
		$size   = sanitize_key( (string) ( $s['size'] ?? 'large' ) );
		$size   = '' !== $size ? $size : 'large';
		$source = (string) ( $s['source'] ?? 'media' );
		if ( 'featured' === $source ) {
			$pid = XEditorContext::post_id();
			$aid = $pid && function_exists( 'get_post_thumbnail_id' ) ? (int) get_post_thumbnail_id( $pid ) : 0;
			$url = $aid && function_exists( 'wp_get_attachment_image_url' ) ? (string) wp_get_attachment_image_url( $aid, $size ) : '';
			return array( $url, $aid );
		}
		if ( 'url' === $source ) {
			return array( XEditorContext::apply( $s['src'] ?? '' ), 0 );
		}
		$aid = absint( $s['image_id'] ?? 0 );
		$url = $aid && function_exists( 'wp_get_attachment_image_url' ) ? (string) wp_get_attachment_image_url( $aid, $size ) : '';
		if ( '' === $url ) {
			$url = (string) ( $s['image_url'] ?? '' );
		}
		return array( $url, $aid );
	}

	protected function root_attrs( array $s ) {
		list( $url, $aid ) = $this->resolve_src( $s );
		$alt = trim( $this->text( $s['alt'] ?? '' ) );
		if ( '' === $alt && $aid && function_exists( 'get_post_meta' ) ) {
			$alt = (string) get_post_meta( $aid, '_wp_attachment_image_alt', true );
		}
		$out = ' src="' . esc_url( '' !== $url ? $url : self::placeholder() ) . '" alt="' . esc_attr( $alt ) . '"';
		$out .= ' loading="' . ( 'eager' === ( $s['loading'] ?? 'lazy' ) ? 'eager' : 'lazy' ) . '" decoding="async"';
		if ( $aid && function_exists( 'wp_get_attachment_image_srcset' ) ) {
			$size   = sanitize_key( (string) ( $s['size'] ?? 'large' ) );
			$srcset = wp_get_attachment_image_srcset( $aid, '' !== $size ? $size : 'large' );
			if ( $srcset ) {
				$out .= ' srcset="' . esc_attr( $srcset ) . '" sizes="(max-width: 100vw) 100vw"';
			}
			$meta = function_exists( 'wp_get_attachment_metadata' ) ? wp_get_attachment_metadata( $aid ) : array();
			if ( is_array( $meta ) && ! empty( $meta['width'] ) && ! empty( $meta['height'] ) ) {
				$out .= ' width="' . (int) $meta['width'] . '" height="' . (int) $meta['height'] . '"';
			}
		}
		return $out;
	}

	/** Neutral SVG placeholder (data URI) so an empty image keeps its box. */
	public static function placeholder() {
		return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Crect width=%2216%22 height=%229%22 fill=%22%23e7e9ee%22/%3E%3C/svg%3E';
	}

	protected function inner( array $s, $children ) {
		unset( $s, $children );
		return '';
	}
}
