<?php
/**
 * Plugin Name: Sidcraft Syntex Safe Mode
 * Description: Restricts other plugins and the theme while a Sidcraft Syntex Safe Mode session is active. Managed by Sidcraft Syntex - do not edit.
 * Version: 1.0
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$sidcraft_syntex_safe_boot = get_option( 'sidcraft_syntex_safe_mode_boot', array() );
if ( ! is_array( $sidcraft_syntex_safe_boot ) || empty( $sidcraft_syntex_safe_boot['loader'] ) || ! is_readable( $sidcraft_syntex_safe_boot['loader'] ) ) {
	return;
}
require_once $sidcraft_syntex_safe_boot['loader'];
if ( function_exists( 'sidcraft_syntex_safe_mode_start' ) ) {
	sidcraft_syntex_safe_mode_start();
}
