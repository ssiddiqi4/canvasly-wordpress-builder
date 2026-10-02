<?php
/**
 * Plugin Name: Sidcraft Page Builder
 * Description: A lightweight, independent visual page builder for WordPress.
 * Version: 0.14.3
 * Requires at least: 6.9
 * Requires PHP: 7.4
 * Author: Sidcraft Page Builder
 * License: GPL-2.0-or-later
 * Text Domain: sidcraft-page-builder
 * Domain Path: /languages
 */
if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! defined( 'SIDCRAFT_PAGE_BUILDER_FILE' ) ) {
	define( 'SIDCRAFT_PAGE_BUILDER_FILE', __FILE__ );
}
if ( ! defined( 'SIDCRAFT_PAGE_BUILDER_PATH' ) ) {
	define( 'SIDCRAFT_PAGE_BUILDER_PATH', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'SIDCRAFT_PAGE_BUILDER_URL' ) ) {
	define( 'SIDCRAFT_PAGE_BUILDER_URL', plugin_dir_url( __FILE__ ) );
}
if ( ! defined( 'SIDCRAFT_PAGE_BUILDER_VERSION' ) ) {
	define( 'SIDCRAFT_PAGE_BUILDER_VERSION', '0.14.3' );
}

/**
 * PHP and WordPress versions this plugin can run. WordPress also reads the
 * plugin header, and this notice explains the stop when those are too old.
 */
function sidcraft_page_builder_requirements_met() {
	global $wp_version;
	if ( version_compare( PHP_VERSION, '7.4', '<' ) ) {
		return false;
	}
	if ( isset( $wp_version ) && is_string( $wp_version ) && version_compare( $wp_version, '6.9', '<' ) ) {
		return false;
	}
	return true;
}

function sidcraft_page_builder_requirements_notice() {
	echo '<div class="notice notice-error"><p>' . esc_html__( 'Sidcraft Page Builder needs PHP 7.4 or newer and WordPress 6.9 or newer. It stays inactive until this site meets those versions.', 'sidcraft-page-builder' ) . '</p></div>';
}

if ( ! sidcraft_page_builder_requirements_met() ) {
	add_action( 'admin_notices', 'sidcraft_page_builder_requirements_notice' );
	return;
}

$sidcraft_page_builder_documents_file = SIDCRAFT_PAGE_BUILDER_PATH . 'includes/document/class-documents.php';
if ( is_readable( $sidcraft_page_builder_documents_file ) ) {
	require_once $sidcraft_page_builder_documents_file;
}
$sidcraft_page_builder_admin_context = SIDCRAFT_PAGE_BUILDER_PATH . 'includes/admin/class-admin-context.php';
if ( is_readable( $sidcraft_page_builder_admin_context ) ) {
	require_once $sidcraft_page_builder_admin_context;
}

/**
 * Whether Sidcraft Page Builder may edit this post type (enabled public types).
 *
 * @param string $post_type
 * @return bool
 */
function sidcraft_page_builder_supports_post_type( $post_type ) {
	if ( class_exists( '\SidcraftPageBuilder\Document\Documents', false ) ) {
		return \SidcraftPageBuilder\Document\Documents::supports( $post_type );
	}
	return in_array( sanitize_key( $post_type ), array( 'post', 'page' ), true );
}

/**
 * Capability required to create a post of this type.
 *
 * @param string $post_type
 * @return string
 */
function sidcraft_page_builder_post_type_edit_cap( $post_type ) {
	if ( class_exists( '\SidcraftPageBuilder\Document\Documents', false ) ) {
		return \SidcraftPageBuilder\Document\Documents::edit_cap( $post_type );
	}
	return ( 'page' === $post_type ) ? 'edit_pages' : 'edit_posts';
}

/**
 * Native Gutenberg zero-bootstrap guard.
 *
 * On WordPress editor requests for enabled post types, Sidcraft Page Builder contributes
 * no editor/runtime hooks, REST routes, or CPT registration. The Template
 * Gutenberg block is registered before this guard so it still appears in
 * post.php / post-new.php.
 */
