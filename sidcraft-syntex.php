<?php
/**
 * Plugin Name: Sidcraft Syntex - Visual Page Builder
 * Description: A lightweight, independent visual page builder for WordPress.
 * Version: 0.13.3
 * Requires at least: 6.9
 * Requires PHP: 7.4
 * Author: Sidcraft Syntex
 * License: GPL-2.0-or-later
 * Text Domain: sidcraft-syntex
 * Domain Path: /languages
 */
if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! defined( 'SIDCRAFT_SYNTEX_FILE' ) ) {
	define( 'SIDCRAFT_SYNTEX_FILE', __FILE__ );
}
if ( ! defined( 'SIDCRAFT_SYNTEX_PATH' ) ) {
	define( 'SIDCRAFT_SYNTEX_PATH', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'SIDCRAFT_SYNTEX_URL' ) ) {
	define( 'SIDCRAFT_SYNTEX_URL', plugin_dir_url( __FILE__ ) );
}
if ( ! defined( 'SIDCRAFT_SYNTEX_VERSION' ) ) {
	define( 'SIDCRAFT_SYNTEX_VERSION', '0.13.3' );
}

/**
 * PHP and WordPress versions this plugin can run. WordPress also reads the
 * plugin header, and this notice explains the stop when those are too old.
 */
function sidcraft_syntex_requirements_met() {
	global $wp_version;
	if ( version_compare( PHP_VERSION, '7.4', '<' ) ) {
		return false;
	}
	if ( isset( $wp_version ) && is_string( $wp_version ) && version_compare( $wp_version, '6.9', '<' ) ) {
		return false;
	}
	return true;
}

function sidcraft_syntex_requirements_notice() {
	echo '<div class="notice notice-error"><p>' . esc_html__( 'Sidcraft Syntex needs PHP 7.4 or newer and WordPress 6.9 or newer. It stays inactive until this site meets those versions.', 'sidcraft-syntex' ) . '</p></div>';
}

if ( ! sidcraft_syntex_requirements_met() ) {
	add_action( 'admin_notices', 'sidcraft_syntex_requirements_notice' );
	return;
}

$sidcraft_syntex_documents_file = SIDCRAFT_SYNTEX_PATH . 'includes/document/class-documents.php';
if ( is_readable( $sidcraft_syntex_documents_file ) ) {
	require_once $sidcraft_syntex_documents_file;
}
$sidcraft_syntex_admin_context = SIDCRAFT_SYNTEX_PATH . 'includes/admin/class-admin-context.php';
if ( is_readable( $sidcraft_syntex_admin_context ) ) {
	require_once $sidcraft_syntex_admin_context;
}

/**
 * Whether Sidcraft Syntex may edit this post type (enabled public types).
 *
 * @param string $post_type
 * @return bool
 */
function sidcraft_syntex_supports_post_type( $post_type ) {
	if ( class_exists( '\SidcraftSyntex\Document\Documents', false ) ) {
		return \SidcraftSyntex\Document\Documents::supports( $post_type );
	}
	return in_array( sanitize_key( $post_type ), array( 'post', 'page' ), true );
}

/**
 * Capability required to create a post of this type.
 *
 * @param string $post_type
 * @return string
 */
function sidcraft_syntex_post_type_edit_cap( $post_type ) {
	if ( class_exists( '\SidcraftSyntex\Document\Documents', false ) ) {
		return \SidcraftSyntex\Document\Documents::edit_cap( $post_type );
	}
	return ( 'page' === $post_type ) ? 'edit_pages' : 'edit_posts';
}

/**
 * Native Gutenberg zero-bootstrap guard.
 *
 * On WordPress editor requests for enabled post types, Sidcraft Syntex contributes
 * no editor/runtime hooks, REST routes, or CPT registration. The Template
 * Gutenberg block is registered before this guard so it still appears in
 * post.php / post-new.php.
 */
