<?php
namespace SidcraftPageBuilder\Admin;

use SidcraftPageBuilder\Settings\Roles;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Sidcraft Page Builder admin menu hub.
 *
 * One screen under Sidcraft Page Builder lists every other item in that menu. Sidcraft Builder Pro
 * uses this same screen and adds its own menu items through the submenu and
 * the sidcraft_page_builder_dashboard_items filter.
 */
class Dashboard {
	const PAGE          = 'sidcraft-page-builder-dashboard';
	const PARENT        = 'sidcraft-page-builder';
	const DOCUMENTS_URL = 'https://canvasly.pro';
	const SUPPORT_URL   = 'https://canvasly.pro/support.html';

	public static function init() {
		if ( function_exists( 'is_admin' ) && ! is_admin() ) {
			return;
		}
		// After the parent menu (priority 10). Registering earlier makes WordPress
		// print the slug as a bare href, which leaves wp-admin.
		add_action( 'admin_menu', array( self::class, 'menu' ), 20 );
		// Import Templates registers at 25. This keeps Documents immediately after it.
		add_action( 'admin_menu', array( self::class, 'documents_menu' ), 26 );
		add_action( 'admin_menu', array( self::class, 'promote' ), 1001 );
	}

	public static function menu() {
		$cap = class_exists( Roles::class ) ? Roles::CAP_EDIT : 'edit_posts';
		add_submenu_page(
			self::PARENT,
			__( 'Dashboard', 'sidcraft-page-builder' ),
			__( 'Dashboard', 'sidcraft-page-builder' ),
			$cap,
			self::PAGE,
			array( self::class, 'screen' )
		);
	}

	/**
	 * External documentation link, placed after Import Templates.
	 */
	public static function documents_menu() {
		global $submenu;
		if ( ! isset( $submenu[ self::PARENT ] ) || ! is_array( $submenu[ self::PARENT ] ) ) {
			$submenu[ self::PARENT ] = array();
		}
		foreach ( $submenu[ self::PARENT ] as $row ) {
			if ( is_array( $row ) && isset( $row[2] ) && self::DOCUMENTS_URL === $row[2] ) {
				return;
			}
		}
		$cap  = class_exists( Roles::class ) ? Roles::CAP_EDIT : 'edit_posts';
		$item = array(
			__( 'Documents', 'sidcraft-page-builder' ),
			$cap,
			self::DOCUMENTS_URL,
			__( 'Documents', 'sidcraft-page-builder' ),
		);
		$insert_at = count( $submenu[ self::PARENT ] );
		foreach ( $submenu[ self::PARENT ] as $i => $row ) {
			if ( is_array( $row ) && isset( $row[2] ) && 'sidcraft-page-builder-template-import' === $row[2] ) {
				$insert_at = $i + 1;
				break;
			}
		}
		array_splice( $submenu[ self::PARENT ], $insert_at, 0, array( $item ) );
	}

