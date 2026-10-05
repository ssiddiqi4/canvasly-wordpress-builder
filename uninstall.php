<?php
if(!defined('WP_UNINSTALL_PLUGIN')) exit;
// Preserve page documents by default. Data deletion will be an explicit future setting.
// Only short-lived conversion job state is removed.
delete_option('sidcraft_page_builder_convert_job');
delete_option('sidcraft_page_builder_convert_lock');