function sidcraft_syntex_native_editor_zero_bootstrap() {
    // During normal plugin loading, $GLOBALS['pagenow'] may not yet be
    // populated because wp-settings.php loads active plugins before the
    // admin.php screen bootstrap completes. Use the actual executing script
    // first, then fall back to $pagenow when it is already available.
    $script = '';
    if ( isset( $_SERVER['SCRIPT_NAME'] ) ) {
        $script = basename( sanitize_text_field( wp_unslash( $_SERVER['SCRIPT_NAME'] ) ) );
    } elseif ( isset( $_SERVER['PHP_SELF'] ) ) {
        $script = basename( sanitize_text_field( wp_unslash( $_SERVER['PHP_SELF'] ) ) );
    }
    $pagenow = isset( $GLOBALS['pagenow'] ) ? $GLOBALS['pagenow'] : $script;
    if ( ! in_array( $pagenow, array( 'post.php', 'post-new.php' ), true ) ) {
        return false;
    }
    // phpcs:disable WordPress.Security.NonceVerification.Recommended -- Read-only WordPress editor screen routing.
    if ( 'post-new.php' === $pagenow ) {
        $post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : 'post';
        return sidcraft_syntex_supports_post_type( $post_type );
    }
    $post_id = isset( $_GET['post'] ) ? absint( wp_unslash( $_GET['post'] ) ) : 0;
    // phpcs:enable WordPress.Security.NonceVerification.Recommended
    if ( ! $post_id ) {
        return false;
    }
    $post = get_post( $post_id );
    return $post && sidcraft_syntex_supports_post_type( $post->post_type );
}

/**
 * The template shortcode/block must register even on native Gutenberg screens,
 * where the rest of Sidcraft Syntex deliberately does not boot.
 */
$sidcraft_syntex_template_block = SIDCRAFT_SYNTEX_PATH . 'includes/templates/class-template-block.php';
if ( is_readable( $sidcraft_syntex_template_block ) ) {
	require_once $sidcraft_syntex_template_block;
	if ( class_exists( '\SidcraftSyntex\Templates\TemplateBlock', false ) ) {
		\SidcraftSyntex\Templates\TemplateBlock::bootstrap();
	}
}

/**
 * Portability and third-party compatibility must run even when the editor
 * runtime does not boot (native Gutenberg screens, Tools -> Import). SEO
 * analysis plugins read post content from the block editor.
 */
$sidcraft_syntex_compat = SIDCRAFT_SYNTEX_PATH . 'includes/compatibility/';
foreach ( array( 'meta', 'import-export', 'duplicate', 'multilingual', 'seo', 'cache', 'theme-support', 'compat' ) as $sidcraft_syntex_compat_file ) {
	$sidcraft_syntex_compat_path = $sidcraft_syntex_compat . 'class-' . $sidcraft_syntex_compat_file . '.php';
	if ( is_readable( $sidcraft_syntex_compat_path ) ) {
		require_once $sidcraft_syntex_compat_path;
	}
}
$sidcraft_syntex_collab = SIDCRAFT_SYNTEX_PATH . 'includes/design/class-collaboration.php';
if ( is_readable( $sidcraft_syntex_collab ) ) {
	require_once $sidcraft_syntex_collab;
}
if ( class_exists( '\SidcraftSyntex\Compatibility\Compat', false ) ) {
	\SidcraftSyntex\Compatibility\Compat::init();
} else {
	if ( class_exists( '\SidcraftSyntex\Compatibility\ImportExport', false ) ) {
		\SidcraftSyntex\Compatibility\ImportExport::init();
	}
	if ( class_exists( '\SidcraftSyntex\Compatibility\Duplicate', false ) ) {
		\SidcraftSyntex\Compatibility\Duplicate::init();
	}
}

$sidcraft_syntex_admin_bar = SIDCRAFT_SYNTEX_PATH . 'includes/admin/class-admin-bar.php';
if ( is_readable( $sidcraft_syntex_admin_bar ) ) {
	require_once $sidcraft_syntex_admin_bar;
	if ( class_exists( '\SidcraftSyntex\Admin\AdminBar', false ) ) {
		\SidcraftSyntex\Admin\AdminBar::init();
	}
}

if ( sidcraft_syntex_native_editor_zero_bootstrap() ) {
    // Native Gutenberg integration: launcher plus the Template block.
    // No Sidcraft Syntex editor/runtime assets or normal hooks are initialized here.
    add_action( 'admin_enqueue_scripts', 'sidcraft_syntex_native_editor_launcher' );
    return;
}

