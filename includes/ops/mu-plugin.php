<?php
/**
 * Plugin Name: Sidcraft Page Builder Safe Mode
 * Description: Restricts other plugins and the theme while a Sidcraft Page Builder Safe Mode session is active. Managed by Sidcraft Page Builder - do not edit.
 * Version: 1.0
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$sidcraft_page_builder_safe_boot = get_option( 'sidcraft_page_builder_safe_mode_boot', array() );
if ( ! is_array( $sidcraft_page_builder_safe_boot ) || empty( $sidcraft_page_builder_safe_boot['loader'] ) || ! is_readable( $sidcraft_page_builder_safe_boot['loader'] ) ) {
	return;
}
require_once $sidcraft_page_builder_safe_boot['loader'];
if ( function_exists( 'sidcraft_page_builder_safe_mode_start' ) ) {
	sidcraft_page_builder_safe_mode_start();
}
