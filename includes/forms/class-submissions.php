<?php
/**
 * Form Entries: keeps recent Form unit submissions so a lead is never lost
 * when the site's email fails.
 *
 * Entries are private posts of the `sidsyn_submission` type. Each form keeps
 * only its newest entries (50 by default, set on the screen; 0 turns storage
 * off). Visitor IP addresses are not stored. Personal data exporters and
 * erasers are registered for the email addresses found in an entry.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Forms;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Submissions {
	const POST_TYPE   = 'sidsyn_submission';
	const OPTION_KEEP = 'sidcraft_page_builder_submissions_keep';
	const PAGE        = 'sidcraft-page-builder-entries';
	const NONCE       = 'sidsyn_entries';
	const DEFAULT_KEEP = 50;
	const MAX_KEEP     = 1000;
	const META_UNIT    = '_sidsyn_unit_id';
	const META_MAIL    = '_sidsyn_mail_sent';
	const META_EMAIL   = '_sidsyn_email';

	/**
	 * @return void
	 */
	public static function init() {
		add_action( 'init', array( self::class, 'register_type' ) );
		add_action( 'sidcraft_page_builder_form_submitted', array( self::class, 'store' ), 10, 4 );
		add_filter( 'wp_privacy_personal_data_exporters', array( self::class, 'register_exporter' ) );
		add_filter( 'wp_privacy_personal_data_erasers', array( self::class, 'register_eraser' ) );
		if ( is_admin() ) {
			add_action( 'admin_menu', array( self::class, 'menu' ), 12 );
			add_action( 'admin_init', array( self::class, 'maybe_act' ) );
			add_action( 'admin_init', array( self::class, 'privacy_text' ) );
		}
	}

	/**
	 * @return void
	 */
	public static function register_type() {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'          => __( 'Form Entries', 'sidcraft-page-builder' ),
					'singular_name' => __( 'Form Entry', 'sidcraft-page-builder' ),
				),
				'public'              => false,
				'show_ui'             => false,
				'show_in_rest'        => false,
				'exclude_from_search' => true,
				'publicly_queryable'  => false,
				'query_var'           => false,
				'rewrite'             => false,
				'can_export'          => false,
				'supports'            => array( 'title' ),
			)
		);
	}

	/**
	 * Entries kept per form. 0 turns storage off.
	 *
	 * @return int
	 */
	public static function keep() {
		$keep = get_option( self::OPTION_KEEP, self::DEFAULT_KEEP );
		$keep = is_numeric( $keep ) ? (int) $keep : self::DEFAULT_KEEP;
		return max( 0, min( self::MAX_KEEP, $keep ) );
	}

	/**
	 * Whether this plugin stores entries. Add-ons with their own submissions log
	 * (Sidcraft Builder Pro) turn this off so entries are not stored twice.
	 *
	 * @return bool
	 */
	public static function enabled() {
		/**
		 * Filter whether Sidcraft Page Builder stores Form unit entries.
		 *
		 * @param bool $enabled
		 */
		return self::keep() > 0 && (bool) apply_filters( 'sidcraft_page_builder_store_submissions', true );
	}

	/**
	 * Save one submission after the form was handled.
	 *
	 * @param array            $result  Handler result (post_id, unit_id, subject…).
	 * @param array            $fields  Sanitized field values.
	 * @param \WP_REST_Request $request Request.
	 * @param bool             $ok      Whether the form reported success.
	 * @return void
	 */
	public static function store( $result, $fields, $request = null, $ok = false ) {
		unset( $request );
		if ( ! self::enabled() || ! is_array( $fields ) || ! $fields ) {
			return;
		}
		$result  = is_array( $result ) ? $result : array();
		$post_id = absint( $result['post_id'] ?? 0 );
		$unit_id = preg_replace( '/[^A-Za-z0-9_-]/', '', (string) ( $result['unit_id'] ?? '' ) );
		$clean   = array();
		foreach ( $fields as $key => $value ) {
			$key = sanitize_key( (string) $key );
			if ( '' === $key || 0 === strpos( $key, '_' ) ) {
				continue;
			}
			$clean[ $key ] = sanitize_textarea_field( is_scalar( $value ) ? (string) $value : '' );
		}
		if ( ! $clean ) {
			return;
		}
		$page  = $post_id ? get_the_title( $post_id ) : '';
		$title = '' !== $page ? $page : __( 'Form entry', 'sidcraft-page-builder' );
		$id    = wp_insert_post(
			array(
				'post_type'    => self::POST_TYPE,
				'post_status'  => 'private',
				'post_title'   => $title,
				'post_content' => wp_slash( (string) wp_json_encode( $clean ) ),
				'post_parent'  => $post_id,
				'post_author'  => 0,
			),
			true
		);
		if ( is_wp_error( $id ) || ! $id ) {
			return;
		}
		update_post_meta( $id, self::META_UNIT, $unit_id );
		update_post_meta( $id, self::META_MAIL, ! empty( $result['send_email'] ) && $ok ? '1' : '0' );
		foreach ( $clean as $value ) {
			if ( is_email( $value ) ) {
				add_post_meta( $id, self::META_EMAIL, strtolower( $value ) );
			}
		}
		self::prune( $post_id, $unit_id );
	}

	/**
	 * Keep only the newest entries of one form.
	 *
	 * @param int    $post_id Page the form is on.
	 * @param string $unit_id Form unit id.
	 * @return void
	 */
	public static function prune( $post_id, $unit_id ) {
		$keep = self::keep();
		$old  = get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'post_status'    => 'private',
				'post_parent'    => absint( $post_id ),
				'posts_per_page' => 200,
				'offset'         => $keep,
				'orderby'        => 'ID',
				'order'          => 'DESC',
				'fields'         => 'ids',
				'no_found_rows'  => true,
				'meta_key'       => self::META_UNIT, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- Bounded admin-side cleanup after a submission.
				'meta_value'     => (string) $unit_id, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- Bounded admin-side cleanup after a submission.
			)
		);
		foreach ( $old as $id ) {
			wp_delete_post( (int) $id, true );
		}
	}

	/**
	 * Decoded fields of an entry.
	 *
	 * @param \WP_Post|int $post Entry.
	 * @return array<string,string>
	 */
	public static function fields( $post ) {
		$post = get_post( $post );
		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return array();
		}
		$data = json_decode( (string) $post->post_content, true );
		return is_array( $data ) ? $data : array();
	}

	/* ------------------------------------------------------------------ *
	 * Admin screen
	 * ------------------------------------------------------------------ */

	/**
	 * @return bool
	 */
	public static function can_manage() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Shown while this plugin stores entries, or while stored entries remain.
	 *
	 * @return void
	 */
	public static function menu() {
		if ( ! self::enabled() && ! self::count() ) {
			return;
		}
		add_submenu_page(
			'sidcraft-page-builder',
			__( 'Form Entries', 'sidcraft-page-builder' ),
			__( 'Form Entries', 'sidcraft-page-builder' ),
			'manage_options',
			self::PAGE,
			array( self::class, 'screen' )
		);
	}

	/**
	 * @return int
	 */
	public static function count() {
		$counts = wp_count_posts( self::POST_TYPE );
		return isset( $counts->private ) ? (int) $counts->private : 0;
	}

	/**
	 * Delete one entry, delete all, or save the retention setting.
	 *
	 * @return void
	 */
	public static function maybe_act() {
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Only routes to the checks below.
		if ( self::PAGE !== $page || ! self::can_manage() ) {
			return;
		}
		if ( isset( $_GET['sidsyn_delete'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Verified next.
			$id = absint( wp_unslash( $_GET['sidsyn_delete'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Verified next.
			check_admin_referer( self::NONCE . '_delete_' . $id );
			$post = get_post( $id );
			if ( $post && self::POST_TYPE === $post->post_type ) {
				wp_delete_post( $id, true );
			}
			wp_safe_redirect( add_query_arg( array( 'page' => self::PAGE, 'deleted' => 1 ), admin_url( 'admin.php' ) ) );
			exit;
		}
		if ( empty( $_POST['sidsyn_entries_action'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified next.
			return;
		}
		check_admin_referer( self::NONCE );
		$action = sanitize_key( wp_unslash( $_POST['sidsyn_entries_action'] ) );
		if ( 'save' === $action ) {
			$keep = isset( $_POST['sidsyn_keep'] ) ? absint( wp_unslash( $_POST['sidsyn_keep'] ) ) : self::DEFAULT_KEEP;
			update_option( self::OPTION_KEEP, max( 0, min( self::MAX_KEEP, $keep ) ), false );
			add_settings_error( 'sidcraft_page_builder_entries', 'saved', __( 'Settings saved.', 'sidcraft-page-builder' ), 'updated' );
		} elseif ( 'delete_all' === $action ) {
			do {
				$ids = get_posts(
					array(
						'post_type'      => self::POST_TYPE,
						'post_status'    => 'any',
						'posts_per_page' => 200,
						'fields'         => 'ids',
						'no_found_rows'  => true,
					)
				);
				foreach ( $ids as $id ) {
					wp_delete_post( (int) $id, true );
				}
			} while ( $ids );
			add_settings_error( 'sidcraft_page_builder_entries', 'deleted', __( 'All form entries were deleted.', 'sidcraft-page-builder' ), 'updated' );
		}
	}

	/**
	 * @return void
	 */
	public static function screen() {
		if ( ! self::can_manage() ) {
			wp_die( esc_html__( 'Only administrators can view form entries.', 'sidcraft-page-builder' ) );
		}
		$paged    = isset( $_GET['paged'] ) ? max( 1, absint( wp_unslash( $_GET['paged'] ) ) ) : 1; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only pagination.
		$per_page = 20;
		$query    = new \WP_Query(
			array(
				'post_type'      => self::POST_TYPE,
				'post_status'    => 'private',
				'posts_per_page' => $per_page,
				'paged'          => $paged,
				'orderby'        => 'ID',
				'order'          => 'DESC',
			)
		);
		echo '<div class="wrap lb-settings-wrap">';
		echo '<h1>' . esc_html__( 'Form Entries', 'sidcraft-page-builder' ) . '</h1>';
		if ( isset( $_GET['deleted'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Display only.
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Entry deleted.', 'sidcraft-page-builder' ) . '</p></div>';
		}
		settings_errors( 'sidcraft_page_builder_entries' );
		if ( ! self::enabled() && self::keep() > 0 ) {
			echo '<div class="notice notice-info"><p>' . esc_html__( 'Another plugin now keeps the submissions log, so new entries are no longer stored here. The entries below are older ones.', 'sidcraft-page-builder' ) . '</p></div>';
		}
		echo '<p class="description">' . esc_html__( 'Recent submissions of Sidcraft Page Builder forms, stored even when the notification email fails. Visitor IP addresses are not stored.', 'sidcraft-page-builder' ) . '</p>';

		echo '<form method="post" style="margin:12px 0">';
		wp_nonce_field( self::NONCE );
		echo '<label for="sidsyn-keep">' . esc_html__( 'Entries to keep per form', 'sidcraft-page-builder' ) . '</label> ';
		echo '<input type="number" id="sidsyn-keep" name="sidsyn_keep" min="0" max="' . esc_attr( (string) self::MAX_KEEP ) . '" value="' . esc_attr( (string) self::keep() ) . '" class="small-text"> ';
		echo '<button type="submit" class="button" name="sidsyn_entries_action" value="save">' . esc_html__( 'Save', 'sidcraft-page-builder' ) . '</button> ';
		echo '<span class="description">' . esc_html__( '0 turns storage off. Older entries are deleted automatically.', 'sidcraft-page-builder' ) . '</span>';
		if ( $query->found_posts ) {
			echo ' <button type="submit" class="button button-link-delete" name="sidsyn_entries_action" value="delete_all" onclick="return window.confirm(this.dataset.confirm)" data-confirm="' . esc_attr__( 'Delete every stored form entry? This cannot be undone.', 'sidcraft-page-builder' ) . '">' . esc_html__( 'Delete all entries', 'sidcraft-page-builder' ) . '</button>';
		}
		echo '</form>';

		echo '<table class="widefat striped"><thead><tr>';
		echo '<th scope="col">' . esc_html__( 'Date', 'sidcraft-page-builder' ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'Page', 'sidcraft-page-builder' ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'Entry', 'sidcraft-page-builder' ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'Email sent', 'sidcraft-page-builder' ) . '</th>';
		echo '<th scope="col"><span class="screen-reader-text">' . esc_html__( 'Actions', 'sidcraft-page-builder' ) . '</span></th>';
		echo '</tr></thead><tbody>';
		if ( ! $query->have_posts() ) {
			echo '<tr><td colspan="5">' . esc_html__( 'No entries yet. Submissions of Form units appear here.', 'sidcraft-page-builder' ) . '</td></tr>';
		}
		foreach ( $query->posts as $post ) {
			$fields  = self::fields( $post );
			$preview = array();
			foreach ( array_slice( $fields, 0, 2, true ) as $value ) {
				$preview[] = wp_html_excerpt( (string) $value, 40, '…' );
			}
			$parent = (int) $post->post_parent;
			$sent   = '1' === get_post_meta( $post->ID, self::META_MAIL, true );
			$delete = wp_nonce_url( add_query_arg( array( 'page' => self::PAGE, 'sidsyn_delete' => $post->ID ), admin_url( 'admin.php' ) ), self::NONCE . '_delete_' . $post->ID );
			echo '<tr>';
			echo '<td>' . esc_html( get_date_from_gmt( $post->post_date_gmt, get_option( 'date_format' ) . ' ' . get_option( 'time_format' ) ) ) . '</td>';
			echo '<td>' . ( $parent ? '<a href="' . esc_url( (string) get_permalink( $parent ) ) . '">' . esc_html( get_the_title( $parent ) ) . '</a>' : '&mdash;' ) . '</td>';
			echo '<td><details><summary>' . esc_html( implode( ' · ', $preview ) ) . '</summary><table class="form-table" role="presentation">';
			foreach ( $fields as $key => $value ) {
				echo '<tr><th scope="row">' . esc_html( (string) $key ) . '</th><td>' . nl2br( esc_html( (string) $value ) ) . '</td></tr>';
			}
			echo '</table></details></td>';
			echo '<td>' . ( $sent ? esc_html__( 'Yes', 'sidcraft-page-builder' ) : '<strong>' . esc_html__( 'No', 'sidcraft-page-builder' ) . '</strong>' ) . '</td>';
			echo '<td><a class="button-link-delete" href="' . esc_url( $delete ) . '">' . esc_html__( 'Delete', 'sidcraft-page-builder' ) . '</a></td>';
			echo '</tr>';
		}
		echo '</tbody></table>';
		$pages = (int) $query->max_num_pages;
		if ( $pages > 1 ) {
			echo '<div class="tablenav"><div class="tablenav-pages">';
			echo wp_kses_post(
				(string) paginate_links(
					array(
						'base'    => add_query_arg( 'paged', '%#%' ),
						'format'  => '',
						'current' => $paged,
						'total'   => $pages,
					)
				)
			);
			echo '</div></div>';
		}
		echo '</div>';
	}

	/* ------------------------------------------------------------------ *
	 * Privacy
	 * ------------------------------------------------------------------ */

	/**
	 * @return void
	 */
	public static function privacy_text() {
		if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
			return;
		}
		wp_add_privacy_policy_content(
			__( 'Sidcraft Page Builder', 'sidcraft-page-builder' ),
			'<p>' . esc_html__( 'When a visitor submits a form built with Sidcraft Page Builder, the values they enter are emailed to the site owner and a copy is kept on this site so it is not lost if the email fails. Only the newest entries of each form are kept. IP addresses are not stored.', 'sidcraft-page-builder' ) . '</p>'
		);
	}

	/**
	 * @param array $exporters
	 * @return array
	 */
	public static function register_exporter( $exporters ) {
		$exporters['sidcraft-page-builder-entries'] = array(
			'exporter_friendly_name' => __( 'Sidcraft Page Builder form entries', 'sidcraft-page-builder' ),
			'callback'               => array( self::class, 'export' ),
		);
		return $exporters;
	}

	/**
	 * @param array $erasers
	 * @return array
	 */
	public static function register_eraser( $erasers ) {
		$erasers['sidcraft-page-builder-entries'] = array(
			'eraser_friendly_name' => __( 'Sidcraft Page Builder form entries', 'sidcraft-page-builder' ),
			'callback'             => array( self::class, 'erase' ),
		);
		return $erasers;
	}

	/**
	 * @param string $email
	 * @param int    $page
	 * @return int[]
	 */
	private static function ids_for_email( $email, $page ) {
		return get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'post_status'    => 'private',
				'posts_per_page' => 50,
				'paged'          => max( 1, (int) $page ),
				'fields'         => 'ids',
				'meta_key'       => self::META_EMAIL, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- Privacy request lookup.
				'meta_value'     => strtolower( (string) $email ), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- Privacy request lookup.
			)
		);
	}

	/**
	 * @param string $email
	 * @param int    $page
	 * @return array
	 */
	public static function export( $email, $page = 1 ) {
		$items = array();
		$ids   = self::ids_for_email( $email, $page );
		foreach ( $ids as $id ) {
			$data = array();
			foreach ( self::fields( $id ) as $key => $value ) {
				$data[] = array(
					'name'  => (string) $key,
					'value' => (string) $value,
				);
			}
			$items[] = array(
				'group_id'    => 'sidcraft-page-builder-entries',
				'group_label' => __( 'Form entries', 'sidcraft-page-builder' ),
				'item_id'     => 'sidsyn-entry-' . $id,
				'data'        => $data,
			);
		}
		return array(
			'data' => $items,
			'done' => count( $ids ) < 50,
		);
	}

	/**
	 * @param string $email
	 * @param int    $page
	 * @return array
	 */
	public static function erase( $email, $page = 1 ) {
		unset( $page );
		$ids = self::ids_for_email( $email, 1 );
		foreach ( $ids as $id ) {
			wp_delete_post( (int) $id, true );
		}
		return array(
			'items_removed'  => count( $ids ),
			'items_retained' => false,
			'messages'       => array(),
			'done'           => count( $ids ) < 50,
		);
	}

	/**
	 * Remove all entries and the setting (uninstall).
	 *
	 * @return void
	 */
	public static function uninstall() {
		global $wpdb;
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_type = %s", self::POST_TYPE ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Uninstall cleanup.
		foreach ( (array) $ids as $id ) {
			wp_delete_post( (int) $id, true );
		}
		delete_option( self::OPTION_KEEP );
	}
}