function sidcraft_page_builder_native_editor_zero_bootstrap() {
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
        return sidcraft_page_builder_supports_post_type( $post_type );
    }
    $post_id = isset( $_GET['post'] ) ? absint( wp_unslash( $_GET['post'] ) ) : 0;
    // phpcs:enable WordPress.Security.NonceVerification.Recommended
    if ( ! $post_id ) {
        return false;
    }
    $post = get_post( $post_id );
    return $post && sidcraft_page_builder_supports_post_type( $post->post_type );
}

/**
 * The template shortcode/block must register even on native Gutenberg screens,
 * where the rest of Sidcraft Page Builder deliberately does not boot.
 */
$sidcraft_page_builder_template_block = SIDCRAFT_PAGE_BUILDER_PATH . 'includes/templates/class-template-block.php';
if ( is_readable( $sidcraft_page_builder_template_block ) ) {
	require_once $sidcraft_page_builder_template_block;
	if ( class_exists( '\SidcraftPageBuilder\Templates\TemplateBlock', false ) ) {
		\SidcraftPageBuilder\Templates\TemplateBlock::bootstrap();
	}
}

/**
 * Portability and third-party compatibility must run even when the editor
 * runtime does not boot (native Gutenberg screens, Tools -> Import). SEO
 * analysis plugins read post content from the block editor.
 */
$sidcraft_page_builder_compat = SIDCRAFT_PAGE_BUILDER_PATH . 'includes/compatibility/';
foreach ( array( 'meta', 'import-export', 'duplicate', 'multilingual', 'seo', 'cache', 'theme-support', 'compat' ) as $sidcraft_page_builder_compat_file ) {
	$sidcraft_page_builder_compat_path = $sidcraft_page_builder_compat . 'class-' . $sidcraft_page_builder_compat_file . '.php';
	if ( is_readable( $sidcraft_page_builder_compat_path ) ) {
		require_once $sidcraft_page_builder_compat_path;
	}
}
$sidcraft_page_builder_collab = SIDCRAFT_PAGE_BUILDER_PATH . 'includes/design/class-collaboration.php';
if ( is_readable( $sidcraft_page_builder_collab ) ) {
	require_once $sidcraft_page_builder_collab;
}
if ( class_exists( '\SidcraftPageBuilder\Compatibility\Compat', false ) ) {
	\SidcraftPageBuilder\Compatibility\Compat::init();
} else {
	if ( class_exists( '\SidcraftPageBuilder\Compatibility\ImportExport', false ) ) {
		\SidcraftPageBuilder\Compatibility\ImportExport::init();
	}
	if ( class_exists( '\SidcraftPageBuilder\Compatibility\Duplicate', false ) ) {
		\SidcraftPageBuilder\Compatibility\Duplicate::init();
	}
}

$sidcraft_page_builder_admin_bar = SIDCRAFT_PAGE_BUILDER_PATH . 'includes/admin/class-admin-bar.php';
if ( is_readable( $sidcraft_page_builder_admin_bar ) ) {
	require_once $sidcraft_page_builder_admin_bar;
	if ( class_exists( '\SidcraftPageBuilder\Admin\AdminBar', false ) ) {
		\SidcraftPageBuilder\Admin\AdminBar::init();
	}
}

if ( sidcraft_page_builder_native_editor_zero_bootstrap() ) {
    // Native Gutenberg integration: launcher plus the Template block.
    // No Sidcraft Page Builder editor/runtime assets or normal hooks are initialized here.
    add_action( 'admin_enqueue_scripts', 'sidcraft_page_builder_native_editor_launcher' );
    // Add-ons check this to skip their own boot on this screen. The class
    // loader is still registered so an add-on that looks up a Sidcraft Page
    // Builder class gets it instead of a fatal "class not found" error.
    if ( ! defined( 'SIDCRAFT_PAGE_BUILDER_NATIVE_EDITOR_SCREEN' ) ) {
        define( 'SIDCRAFT_PAGE_BUILDER_NATIVE_EDITOR_SCREEN', true );
    }
    require_once SIDCRAFT_PAGE_BUILDER_PATH . 'includes/bootstrap/class-autoloader.php';
    \SidcraftPageBuilder\Bootstrap\Autoloader::register();
    return;
}