	/**
	 * Open Sidcraft Page Builder on this screen, and keep the visual builder in the menu.
	 */
	public static function promote() {
		global $submenu;
		if ( empty( $submenu[ self::PARENT ] ) || ! is_array( $submenu[ self::PARENT ] ) ) {
			return;
		}
		$dash = null;
		$rest = array();
		foreach ( $submenu[ self::PARENT ] as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}
			if ( isset( $item[2] ) && self::PAGE === $item[2] ) {
				$dash = $item;
				continue;
			}
			if ( isset( $item[2] ) && self::PARENT === $item[2] ) {
				$item[0] = __( 'Editor', 'sidcraft-page-builder' );
				if ( isset( $item[3] ) ) {
					$item[3] = __( 'Editor', 'sidcraft-page-builder' );
				}
			}
			$rest[] = $item;
		}
		if ( ! $dash ) {
			return;
		}
		$submenu[ self::PARENT ] = array_merge( array( $dash ), $rest );
	}

	/**
	 * Menu items the current user can open, excluding this dashboard.
	 *
	 * @return array<int,array{slug:string,title:string,description:string,url:string}>
	 */
	public static function items() {
		global $submenu;
		$rows = array();
		if ( ! empty( $submenu[ self::PARENT ] ) && is_array( $submenu[ self::PARENT ] ) ) {
			$rows = $submenu[ self::PARENT ];
		}
		$items = array();
		$seen  = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$slug = isset( $row[2] ) ? (string) $row[2] : '';
			if ( $slug === '' || $slug === self::PAGE || isset( $seen[ $slug ] ) ) {
				continue;
			}
			$cap = isset( $row[1] ) ? (string) $row[1] : '';
			if ( $cap !== '' && function_exists( 'current_user_can' ) && ! current_user_can( $cap ) ) {
				continue;
			}
			$title = isset( $row[0] ) ? wp_strip_all_tags( (string) $row[0] ) : '';
			if ( $title === '' ) {
				continue;
			}
			$seen[ $slug ] = true;
			$items[]       = array(
				'slug'        => $slug,
				'title'       => $title,
				'description' => self::description( $slug ),
				'url'         => self::url( $slug ),
			);
		}
		/**
		 * Filter dashboard cards. Sidcraft Builder Pro appends its own admin screens here.
		 *
		 * @param array $items
		 */
		$filtered = apply_filters( 'sidcraft_page_builder_dashboard_items', $items );
		if ( ! is_array( $filtered ) ) {
			return $items;
		}
		$clean = array();
		$seen  = array();
		foreach ( $filtered as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}
			$slug = isset( $item['slug'] ) ? (string) $item['slug'] : '';
			$title = isset( $item['title'] ) ? wp_strip_all_tags( (string) $item['title'] ) : '';
			if ( $slug === '' || $slug === self::PAGE || $title === '' || isset( $seen[ $slug ] ) ) {
				continue;
			}
			$seen[ $slug ] = true;
			$clean[]       = array(
				'slug'        => $slug,
				'title'       => $title,
				'description' => isset( $item['description'] ) ? wp_strip_all_tags( (string) $item['description'] ) : '',
				'url'         => isset( $item['url'] ) && is_string( $item['url'] ) && $item['url'] !== '' ? $item['url'] : self::url( $slug ),
			);
		}
		return $clean;
	}

	public static function screen() {
		$cap = class_exists( Roles::class ) ? Roles::CAP_EDIT : 'edit_posts';
		if ( function_exists( 'current_user_can' ) && ! current_user_can( $cap ) ) {
			wp_die( esc_html__( 'You do not have permission to view the Sidcraft Page Builder dashboard.', 'sidcraft-page-builder' ) );
		}
		$by     = array();
		foreach ( self::items() as $item ) {
			$by[ $item['slug'] ] = $item;
		}
		$editor = isset( $by[ self::PARENT ] ) ? $by[ self::PARENT ]['url'] : self::url( self::PARENT );
		$editor = add_query_arg(
			array(
				'post_type' => 'page',
				'new_page'  => '1',
			),
			$editor
		);
		$templates = '';
		foreach ( array( 'sidcraft-page-builder-template-import', 'sidcraft-page-builder-tools' ) as $slug ) {
			if ( isset( $by[ $slug ] ) ) {
				$templates = $by[ $slug ]['url'];
				break;
			}
		}
		$tabs = array( self::PAGE => __( 'Dashboard', 'sidcraft-page-builder' ) );
		foreach ( array( 'sidcraft-page-builder-settings', 'sidcraft-page-builder-global', 'sidcraft-page-builder-tools', 'sidcraft-builder-pro-theme', 'sidcraft-builder-pro-licensing' ) as $slug ) {
			if ( isset( $by[ $slug ] ) ) {
				$tabs[ $slug ] = $by[ $slug ]['title'];
			}
		}
		$quick_slugs = array( 'sidcraft-page-builder-units', 'sidcraft-page-builder-roles', 'sidcraft-page-builder-global', 'sidcraft-page-builder-settings', 'sidcraft-builder-pro-licensing' );
		$quick       = array();
		foreach ( $quick_slugs as $slug ) {
			if ( isset( $by[ $slug ] ) ) {
				$quick[] = $by[ $slug ];
			}
			if ( count( $quick ) === 4 ) {
				break;
			}
		}
		$shown = array( self::PARENT => true, self::PAGE => true );
		foreach ( array_keys( $tabs ) as $slug ) {
			$shown[ $slug ] = true;
		}
		foreach ( $quick as $item ) {
			$shown[ $item['slug'] ] = true;
		}
		if ( $templates !== '' ) {
			foreach ( array( 'sidcraft-page-builder-template-import', 'sidcraft-page-builder-tools' ) as $slug ) {
				if ( isset( $by[ $slug ] ) && $by[ $slug ]['url'] === $templates ) {
					$shown[ $slug ] = true;
					break;
				}
			}
		}
		$shown[ self::DOCUMENTS_URL ] = true;
		$shown[ self::SUPPORT_URL ]   = true;
		$access = array();
		foreach ( $by as $slug => $item ) {
			if ( empty( $shown[ $slug ] ) ) {
				$access[] = $item;
			}
		}
		$icons = array(
			'sidcraft-page-builder-units'       => 'dashicons-screenoptions',
			'sidcraft-page-builder-roles'       => 'dashicons-groups',
			'sidcraft-page-builder-global'      => 'dashicons-art',
			'sidcraft-page-builder-settings'    => 'dashicons-admin-generic',
			self::DOCUMENTS_URL         => 'dashicons-media-document',
			self::SUPPORT_URL           => 'dashicons-sos',
			'sidcraft-builder-pro-licensing'    => 'dashicons-admin-network',
			'sidcraft-page-builder-tools'       => 'dashicons-admin-tools',
			'sidcraft-page-builder-system-info' => 'dashicons-info',
		);
		echo '<div class="wrap lb-dash">';
		echo '<h1 class="screen-reader-text">' . esc_html__( 'Dashboard', 'sidcraft-page-builder' ) . '</h1>';
		echo '<div class="lb-dash-header">';
		echo '<div class="lb-dash-brand"><span class="lb-dash-logo" aria-hidden="true">C</span><strong>Sidcraft Page Builder</strong></div>';
		echo '<nav class="lb-dash-tabs" aria-label="' . esc_attr__( 'Sidcraft Page Builder', 'sidcraft-page-builder' ) . '">';
		foreach ( $tabs as $slug => $label ) {
			if ( $slug === self::PAGE ) {
				echo '<span class="is-current" aria-current="page">' . esc_html( $label ) . '</span>';
				continue;
			}
			$url = isset( $by[ $slug ] ) ? $by[ $slug ]['url'] : self::url( $slug );
			echo '<a href="' . esc_url( $url ) . '">' . esc_html( $label ) . '</a>';
		}
		echo '</nav></div>';
		echo '<div class="lb-dash-body"><div class="lb-dash-main">';
		echo '<section class="lb-dash-card lb-dash-welcome">';
		echo '<div class="lb-dash-hello">';
		echo '<h2>' . esc_html__( 'Hello,', 'sidcraft-page-builder' ) . '</h2>';
		echo '<p>' . esc_html__( 'Design pages inside WordPress with Sidcraft Page Builder. Start a page, or open any Sidcraft Page Builder screen from this dashboard.', 'sidcraft-page-builder' ) . '</p>';
		echo '<p class="lb-dash-actions">';
		echo '<a class="button button-primary" href="' . esc_url( $editor ) . '">' . esc_html__( 'Create New Page', 'sidcraft-page-builder' ) . '</a>';
		if ( $templates !== '' ) {
			echo '<a class="button lb-dash-button-soft" href="' . esc_url( $templates ) . '">' . esc_html__( 'Explore Templates', 'sidcraft-page-builder' ) . '</a>';
		}
		echo '</p></div>';
		echo '<div class="lb-dash-promo">';
		echo '<strong>' . esc_html__( 'Welcome to Sidcraft Page Builder', 'sidcraft-page-builder' ) . '</strong>';
		echo '<span>' . esc_html__( 'Build in the visual editor', 'sidcraft-page-builder' ) . '</span>';
		echo '<a class="lb-dash-play" href="' . esc_url( $editor ) . '">' . esc_html__( 'Start', 'sidcraft-page-builder' ) . '</a>';
		echo '</div></section>';
		echo '<section class="lb-dash-block"><h2>' . esc_html__( 'Quick Settings', 'sidcraft-page-builder' ) . '</h2>';
		echo '<div class="lb-dash-quick">';
		$documents_placed = false;
		foreach ( $quick as $item ) {
			$icon = isset( $icons[ $item['slug'] ] ) ? $icons[ $item['slug'] ] : 'dashicons-admin-generic';
			echo '<a class="lb-dash-setting" href="' . esc_url( $item['url'] ) . '">';
			echo '<span class="lb-dash-setting-icon dashicons ' . esc_attr( $icon ) . '" aria-hidden="true"></span>';
			echo '<strong>' . esc_html( $item['title'] ) . '</strong>';
			echo '<span>' . esc_html__( 'Configure', 'sidcraft-page-builder' ) . '</span>';
			echo '</a>';
			if ( 'sidcraft-page-builder-settings' === $item['slug'] ) {
				self::render_documents_card();
				self::render_support_card();
				$documents_placed = true;
			}
		}
		if ( ! $documents_placed ) {
			self::render_documents_card();
			self::render_support_card();
		}
		echo '</div></section>';
		echo '<section class="lb-dash-block"><div class="lb-dash-block-head"><h2>' . esc_html__( 'Get Started', 'sidcraft-page-builder' ) . '</h2></div>';
		echo '<div class="lb-dash-lessons">';
		$lessons = array(
			array( $editor, __( 'Create a page', 'sidcraft-page-builder' ) ),
		);
		if ( isset( $by['sidcraft-page-builder-units'] ) ) {
			$lessons[] = array( $by['sidcraft-page-builder-units']['url'], __( 'Choose units', 'sidcraft-page-builder' ) );
		}
		if ( isset( $by['sidcraft-page-builder-settings'] ) ) {
			$lessons[] = array( $by['sidcraft-page-builder-settings']['url'], __( 'Site settings', 'sidcraft-page-builder' ) );
		}
		foreach ( $lessons as $lesson ) {
			echo '<a class="lb-dash-lesson" href="' . esc_url( $lesson[0] ) . '"><span>' . esc_html( $lesson[1] ) . '</span><i aria-hidden="true"></i></a>';
		}
		echo '</div></section>';
		echo '</div><aside class="lb-dash-side">';
		self::render_comparison();
		self::render_pro_pricing();
		if ( $templates !== '' ) {
			echo '<section class="lb-dash-card lb-dash-templates">';
			echo '<div class="lb-dash-sheets" aria-hidden="true"><span></span><span></span><span></span></div>';
			echo '<h2>' . esc_html__( 'Build pages faster with templates', 'sidcraft-page-builder' ) . '</h2>';
			echo '<p>' . esc_html__( 'Start from a saved template, then change it in the editor.', 'sidcraft-page-builder' ) . '</p>';
			echo '<a class="button button-primary" href="' . esc_url( $templates ) . '">' . esc_html__( 'Explore Templates', 'sidcraft-page-builder' ) . '</a>';
			echo '</section>';
		}
		if ( $access ) {
			echo '<section class="lb-dash-card lb-dash-access"><h2>' . esc_html__( 'Quick Access', 'sidcraft-page-builder' ) . '</h2><ul>';
			foreach ( $access as $item ) {
				$icon = isset( $icons[ $item['slug'] ] ) ? $icons[ $item['slug'] ] : 'dashicons-admin-links';
				echo '<li><a href="' . esc_url( $item['url'] ) . '"><span class="dashicons ' . esc_attr( $icon ) . '" aria-hidden="true"></span>' . esc_html( $item['title'] ) . '</a></li>';
			}
			echo '</ul></section>';
		}
		echo '</aside></div></div>';
	}

	/**
	 * Documentation card. Rendered in Quick Settings, immediately after Settings.
	 */
	private static function render_documents_card() {
		echo '<a class="lb-dash-setting" href="' . esc_url( self::DOCUMENTS_URL ) . '" target="_blank" rel="noopener noreferrer">';
		echo '<span class="lb-dash-setting-icon dashicons dashicons-media-document" aria-hidden="true"></span>';
		echo '<strong>' . esc_html__( 'Documents', 'sidcraft-page-builder' ) . '</strong>';
		echo '<span>' . esc_html__( 'Open', 'sidcraft-page-builder' ) . '</span>';
		echo '</a>';
	}

	/**
	 * Support card. Rendered in Quick Settings, immediately after Documents.
	 */
	private static function render_support_card() {
		echo '<div class="lb-dash-support">';
		echo '<a class="lb-dash-setting" href="' . esc_url( self::SUPPORT_URL ) . '" target="_blank" rel="noopener noreferrer">';
		echo '<span class="lb-dash-setting-icon dashicons dashicons-sos" aria-hidden="true"></span>';
		echo '<strong>' . esc_html__( 'Support', 'sidcraft-page-builder' ) . '</strong>';
		echo '<span class="screen-reader-text">' . esc_html__( '(opens in a new tab)', 'sidcraft-page-builder' ) . '</span>';
		echo '<span>' . esc_html__( 'Open', 'sidcraft-page-builder' ) . '</span>';
		echo '</a>';
		echo '<p class="description">' . esc_html__( 'E-Mail support is provided only to Sidcraft Builder Pro licensed users.', 'sidcraft-page-builder' ) . '</p>';
		echo '</div>';
	}

	/**
	 * Lite vs Pro chart. Sits in the dashboard sidebar.
	 */
	public static function render_comparison() {
		$pro_price = __( 'From $59 / year', 'sidcraft-page-builder' );
		if ( class_exists( '\SidcraftBuilderPro\License' ) && method_exists( '\SidcraftBuilderPro\License', 'plans' ) ) {
			$prices = array();
			foreach ( \SidcraftBuilderPro\License::plans() as $plan ) {
				if ( isset( $plan['price_usd'] ) ) {
					$prices[] = (int) $plan['price_usd'];
				}
			}
			if ( $prices ) {
				$pro_price = sprintf(
					/* translators: %d: lowest Sidcraft Builder Pro annual price in US dollars. */
					__( 'From $%d / year', 'sidcraft-page-builder' ),
					min( $prices )
				);
			}
		}
		echo '<section class="lb-dash-card lb-dash-compare">';
		echo '<table class="lb-dash-compare-table">';
		echo '<caption class="screen-reader-text">' . esc_html__( 'Sidcraft Page Builder versus Sidcraft Builder Pro', 'sidcraft-page-builder' ) . '</caption>';
		echo '<thead><tr class="lb-dash-compare-banner">';
		echo '<th scope="col"><strong>' . esc_html__( 'Sidcraft Page Builder', 'sidcraft-page-builder' ) . '</strong>';
		echo '<span>' . esc_html__( 'Feature Comparison', 'sidcraft-page-builder' ) . '</span>';
		echo '<em>' . esc_html__( 'Two plugins. One document model.', 'sidcraft-page-builder' ) . '</em></th>';
		echo '<th scope="col"><strong>' . esc_html__( 'Sidcraft Page Builder', 'sidcraft-page-builder' ) . '</strong>';
		echo '<span>' . esc_html__( 'Free', 'sidcraft-page-builder' ) . '</span>';
		echo '<em>' . esc_html__( 'Visual page builder', 'sidcraft-page-builder' ) . '</em></th>';
		echo '<th scope="col"><strong>' . esc_html__( 'Sidcraft Builder Pro', 'sidcraft-page-builder' ) . '</strong>';
		echo '<span>' . esc_html( $pro_price ) . '</span>';
		echo '<em>' . esc_html__( 'Theme, shop, and payments', 'sidcraft-page-builder' ) . '</em></th>';
		echo '</tr><tr class="lb-dash-compare-cols">';
		echo '<th scope="col">' . esc_html__( 'Feature', 'sidcraft-page-builder' ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'Lite', 'sidcraft-page-builder' ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'Pro', 'sidcraft-page-builder' ) . '</th>';
		echo '</tr></thead><tbody>';
		$group = '';
		foreach ( self::comparison_rows() as $row ) {
			if ( $row['group'] !== $group ) {
				$group = $row['group'];
				echo '<tr class="lb-dash-compare-group"><th colspan="3" scope="colgroup">' . esc_html( $group ) . '</th></tr>';
			}
			echo '<tr>';
			echo '<th scope="row"><strong>' . esc_html( $row['name'] ) . '</strong>';
			if ( $row['detail'] !== '' ) {
				echo '<span>' . esc_html( $row['detail'] ) . '</span>';
			}
			echo '</th>';
			echo '<td>' . wp_kses_post( self::comparison_mark( $row['lite'], $row['lite_note'] ) ) . '</td>';
			echo '<td>' . wp_kses_post( self::comparison_mark( $row['pro'], $row['pro_note'] ) ) . '</td>';
			echo '</tr>';
		}
		echo '</tbody><tfoot><tr>';
		echo '<th scope="row">' . esc_html__( 'Price', 'sidcraft-page-builder' ) . '</th>';
		echo '<td><strong>' . esc_html__( 'Free', 'sidcraft-page-builder' ) . '</strong><span>' . esc_html__( 'Start building', 'sidcraft-page-builder' ) . '</span></td>';
		echo '<td><strong>' . esc_html( $pro_price ) . '</strong><span>' . esc_html__( 'Same features on every plan', 'sidcraft-page-builder' ) . '</span></td>';
		echo '</tr></tfoot></table>';
		echo '<p class="lb-dash-compare-note">' . esc_html__( 'Pro loads only when Lite is active and at least version 0.12.73. WooCommerce elements stay unloaded without WooCommerce. Without a valid Pro key, new Pro elements are dropped on save.', 'sidcraft-page-builder' ) . '</p>';
		echo '</section>';
	}

	/**
	 * Pro annual plans under the comparison chart.
	 *
	 * Rendered from Lite so the cards stay visible when Sidcraft Builder Pro is not
	 * installed or its license is not active. Prices match License::plans().
	 */
	public static function render_pro_pricing() {
		echo '<section class="lb-dash-pricing">';
		echo '<h2>' . esc_html__( 'Licensing', 'sidcraft-page-builder' ) . '</h2>';
		echo '<p>' . esc_html__( 'Choose a Sidcraft Builder Pro annual plan. Checkout and license-key delivery are handled on the Sidcraft Page Builder license site.', 'sidcraft-page-builder' ) . '</p>';
		echo '<div class="sidcraft-page-builder-pricing-grid">';
		foreach ( self::pro_plans() as $code => $plan ) {
			$sites      = isset( $plan['sites_allowed'] ) ? (int) $plan['sites_allowed'] : 1;
			$price      = isset( $plan['price_usd'] ) ? (int) $plan['price_usd'] : 0;
			$name       = isset( $plan['name'] ) ? (string) $plan['name'] : '';
			$site_label = sprintf(
				/* translators: %d: number of sites included in the plan. */
				_n( '%d site included', '%d sites included', $sites, 'sidcraft-page-builder' ),
				$sites
			);
			echo '<div class="sidcraft-page-builder-pricing-card">';
			echo '<h3>' . esc_html( $name ) . '</h3>';
			echo '<p class="sidcraft-page-builder-pricing-price">$' . esc_html( (string) $price ) . ' <span>' . esc_html__( '/ year', 'sidcraft-page-builder' ) . '</span></p>';
			echo '<p class="sidcraft-page-builder-pricing-meta">' . esc_html( $site_label ) . '</p>';
			echo '<p><a class="button button-primary" href="' . esc_url( self::pro_plan_url( (string) $code ) ) . '" target="_blank" rel="noopener noreferrer">';
			echo esc_html(
				sprintf(
					/* translators: %s: license plan name. */
					__( 'Purchase %s', 'sidcraft-page-builder' ),
					$name
				)
			);
			echo '</a></p></div>';
		}
		echo '</div></section>';
	}

	/**
	 * @return array<string,array{name:string,price_usd:int,sites_allowed:int}>
	 */
	private static function pro_plans() {
		if ( class_exists( '\SidcraftBuilderPro\License' ) && method_exists( '\SidcraftBuilderPro\License', 'plans' ) ) {
			$plans = \SidcraftBuilderPro\License::plans();
			if ( is_array( $plans ) && $plans ) {
				return $plans;
			}
		}
		return array(
			'pro_personal'  => array(
				'name'          => 'Pro Personal',
				'price_usd'     => 59,
				'sites_allowed' => 1,
			),
			'pro_business'  => array(
				'name'          => 'Pro Business',
				'price_usd'     => 79,
				'sites_allowed' => 5,
			),
			'pro_agency'    => array(
				'name'          => 'Pro Agency',
				'price_usd'     => 129,
				'sites_allowed' => 25,
			),
			'pro_unlimited' => array(
				'name'          => 'Pro Unlimited',
				'price_usd'     => 199,
				'sites_allowed' => 100,
			),
		);
	}

	/**
	 * Checkout URL on the Sidcraft Page Builder license site, with the plan preselected.
	 *
	 * @param string $code
	 * @return string
	 */
	private static function pro_plan_url( $code ) {
		if ( class_exists( '\SidcraftBuilderPro\License' ) && method_exists( '\SidcraftBuilderPro\License', 'plan_purchase_url' ) ) {
			$url = \SidcraftBuilderPro\License::plan_purchase_url( $code );
			if ( is_string( $url ) && $url !== '' && strpos( $url, 'plan=' ) !== false ) {
				return $url;
			}
		}
		return 'https://license.canvasly.pro/?plan=' . rawurlencode( $code );
	}

	/**
	 * @param string $state yes, no, or note.
	 * @param string $note
	 * @return string
	 */
	private static function comparison_mark( $state, $note ) {
		if ( 'no' === $state ) {
			return '<span class="lb-dash-mark lb-dash-mark-no" aria-label="' . esc_attr( __( 'Not included', 'sidcraft-page-builder' ) ) . '">&#10007;</span>';
		}
		if ( 'yes' === $state && $note === '' ) {
			return '<span class="lb-dash-mark lb-dash-mark-yes" aria-label="' . esc_attr( __( 'Included', 'sidcraft-page-builder' ) ) . '">&#10003;</span>';
		}
		$html = '';
		if ( 'yes' === $state ) {
			$html .= '<span class="lb-dash-mark lb-dash-mark-yes" aria-hidden="true">&#10003;</span>';
		}
		if ( $note !== '' ) {
			$html .= '<span class="lb-dash-mark-text">' . esc_html( $note ) . '</span>';
		}
		return $html;
	}

	/**
	 * @return array<int,array{group:string,name:string,detail:string,lite:string,lite_note:string,pro:string,pro_note:string}>
	 */
	private static function comparison_rows() {
		return array(
			array(
				'group'     => __( 'Builder', 'sidcraft-page-builder' ),
				'name'      => __( 'Visual editor', 'sidcraft-page-builder' ),
				'detail'    => __( 'Drag-and-drop canvas, nested containers, CSS Grid, desktop, tablet, and mobile.', 'sidcraft-page-builder' ),
				'lite'      => 'yes',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Builder', 'sidcraft-page-builder' ),
				'name'      => __( 'Core elements', 'sidcraft-page-builder' ),
				'detail'    => __( 'Heading, text, image, button, gallery, video, tabs, form, price table, collection loop, and the rest of the Lite library.', 'sidcraft-page-builder' ),
				'lite'      => 'yes',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Builder', 'sidcraft-page-builder' ),
				'name'      => __( 'Design system', 'sidcraft-page-builder' ),
				'detail'    => __( 'Global colors, typography, variables, classes, components, and site-kit import and export.', 'sidcraft-page-builder' ),
				'lite'      => 'yes',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => __( 'Kit also carries Pro theme templates', 'sidcraft-page-builder' ),
			),
			array(
				'group'     => __( 'Builder', 'sidcraft-page-builder' ),
				'name'      => __( 'Style and custom CSS', 'sidcraft-page-builder' ),
				'detail'    => __( 'Typography, spacing, borders, shadows, visibility, ARIA, and CSS on the element or the page.', 'sidcraft-page-builder' ),
				'lite'      => 'yes',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Builder', 'sidcraft-page-builder' ),
				'name'      => __( 'Entrance and exit motion', 'sidcraft-page-builder' ),
				'detail'    => __( 'CSS presets, custom keyframes, and viewport, load, hover, click, and scroll triggers.', 'sidcraft-page-builder' ),
				'lite'      => 'yes',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Builder', 'sidcraft-page-builder' ),
				'name'      => __( 'Sticky, scroll, and page transitions', 'sidcraft-page-builder' ),
				'detail'    => __( 'Stick to top or bottom, scroll opacity, slide, and scale, scroll snap, and page transitions.', 'sidcraft-page-builder' ),
				'lite'      => 'no',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Content', 'sidcraft-page-builder' ),
				'name'      => __( 'Saved templates', 'sidcraft-page-builder' ),
				'detail'    => __( 'Shortcode, Gutenberg block, template widget, or sidebar widget.', 'sidcraft-page-builder' ),
				'lite'      => 'note',
				'lite_note' => __( 'Page templates', 'sidcraft-page-builder' ),
				'pro'       => 'note',
				'pro_note'  => __( 'Also header, footer, popup, loop item, section', 'sidcraft-page-builder' ),
			),
			array(
				'group'     => __( 'Content', 'sidcraft-page-builder' ),
				'name'      => __( 'Collection loop', 'sidcraft-page-builder' ),
				'detail'    => __( 'Query posts or terms, with numbered, previous-next, or load-more pagination.', 'sidcraft-page-builder' ),
				'lite'      => 'yes',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => __( 'Loop-item templates and a taxonomy filter', 'sidcraft-page-builder' ),
			),
			array(
				'group'     => __( 'Content', 'sidcraft-page-builder' ),
				'name'      => __( 'Dynamic tags', 'sidcraft-page-builder' ),
				'detail'    => __( 'Values that resolve in the editor and on the front end.', 'sidcraft-page-builder' ),
				'lite'      => 'note',
				'lite_note' => __( 'Post, author, site, user, archive, term', 'sidcraft-page-builder' ),
				'pro'       => 'note',
				'pro_note'  => __( 'Plus request, custom fields, ACF, product price and SKU', 'sidcraft-page-builder' ),
			),
			array(
				'group'     => __( 'Content', 'sidcraft-page-builder' ),
				'name'      => __( 'Forms', 'sidcraft-page-builder' ),
				'detail'    => __( 'Lite keeps the form element. Pro extends fields and what happens after submit.', 'sidcraft-page-builder' ),
				'lite'      => 'note',
				'lite_note' => __( 'One email', 'sidcraft-page-builder' ),
				'pro'       => 'note',
				'pro_note'  => __( 'Email, redirect, webhook, submissions log, CSV', 'sidcraft-page-builder' ),
			),
			array(
				'group'     => __( 'Content', 'sidcraft-page-builder' ),
				'name'      => __( 'Extra form fields', 'sidcraft-page-builder' ),
				'detail'    => __( 'Number, date, radio, acceptance, and file upload.', 'sidcraft-page-builder' ),
				'lite'      => 'no',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Content', 'sidcraft-page-builder' ),
				'name'      => __( 'Pro elements', 'sidcraft-page-builder' ),
				'detail'    => __( 'Call to action, countdown, carousels, hotspot, price list, off-canvas, Lottie, video playlist, and the rest of the Pro set.', 'sidcraft-page-builder' ),
				'lite'      => 'no',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Theme', 'sidcraft-page-builder' ),
				'name'      => __( 'Theme Builder', 'sidcraft-page-builder' ),
				'detail'    => __( 'Header, footer, single, archive, search, 404, and section, with display rules.', 'sidcraft-page-builder' ),
				'lite'      => 'no',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Theme', 'sidcraft-page-builder' ),
				'name'      => __( 'Theme elements', 'sidcraft-page-builder' ),
				'detail'    => __( 'Site identity, the current post, archives, author, comments, breadcrumbs, search, and a sitemap.', 'sidcraft-page-builder' ),
				'lite'      => 'no',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Theme', 'sidcraft-page-builder' ),
				'name'      => __( 'Popups', 'sidcraft-page-builder' ),
				'detail'    => __( 'Load, scroll, click, exit, and inactivity triggers. A link can open one.', 'sidcraft-page-builder' ),
				'lite'      => 'no',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Theme', 'sidcraft-page-builder' ),
				'name'      => __( 'Display conditions', 'sidcraft-page-builder' ),
				'detail'    => __( 'Hide one element by role, login, date, author, taxonomy, or URL parameter.', 'sidcraft-page-builder' ),
				'lite'      => 'note',
				'lite_note' => __( 'Device visibility only', 'sidcraft-page-builder' ),
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Theme', 'sidcraft-page-builder' ),
				'name'      => __( 'Menus', 'sidcraft-page-builder' ),
				'detail'    => __( 'WordPress menus with dropdowns, and a mega menu from a section template.', 'sidcraft-page-builder' ),
				'lite'      => 'note',
				'lite_note' => __( 'Site navigation element', 'sidcraft-page-builder' ),
				'pro'       => 'note',
				'pro_note'  => __( 'Nav Menu and mega menu', 'sidcraft-page-builder' ),
			),
			array(
				'group'     => __( 'Theme', 'sidcraft-page-builder' ),
				'name'      => __( 'Custom code, fonts, and icons', 'sidcraft-page-builder' ),
				'detail'    => __( 'Site-wide snippets, uploaded font files, and extra icon sets.', 'sidcraft-page-builder' ),
				'lite'      => 'note',
				'lite_note' => __( 'Per-element CSS, Google Fonts, icon manager', 'sidcraft-page-builder' ),
				'pro'       => 'note',
				'pro_note'  => __( 'Site snippets, uploaded fonts, custom icon sets', 'sidcraft-page-builder' ),
			),
			array(
				'group'     => __( 'Shop', 'sidcraft-page-builder' ),
				'name'      => __( 'WooCommerce templates', 'sidcraft-page-builder' ),
				'detail'    => __( 'Product and product-archive locations. Unloaded without WooCommerce.', 'sidcraft-page-builder' ),
				'lite'      => 'no',
				'lite_note' => '',
				'pro'       => 'note',
				'pro_note'  => __( 'When WooCommerce is active', 'sidcraft-page-builder' ),
			),
			array(
				'group'     => __( 'Shop', 'sidcraft-page-builder' ),
				'name'      => __( 'Product and cart elements', 'sidcraft-page-builder' ),
				'detail'    => __( 'Product parts, menu cart, and notices. Cart, checkout, and my account print WooCommerce forms.', 'sidcraft-page-builder' ),
				'lite'      => 'no',
				'lite_note' => '',
				'pro'       => 'note',
				'pro_note'  => __( 'When WooCommerce is active', 'sidcraft-page-builder' ),
			),
			array(
				'group'     => __( 'Shop', 'sidcraft-page-builder' ),
				'name'      => __( 'Hosted payments', 'sidcraft-page-builder' ),
				'detail'    => __( 'Stripe, PayPal, Square, Razorpay, Mollie, and Authorize.net. Card data stays on the gateway.', 'sidcraft-page-builder' ),
				'lite'      => 'no',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Platform', 'sidcraft-page-builder' ),
				'name'      => __( 'Editor notes', 'sidcraft-page-builder' ),
				'detail'    => __( 'Notes on a node for people who can edit. Not public comments.', 'sidcraft-page-builder' ),
				'lite'      => 'no',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Platform', 'sidcraft-page-builder' ),
				'name'      => __( 'AI connection', 'sidcraft-page-builder' ),
				'detail'    => __( 'AI connection, MCP host, and the layout-schema API.', 'sidcraft-page-builder' ),
				'lite'      => 'no',
				'lite_note' => '',
				'pro'       => 'yes',
				'pro_note'  => '',
			),
			array(
				'group'     => __( 'Platform', 'sidcraft-page-builder' ),
				'name'      => __( 'License', 'sidcraft-page-builder' ),
				'detail'    => __( 'An inactive key blocks new Pro elements and Pro REST routes.', 'sidcraft-page-builder' ),
				'lite'      => 'note',
				'lite_note' => __( 'No license', 'sidcraft-page-builder' ),
				'pro'       => 'note',
				'pro_note'  => __( 'Annual key, same features on every plan', 'sidcraft-page-builder' ),
			),
		);
	}

	/**
	 * @param string $slug
	 * @return string
	 */
	private static function description( $slug ) {
		$map = array(
			'sidcraft-page-builder'                  => __( 'Open the visual builder.', 'sidcraft-page-builder' ),
			'sidcraft-page-builder-units'            => __( 'Enable units and limit them by role.', 'sidcraft-page-builder' ),
			'sidcraft-page-builder-roles'            => __( 'Choose which roles can edit and design.', 'sidcraft-page-builder' ),
			'sidcraft-page-builder-settings'         => __( 'Site options, integrations, performance, and tools.', 'sidcraft-page-builder' ),
			'sidcraft-page-builder-global'           => __( 'Colors, fonts, and global design tokens.', 'sidcraft-page-builder' ),
			'sidcraft-page-builder-tools'            => __( 'Regenerate CSS, replace URLs, and import a kit.', 'sidcraft-page-builder' ),
			'sidcraft-page-builder-system-info'      => __( 'Environment report for support.', 'sidcraft-page-builder' ),
			'sidcraft-page-builder-template-import'  => __( 'Import saved templates.', 'sidcraft-page-builder' ),
			self::DOCUMENTS_URL              => __( 'Sidcraft Page Builder documentation.', 'sidcraft-page-builder' ),
			self::SUPPORT_URL                => __( 'E-Mail support is provided only to Sidcraft Builder Pro licensed users.', 'sidcraft-page-builder' ),
		);
		return isset( $map[ $slug ] ) ? $map[ $slug ] : '';
	}

	/**
	 * @param string $slug
	 * @return string
	 */
	private static function url( $slug ) {
		if ( preg_match( '#^https?://#i', $slug ) ) {
			return $slug;
		}
		if ( function_exists( 'menu_page_url' ) ) {
			$url = menu_page_url( $slug, false );
			if ( is_string( $url ) && $url !== '' ) {
				return $url;
			}
		}
		if ( strpos( $slug, '.php' ) !== false ) {
			return admin_url( $slug );
		}
		return admin_url( 'admin.php?page=' . rawurlencode( $slug ) );
	}
}