function sidcraft_syntex_native_editor_launcher() {
    // phpcs:disable WordPress.Security.NonceVerification.Recommended -- Read-only WordPress editor screen routing.
    $post_id = isset( $_GET['post'] ) ? absint( wp_unslash( $_GET['post'] ) ) : 0;
    $post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : 'post';
    // phpcs:enable WordPress.Security.NonceVerification.Recommended
    if ( $post_id ) {
        $post = get_post( $post_id );
        if ( $post ) {
            $post_type = $post->post_type;
        }
    }
    if ( ! sidcraft_syntex_supports_post_type( $post_type ) ) {
        return;
    }
    if ( ! current_user_can( sidcraft_syntex_post_type_edit_cap( $post_type ) ) ) {
        return;
    }
    $roles_file = SIDCRAFT_SYNTEX_PATH . 'includes/settings/class-roles.php';
    if ( is_readable( $roles_file ) ) {
        require_once $roles_file;
        if ( class_exists( '\SidcraftSyntex\Settings\Roles', false ) ) {
            if ( method_exists( '\SidcraftSyntex\Settings\Roles', 'maybe_sync' ) ) {
                \SidcraftSyntex\Settings\Roles::maybe_sync();
            }
            if ( ! \SidcraftSyntex\Settings\Roles::can_edit() ) {
                return;
            }
        }
    }
    $builder_url = admin_url( 'admin.php?page=sidcraft-syntex' );
    $ver         = defined( 'SIDCRAFT_SYNTEX_VERSION' ) ? SIDCRAFT_SYNTEX_VERSION : '0';
    wp_register_style( 'sidcraft-syntex-native-editor', SIDCRAFT_SYNTEX_URL . 'assets/css/native-editor-launcher.css', array(), $ver );
    wp_enqueue_style( 'sidcraft-syntex-native-editor' );
    wp_register_script( 'sidcraft-syntex-native-editor', SIDCRAFT_SYNTEX_URL . 'assets/js/native-editor-launcher.js', array(), $ver, true );
    wp_enqueue_script( 'sidcraft-syntex-native-editor' );
    wp_add_inline_script(
        'sidcraft-syntex-native-editor',
        'window.sidcraftSyntexNativeEditor=' . wp_json_encode(
            array(
                'url'    => $builder_url,
                'postId' => $post_id,
                'label'  => __( 'Edit with Sidcraft Syntex', 'sidcraft-syntex' ),
            )
        ) . ';',
        'before'
    );
}
if ( ! defined( 'SIDCRAFT_SYNTEX_VERSION' ) ) {
	define( 'SIDCRAFT_SYNTEX_VERSION', '0.13.3' );
}
if ( ! defined( 'SIDCRAFT_SYNTEX_FILE' ) ) {
	define( 'SIDCRAFT_SYNTEX_FILE', __FILE__ );
}
if ( ! defined( 'SIDCRAFT_SYNTEX_PATH' ) ) {
	define( 'SIDCRAFT_SYNTEX_PATH', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'SIDCRAFT_SYNTEX_URL' ) ) {
	define( 'SIDCRAFT_SYNTEX_URL', plugin_dir_url( __FILE__ ) );
}
/**
 * Back development mode: sanitize AI-generated layout code and dynamic tokens
 * before they reach the editor canvas. Optional override in wp-config.php,
 * before `require_once ABSPATH . 'wp-settings.php';`:
 *   if ( ! defined( 'SIDCRAFT_SYNTEX_DEV_MODE' ) ) {
 *       define( 'SIDCRAFT_SYNTEX_DEV_MODE', true );
 *   }
 * The plugin never defines this constant (a second define() is a PHP 9 error).
 * When it is unset, DevMode::enabled() turns on under WP_DEBUG or a
 * local/development environment type.
 */
require_once SIDCRAFT_SYNTEX_PATH . 'includes/bootstrap/class-autoloader.php';
\SidcraftSyntex\Bootstrap\Autoloader::register();
$sidcraft_syntex_controls_file = SIDCRAFT_SYNTEX_PATH . 'includes/controls/class-controls.php';
if ( is_readable( $sidcraft_syntex_controls_file ) ) {
	require_once $sidcraft_syntex_controls_file;
}
\SidcraftSyntex\Bootstrap\Plugin::instance();
register_activation_hook( __FILE__, array( '\SidcraftSyntex\Bootstrap\Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( '\SidcraftSyntex\Bootstrap\Plugin', 'deactivate' ) );
