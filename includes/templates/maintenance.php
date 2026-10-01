<?php
/**
 * Coming-soon / maintenance document. Bare HTML with wp_head / wp_footer.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
if ( class_exists( '\SidcraftSyntex\Ops\Maintenance' ) ) {
	\SidcraftSyntex\Ops\Maintenance::headers();
}
// Plugin output is UTF-8; say so explicitly so symbols never render as mojibake.
if ( ! headers_sent() ) {
	header( 'Content-Type: text/html; charset=UTF-8' );
}
$mode = class_exists( '\SidcraftSyntex\Ops\Maintenance' ) ? \SidcraftSyntex\Ops\Maintenance::mode() : 'maintenance';
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php if ( $mode === 'maintenance' ) : ?>
		<meta name="robots" content="noindex,nofollow">
	<?php endif; ?>
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php
if ( function_exists( 'wp_body_open' ) ) {
	wp_body_open();
}
if ( class_exists( '\SidcraftSyntex\Ops\Maintenance' ) ) {
	\SidcraftSyntex\Ops\Maintenance::print_content();
}
wp_footer();
?>
</body>
</html>
