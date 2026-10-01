<?php
/**
 * Canvas page template.
 *
 * When the active theme has a header and a footer, this template inherits them.
 * Otherwise it is a blank document (wp_head / wp_footer only) and the editor
 * provides Header and Footer areas.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
// Plugin output is UTF-8; say so explicitly so symbols never render as mojibake.
if ( ! headers_sent() ) {
	header( 'Content-Type: text/html; charset=UTF-8' );
}

$sidcraft_syntex_inherit_theme = class_exists( '\SidcraftSyntex\Templates\ThemeChrome' ) && \SidcraftSyntex\Templates\ThemeChrome::provides();

if ( $sidcraft_syntex_inherit_theme && \SidcraftSyntex\Templates\ThemeChrome::is_block_theme() ) {
	?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
	<?php
	if ( function_exists( 'wp_body_open' ) ) {
		wp_body_open();
	}
	if ( ! ( class_exists( '\SidcraftSyntex\Templates\ThemeChromeEdits' ) && \SidcraftSyntex\Templates\ThemeChromeEdits::echo_part( 'header' ) ) && function_exists( 'block_header_area' ) ) {
		block_header_area();
	}
	while ( have_posts() ) {
		the_post();
		the_content();
	}
	if ( ! ( class_exists( '\SidcraftSyntex\Templates\ThemeChromeEdits' ) && \SidcraftSyntex\Templates\ThemeChromeEdits::echo_part( 'footer' ) ) && function_exists( 'block_footer_area' ) ) {
		block_footer_area();
	}
	wp_footer();
	?>
</body>
</html>
	<?php
	return;
}

if ( $sidcraft_syntex_inherit_theme ) {
	$sidcraft_syntex_saved_header = class_exists( '\SidcraftSyntex\Templates\ThemeChromeEdits' ) && \SidcraftSyntex\Templates\ThemeChromeEdits::has( 'header' );
	$sidcraft_syntex_saved_footer = class_exists( '\SidcraftSyntex\Templates\ThemeChromeEdits' ) && \SidcraftSyntex\Templates\ThemeChromeEdits::has( 'footer' );
	if ( ! $sidcraft_syntex_saved_header && ! $sidcraft_syntex_saved_footer ) {
		get_header();
		while ( have_posts() ) {
			the_post();
			the_content();
		}
		get_footer();
		return;
	}
	?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
	<?php
	if ( function_exists( 'wp_body_open' ) ) {
		wp_body_open();
	}
	if ( ! \SidcraftSyntex\Templates\ThemeChromeEdits::echo_part( 'header' ) ) {
		echo \SidcraftSyntex\Templates\ThemeChrome::markup( 'header' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fragment() strips active content.
	}
	while ( have_posts() ) {
		the_post();
		the_content();
	}
	if ( ! \SidcraftSyntex\Templates\ThemeChromeEdits::echo_part( 'footer' ) ) {
		echo \SidcraftSyntex\Templates\ThemeChrome::markup( 'footer' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fragment() strips active content.
	}
	wp_footer();
	?>
</body>
</html>
	<?php
	return;
}
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php
if ( function_exists( 'wp_body_open' ) ) {
	wp_body_open();
}
while ( have_posts() ) {
	the_post();
	the_content();
}
wp_footer();
?>
</body>
</html>
