<?php
/**
 * Plugin Name: Sidcraft Page Builder Page Fallback
 * Description: Serves the saved copy of each Sidcraft Page Builder page while Sidcraft Page Builder is not running, so pages keep their layout, styling and interactive elements. Managed by Sidcraft Page Builder - do not edit. Removed when Sidcraft Page Builder is uninstalled.
 * Version: 1.0
 *
 * @package SidcraftPageBuilder
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Sidcraft Page Builder booted its runtime on this request.
 *
 * @return bool
 */
function sidcraft_page_builder_snapshot_builder_running() {
	return class_exists( '\\SidcraftPageBuilder\\Bootstrap\\Plugin', false );
}

/**
 * Only plain page views get the saved copy. Anything that needs a live
 * response (a form posting back, previews, paging, search) falls through.
 *
 * @return bool
 */
function sidcraft_page_builder_snapshot_request_ok() {
	// template_redirect runs after the main query; guard direct/early calls.
	if ( ! function_exists( 'did_action' ) || ! did_action( 'wp' ) ) {
		return false;
	}
	$method = isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( sanitize_key( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) ) : 'GET';
	if ( 'GET' !== $method && 'HEAD' !== $method ) {
		return false;
	}
	if ( is_preview() || is_customize_preview() || is_feed() || is_embed() || is_trackback() || ! is_singular() ) {
		return false;
	}
	if ( ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || wp_doing_ajax() || wp_doing_cron() ) {
		return false;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Only the parameter names are read.
	foreach ( array_keys( $_GET ) as $name ) {
		if ( ! preg_match( '/^(utm_[a-z_]+|fbclid|gclid|msclkid|mc_cid|mc_eid|ref|_ga)$/i', (string) $name ) ) {
			return false;
		}
	}
	return true;
}

/**
 * HTML of a saved copy: the file in uploads/sidcraft-page-builder/html-copies/,
 * or the HTML itself for a record saved before copies moved to files.
 *
 * @param array $snap
 * @return string
 */
function sidcraft_page_builder_snapshot_html( $snap ) {
	if ( ! empty( $snap['html'] ) && is_string( $snap['html'] ) ) {
		return $snap['html'];
	}
	$file = (string) ( $snap['file'] ?? '' );
	if ( ! preg_match( '/^\d+-[a-f0-9]{16}\.html$/', $file ) ) {
		return '';
	}
	$uploads = wp_upload_dir( null, false );
	if ( ! empty( $uploads['error'] ) || empty( $uploads['basedir'] ) ) {
		return '';
	}
	$path = untrailingslashit( $uploads['basedir'] ) . '/sidcraft-page-builder/html-copies/' . $file;
	$html = is_readable( $path ) ? file_get_contents( $path ) : false; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local file.
	return is_string( $html ) ? $html : '';
}

/**
 * @return void
 */
function sidcraft_page_builder_snapshot_serve() {
	if ( sidcraft_page_builder_snapshot_builder_running() || ! sidcraft_page_builder_snapshot_request_ok() ) {
		return;
	}
	$post_id = (int) get_queried_object_id();
	$post    = $post_id ? get_post( $post_id ) : null;
	if ( ! $post || 'publish' !== $post->post_status || '' !== (string) $post->post_password ) {
		return;
	}
	$snap = get_post_meta( $post_id, '_sidsyn_page_snapshot', true );
	if ( ! is_array( $snap ) ) {
		return;
	}
	// Layout or post changed since the copy was made: show the page as WordPress
	// renders it now (the readable copy in post_content) instead of an outdated one.
	if ( (string) ( $snap['layout'] ?? '' ) !== (string) get_post_meta( $post_id, '_sidsyn_document_hash', true )
		|| (string) ( $snap['modified'] ?? '' ) !== (string) $post->post_modified_gmt ) {
		return;
	}
	/**
	 * Return false to show the live page instead of the saved copy.
	 *
	 * @param bool  $serve
	 * @param int   $post_id
	 * @param array $snap
	 */
	if ( ! apply_filters( 'sidcraft_page_builder_snapshot_serve', true, $post_id, $snap ) ) {
		return;
	}
	$html = sidcraft_page_builder_snapshot_html( $snap );
	if ( '' === $html ) {
		return;
	}
	status_header( 200 );
	if ( ! headers_sent() ) {
		header( 'Content-Type: text/html; charset=' . get_option( 'blog_charset', 'UTF-8' ) );
		header( 'X-Sidcraft-Fallback: 1' );
	}
	if ( 'HEAD' !== strtoupper( sanitize_key( wp_unslash( $_SERVER['REQUEST_METHOD'] ?? 'GET' ) ) ) ) {
		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Full page rendered by WordPress and saved by Sidcraft Page Builder.
	}
	exit;
}
add_action( 'template_redirect', 'sidcraft_page_builder_snapshot_serve', 0 );
