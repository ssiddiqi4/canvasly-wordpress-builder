<?php
if(!defined('WP_UNINSTALL_PLUGIN')) exit;
// Preserve page documents by default. Data deletion will be an explicit future setting.
// Only short-lived conversion job state is removed.
delete_option('sidcraft_page_builder_convert_job');
delete_option('sidcraft_page_builder_convert_lock');
// Form entries are personal data: remove them with the plugin.
$sidcraft_page_builder_entries=__DIR__.'/includes/forms/class-submissions.php';
if(is_readable($sidcraft_page_builder_entries)){require_once $sidcraft_page_builder_entries;\SidcraftPageBuilder\Forms\Submissions::uninstall();}
// Email services: the keys of connected services and their activity log.
delete_option('sidcraft_page_builder_email');
delete_option('sidcraft_page_builder_email_log');
delete_option('sidcraft_page_builder_ai_chat');
// AI layout memory and recreation runs (working data, not page documents).
delete_option('sidcraft_page_builder_ai_layout_memory');
// Cached unit maps (per post) and their revision.
delete_option('sidcraft_page_builder_unit_map_rev');
global $wpdb;
$wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->postmeta} WHERE meta_key = %s",'_sidcraft_unit_map')); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- One-time cleanup on uninstall.
$wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->postmeta} WHERE meta_key = %s OR meta_key LIKE %s",'_sidsyn_ai_runs',$wpdb->esc_like('_sidsyn_ai_run_').'%')); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- One-time cleanup on uninstall.
// Full-page copies and the must-use plugin that serves them while the builder is off.
$sidcraft_page_builder_snapshot=__DIR__.'/includes/document/class-page-snapshot.php';
if(is_readable($sidcraft_page_builder_snapshot)){if(!defined('SIDCRAFT_PAGE_BUILDER_PATH'))define('SIDCRAFT_PAGE_BUILDER_PATH',__DIR__.'/');require_once $sidcraft_page_builder_snapshot;\SidcraftPageBuilder\Document\PageSnapshot::uninstall();}
// Safe Mode must-use plugin and per-user flags. Pro may still need the shared
// mu-plugin, so leave it in place while Pro is active.
$sidcraft_page_builder_safe=__DIR__.'/includes/ops/class-safe-mode.php';
if(is_readable($sidcraft_page_builder_safe)&&!defined('SIDCRAFT_BUILDER_PRO_FILE')){if(!defined('SIDCRAFT_PAGE_BUILDER_PATH'))define('SIDCRAFT_PAGE_BUILDER_PATH',__DIR__.'/');require_once $sidcraft_page_builder_safe;if(class_exists('\SidcraftPageBuilder\Ops\SafeMode',false))\SidcraftPageBuilder\Ops\SafeMode::uninstall();}