function sidcraft_page_builder_native_editor_launcher() {
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
    if ( ! sidcraft_page_builder_supports_post_type( $post_type ) ) {
        return;
    }
    if ( ! current_user_can( sidcraft_page_builder_post_type_edit_cap( $post_type ) ) ) {
        return;
    }
    $roles_file = SIDCRAFT_PAGE_BUILDER_PATH . 'includes/settings/class-roles.php';
    if ( is_readable( $roles_file ) ) {
        require_once $roles_file;
        if ( class_exists( '\SidcraftPageBuilder\Settings\Roles', false ) ) {
            if ( method_exists( '\SidcraftPageBuilder\Settings\Roles', 'maybe_sync' ) ) {
                \SidcraftPageBuilder\Settings\Roles::maybe_sync();
            }
            if ( ! \SidcraftPageBuilder\Settings\Roles::can_edit() ) {
                return;
            }
        }
    }
    $builder_url = admin_url( 'admin.php?page=sidcraft-page-builder' );
    $ver         = defined( 'SIDCRAFT_PAGE_BUILDER_VERSION' ) ? SIDCRAFT_PAGE_BUILDER_VERSION : '0';
    wp_register_style( 'sidcraft-page-builder-native-editor', SIDCRAFT_PAGE_BUILDER_URL . 'assets/css/native-editor-launcher.css', array(), $ver );
    wp_enqueue_style( 'sidcraft-page-builder-native-editor' );
    wp_register_script( 'sidcraft-page-builder-native-editor', SIDCRAFT_PAGE_BUILDER_URL . 'assets/js/native-editor-launcher.js', array(), $ver, true );
    wp_enqueue_script( 'sidcraft-page-builder-native-editor' );
    wp_add_inline_script(
        'sidcraft-page-builder-native-editor',
        'window.sidcraftPageBuilderNativeEditor=' . wp_json_encode(
            array(
                'url'    => $builder_url,
                'postId' => $post_id,
                'label'  => __( 'Edit with Sidcraft Page Builder', 'sidcraft-page-builder' ),
            )
        ) . ';',
        'before'
    );
}
if ( ! defined( 'SIDCRAFT_PAGE_BUILDER_VERSION' ) ) {
	define( 'SIDCRAFT_PAGE_BUILDER_VERSION', '0.14.3' );
}
if ( ! defined( 'SIDCRAFT_PAGE_BUILDER_FILE' ) ) {
	define( 'SIDCRAFT_PAGE_BUILDER_FILE', __FILE__ );
}
if ( ! defined( 'SIDCRAFT_PAGE_BUILDER_PATH' ) ) {
	define( 'SIDCRAFT_PAGE_BUILDER_PATH', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'SIDCRAFT_PAGE_BUILDER_URL' ) ) {
	define( 'SIDCRAFT_PAGE_BUILDER_URL', plugin_dir_url( __FILE__ ) );
}
/**
 * Back development mode: sanitize AI-generated layout code and dynamic tokens
 * before they reach the editor canvas. Optional override in wp-config.php,
 * before `require_once ABSPATH . 'wp-settings.php';`:
 *   if ( ! defined( 'SIDCRAFT_PAGE_BUILDER_DEV_MODE' ) ) {
 *       define( 'SIDCRAFT_PAGE_BUILDER_DEV_MODE', true );
 *   }
 * The plugin never defines this constant (a second define() is a PHP 9 error).
 * When it is unset, DevMode::enabled() turns on under WP_DEBUG or a
 * local/development environment type.
 */
require_once SIDCRAFT_PAGE_BUILDER_PATH . 'includes/bootstrap/class-autoloader.php';
\SidcraftPageBuilder\Bootstrap\Autoloader::register();
$sidcraft_page_builder_controls_file = SIDCRAFT_PAGE_BUILDER_PATH . 'includes/controls/class-controls.php';
if ( is_readable( $sidcraft_page_builder_controls_file ) ) {
	require_once $sidcraft_page_builder_controls_file;
}
\SidcraftPageBuilder\Bootstrap\Plugin::instance();
register_activation_hook( __FILE__, array( '\SidcraftPageBuilder\Bootstrap\Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( '\SidcraftPageBuilder\Bootstrap\Plugin', 'deactivate' ) );
