<?php
if(!defined('WP_UNINSTALL_PLUGIN')) exit;
// Preserve page documents by default. Data deletion will be an explicit future setting.
// Only short-lived conversion job state is removed.
delete_option('sidcraft_page_builder_convert_job');
delete_option('sidcraft_page_builder_convert_lock');
// Form entries are personal data: remove them with the plugin.
$sidcraft_page_builder_entries=__DIR__.'/includes/forms/class-submissions.php';
if(is_readable($sidcraft_page_builder_entries)){require_once $sidcraft_page_builder_entries;\SidcraftPageBuilder\Forms\Submissions::uninstall();}
delete_option('sidcraft_page_builder_ai_chat');
