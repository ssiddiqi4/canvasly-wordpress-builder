<?php
namespace SidcraftPageBuilder\Convert;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Bulk convert tool: Tools screen, dry-run report, REST endpoints.
 */
class Tool {
	const NOTICE = 'sidcraft_page_builder_convert_notice';
	const REPORT = 'sidcraft_page_builder_convert_report';

	public static function init() {
		add_action( 'sidcraft-page-builder/rest/register_routes', array( self::class, 'routes' ) );
		if ( ! function_exists( 'is_admin' ) || is_admin() ) {
			add_action( 'sidcraft-page-builder/tools/screen', array( self::class, 'screen' ) );
			add_action( 'admin_post_sidsyn_convert', array( self::class, 'handle' ) );
			add_action( 'admin_notices', array( self::class, 'admin_notice' ) );
		}
	}

	public static function can_manage() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Small inline badge marking a candidate as Elementor-sourced (or raw
	 * third-party data without a recognizable Elementor signature).
	 *
	 * @param string $size 'sm' for inline row badges, 'lg' for the heading icon.
	 * @param bool   $is_elementor
	 * @return string Escaped HTML.
	 */
	public static function elementor_badge( $size = 'sm', $is_elementor = true ) {
		$lg      = ( $size === 'lg' );
		$label   = $is_elementor
			? __( 'Elementor', 'sidcraft-page-builder' )
			: __( 'Raw data', 'sidcraft-page-builder' );
		$bg      = $is_elementor ? '#92003b' : '#6b7280';
		$letter  = $is_elementor ? 'E' : '{ }';
		$dim     = $lg ? '26px' : '18px';
		$font    = $lg ? '13px' : '10px';
		$style   = sprintf(
			'display:inline-flex;align-items:center;justify-content:center;width:%1$s;height:%1$s;border-radius:50%%;background:%2$s;color:#fff;font-weight:700;font-size:%3$s;line-height:1;flex:none;',
			$dim,
			$bg,
			$font
		);
		return '<span class="sidcraft-page-builder-elementor-badge" style="' . esc_attr( $style ) . '" title="' . esc_attr( $label ) . '" aria-hidden="true">' . esc_html( $letter ) . '</span>&nbsp;';
	}

	/**
	 * Tags and attributes the source badge markup may contain when printed.
	 *
	 * @return array<string,array<string,bool>>
	 */
	private static function badge_allowed_html() {
		return array(
			'span' => array(
				'class'       => true,
				'style'       => true,
				'title'       => true,
				'aria-hidden' => true,
			),
		);
	}

	/**
	 * Duplicate a post so the Elementor->Sidcraft Page Builder conversion can be written
	 * to a brand-new draft rather than in place. Copies core post fields
	 * plus every `_elementor_*` meta key (so the converter finds the same
	 * source data on the copy) and `_wp_page_template`. Never touches the
	 * original post or its meta.
	 *
	 * @param int $post_id
	 * @return int New post ID, or 0 on failure.
	 */
	private static function duplicate_as_copy( $post_id ) {
		$post_id = absint( $post_id );
		$src     = $post_id ? get_post( $post_id ) : null;
		if ( ! $src ) {
			return 0;
		}
		$title  = ( $src->post_title !== '' ? $src->post_title : __( '(no title)', 'sidcraft-page-builder' ) );
		$title .= ' - ' . __( 'Sidcraft Page Builder', 'sidcraft-page-builder' );
		$status = sanitize_key( (string) ( $src->post_status ?? '' ) );
		if ( ! in_array( $status, array( 'publish', 'private', 'pending', 'future', 'draft' ), true ) ) {
			$status = 'draft';
		}
		$insert = array(
			'post_type'      => $src->post_type,
			// Keep the source status. A published Elementor page stays
			// published on the copy; drafts stay drafts.
			'post_status'    => $status,
			'post_title'     => $title,
			'post_content'   => $src->post_content,
			'post_excerpt'   => $src->post_excerpt,
			'post_author'    => $src->post_author,
			'post_parent'    => $src->post_parent,
			'menu_order'     => $src->menu_order,
			'comment_status' => $src->comment_status,
			'ping_status'    => $src->ping_status,
		);
		if ( 'future' === $status ) {
			$insert['post_date']     = $src->post_date ?? '';
			$insert['post_date_gmt'] = $src->post_date_gmt ?? ( $src->post_date ?? '' );
		}
		$new_id = wp_insert_post( $insert, true );
		if ( is_wp_error( $new_id ) || ! $new_id ) {
			return 0;
		}
		foreach ( get_post_meta( $post_id ) as $key => $values ) {
			if ( strpos( (string) $key, '_elementor_' ) !== 0 ) {
				continue;
			}
			// Some plugins (Elementor itself included, if still active
			// during migration) write their own default meta the instant
			// wp_insert_post() creates the new draft. add_post_meta()
			// would stack our copied value as a second row behind that
			// default instead of replacing it, and a later single-value
			// read (get_post_meta(..., true)) would silently return the
			// stale default rather than the real copied data. Clear first
			// so the copy ends up with exactly the source's values.
			delete_post_meta( $new_id, $key );
			foreach ( (array) $values as $v ) {
				add_post_meta( $new_id, $key, maybe_unserialize( $v ) );
			}
		}
		$tpl = get_post_meta( $post_id, '_wp_page_template', true );
		if ( $tpl !== '' ) {
			update_post_meta( $new_id, '_wp_page_template', $tpl );
		}
		return (int) $new_id;
	}

	/**
	 * @param string $namespace
	 */
	public static function routes( $namespace ) {
		$ns = $namespace !== '' ? $namespace : 'sidcraft-page-builder/v1';
		register_rest_route(
			$ns,
			'/convert/candidates',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'rest_candidates' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);
		register_rest_route(
			$ns,
			'/convert/preview',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'rest_preview' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);
		register_rest_route(
			$ns,
			'/convert/run',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'rest_run' ),
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);
	}

	public static function rest_candidates() {
		return rest_ensure_response(
			array(
				'candidates' => Converter::candidates(),
				'widgets'    => array_keys( Map::widgets() ),
			)
		);
	}

	/**
	 * @param \WP_REST_Request $req
	 */
	public static function rest_preview( $req ) {
		return rest_ensure_response( self::run_from_request( $req, true ) );
	}

	/**
	 * @param \WP_REST_Request $req
	 */
	public static function rest_run( $req ) {
		return rest_ensure_response( self::run_from_request( $req, false ) );
	}

	/**
	 * @param \WP_REST_Request $req
	 * @param bool             $dry
	 * @return array|\WP_Error
	 */
	private static function run_from_request( $req, $dry ) {
		$d     = is_object( $req ) && method_exists( $req, 'get_json_params' ) ? (array) $req->get_json_params() : array();
		$ids   = self::ids_from( $d['ids'] ?? array() );
		$force = ! empty( $d['force'] );
		if ( ! $ids ) {
			foreach ( Converter::candidates() as $row ) {
				$ids[] = absint( $row['id'] ?? 0 );
			}
			$ids = array_values( array_filter( $ids ) );
		}
		$conv = new Converter();
		return $conv->convert_posts( $ids, array( 'dry_run' => $dry, 'force' => $force ) );
	}

	public static function handle() {
		if ( ! self::can_manage() ) {
			wp_die( esc_html__( 'Only administrators can convert layout data.', 'sidcraft-page-builder' ) );
		}
		check_admin_referer( 'sidsyn_convert' );
		$dry       = ( sanitize_key( wp_unslash( $_POST['mode'] ?? 'preview' ) ) !== 'run' );
		$ids       = self::ids_from( isset( $_POST['ids'] ) ? array_map( 'absint', (array) wp_unslash( $_POST['ids'] ) ) : array() );
		$force     = ! empty( $_POST['force'] );
		$save_copy = ! empty( $_POST['save_as_copy'] );
		if ( ! empty( $_POST['all'] ) && ! $ids ) {
			foreach ( Converter::candidates() as $row ) {
				$ids[] = absint( $row['id'] ?? 0 );
			}
			$ids = array_values( array_filter( $ids ) );
		}
		// Duplicating is itself a write, so it only ever happens on a real
		// commit - a dry run must stay side-effect free and always previews
		// against the original page.
		$copy_failed = 0;
		if ( $save_copy && ! $dry ) {
			$copy_ids = array();
			foreach ( $ids as $id ) {
				$new_id = self::duplicate_as_copy( $id );
				if ( $new_id ) {
					$copy_ids[] = $new_id;
				} else {
					++$copy_failed;
				}
			}
			$ids = $copy_ids;
		}
		$conv   = new Converter();
		$report = $conv->convert_posts( $ids, array( 'dry_run' => $dry, 'force' => $force ) );
		if ( $copy_failed ) {
			$report['copy_failed'] = $copy_failed;
		}
		$ttl    = defined( 'MINUTE_IN_SECONDS' ) ? 10 * MINUTE_IN_SECONDS : 600;
		set_transient( self::REPORT . '_' . get_current_user_id(), $report, $ttl );
		$count = (int) ( $report['converted'] ?? 0 );
		if ( $dry ) {
			self::store_notice(
				'success',
				sprintf(
					/* translators: %d: number of posts in the dry-run */
					_n( 'Dry run finished for %d item.', 'Dry run finished for %d items.', $count, 'sidcraft-page-builder' ),
					$count
				)
			);
		} else {
			$message = sprintf(
				/* translators: %d: number of converted posts */
				_n( 'Converted %d item.', 'Converted %d items.', $count, 'sidcraft-page-builder' ),
				$count
			);
			if ( $save_copy ) {
				$message .= ' ' . __( 'Saved as new copies with the original status (original pages left untouched).', 'sidcraft-page-builder' );
			}
			if ( $copy_failed ) {
				$message .= ' ' . sprintf(
					/* translators: %d: number of posts that could not be duplicated */
					_n( '%d item could not be duplicated and was skipped.', '%d items could not be duplicated and were skipped.', $copy_failed, 'sidcraft-page-builder' ),
					$copy_failed
				);
			}
			self::store_notice( empty( $report['errors'] ) && ! $copy_failed ? 'success' : 'error', $message );
		}
		wp_safe_redirect( self::tools_url() );
		exit;
	}

	/**
	 * @param mixed $raw
	 * @return int[]
	 */
	public static function ids_from( $raw ) {
		$ids = array();
		foreach ( (array) $raw as $id ) {
			$id = absint( $id );
			if ( $id ) {
				$ids[] = $id;
			}
		}
		return array_values( array_unique( $ids ) );
	}

	public static function tools_url() {
		if ( class_exists( '\\SidcraftPageBuilder\\Settings\\AdminSettings' ) ) {
			return \SidcraftPageBuilder\Settings\AdminSettings::tools_or_settings_url();
		}
		return admin_url( 'admin.php?page=sidcraft-page-builder-tools' );
	}

	private static function store_notice( $type, $message ) {
		set_transient(
			self::NOTICE . '_' . get_current_user_id(),
			array(
				'type'    => $type === 'success' ? 'success' : 'error',
				'message' => $message,
			),
			120
		);
	}

	public static function admin_notice() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ( $screen->id ?? '' ) !== 'sidcraft-page-builder_page_sidcraft-page-builder-tools' ) {
			return;
		}
		$n = get_transient( self::NOTICE . '_' . get_current_user_id() );
		if ( ! is_array( $n ) ) {
			return;
		}
		delete_transient( self::NOTICE . '_' . get_current_user_id() );
		$class = ( $n['type'] ?? '' ) === 'success' ? 'notice-success' : 'notice-error';
		echo '<div class="notice ' . esc_attr( $class ) . ' is-dismissible"><p>' . esc_html( (string) ( $n['message'] ?? '' ) ) . '</p></div>';
	}

	public static function screen() {
		if ( ! self::can_manage() ) {
			return;
		}
		$candidates = Converter::candidates();
		$report     = get_transient( self::REPORT . '_' . get_current_user_id() );
		if ( ! is_array( $report ) ) {
			$report = null;
		}

		echo '<div id="sidcraft-page-builder-import-elementor" class="card" style="max-width:none;margin-top:24px;padding:16px 20px;">';
		echo '<h2 style="display:flex;align-items:center;gap:8px;">' . wp_kses( self::elementor_badge( 'lg' ), self::badge_allowed_html() ) . esc_html__( 'Import Elementor Pages / Convert Raw Data', 'sidcraft-page-builder' ) . '</h2>';
		echo '<p class="description">' . esc_html__( 'Reads stored Elementor page/section/widget JSON (and other raw third-party builder data), maps sections and columns to containers, and produces native Sidcraft Page Builder documents. Run a dry run first to see what will map cleanly and what won\'t, then commit when you\'re ready. Source Elementor data is never modified or deleted.', 'sidcraft-page-builder' ) . '</p>';

		if ( ! $candidates ) {
			echo '<p>' . esc_html__( 'No Elementor or raw-data pages were found to import.', 'sidcraft-page-builder' ) . '</p>';
			if ( $report ) {
				self::render_report( $report );
			}
			echo '</div>';
			return;
		}

		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		wp_nonce_field( 'sidsyn_convert' );
		echo '<input type="hidden" name="action" value="sidsyn_convert">';
		echo '<table class="form-table"><tbody>';
		echo '<tr><th>' . esc_html__( 'Posts', 'sidcraft-page-builder' ) . '</th><td>';
		echo '<fieldset style="max-height:260px;overflow:auto;border:1px solid #dcdcde;padding:8px 12px;max-width:640px">';
		foreach ( $candidates as $p ) {
			$label        = ( $p['title'] ?? '' ) !== '' ? $p['title'] : '#' . (int) ( $p['id'] ?? 0 );
			$meta         = (string) ( $p['type'] ?? 'post' );
			// Every row here was found via the Elementor source meta key
			// (Converter::SOURCE_META), so the badge is always "Elementor";
			// library items (headers/footers/saved templates) get a more
			// specific label rather than a different badge colour.
			$is_elementor = true;
			if ( $meta === Converter::SOURCE_LIBRARY_TYPE ) {
				$meta = __( 'Elementor template', 'sidcraft-page-builder' );
			}
			if ( ! empty( $p['has_loom'] ) ) {
				$meta .= " \u{B7} " . __( 'already has a Sidcraft Page Builder document', 'sidcraft-page-builder' );
			}
			echo '<label style="display:flex;align-items:center;gap:6px;margin:4px 0;">';
			echo '<input type="checkbox" name="ids[]" value="' . esc_attr( (string) ( $p['id'] ?? 0 ) ) . '"> ';
			echo wp_kses( self::elementor_badge( 'sm', $is_elementor ), self::badge_allowed_html() );
			echo esc_html( $label . ' (' . $meta . ')' );
			echo '</label>';
		}
		echo '</fieldset>';
		echo '<p class="description">' . esc_html__( 'Library items are saved as Sidcraft Page Builder templates. Pages and posts that already have a Sidcraft Page Builder document are skipped unless you force overwrite.', 'sidcraft-page-builder' ) . '</p>';
		echo '</td></tr>';
		echo '<tr><th>' . esc_html__( 'Options', 'sidcraft-page-builder' ) . '</th><td>';
		echo '<label style="display:block;"><input type="checkbox" name="force" value="1"> ' . esc_html__( 'Overwrite existing Sidcraft Page Builder documents', 'sidcraft-page-builder' ) . '</label>';
		echo '<label style="display:block;margin-top:6px;"><input type="checkbox" name="save_as_copy" value="1"> ' . esc_html__( 'Save as a new copy instead of converting in place (title gets " - Sidcraft Page Builder" appended; original page and its Elementor data are left completely untouched)', 'sidcraft-page-builder' ) . '</label>';
		echo '<p class="description" style="margin-top:4px;">' . esc_html__( "The copy keeps the original page status (a published page stays published). This option only applies to Commit \u{2014} a Dry Run always previews against the original page, since previews never write anything.", 'sidcraft-page-builder' ) . '</p>';
		echo '</td></tr></tbody></table>';
		echo '<p>';
		echo '<button class="button" type="submit" name="mode" value="preview">' . esc_html__( 'Dry Run', 'sidcraft-page-builder' ) . '</button> ';
		echo '<button class="button button-primary" type="submit" name="mode" value="run" onclick="return confirm(' . "'" . esc_js( __( 'Commit this import? Elementor source data is kept, so this is safe to re-run, but existing Sidcraft Page Builder documents on selected pages will be overwritten if you checked Overwrite.', 'sidcraft-page-builder' ) ) . "'" . ');">' . esc_html__( 'Commit', 'sidcraft-page-builder' ) . '</button>';
		echo '</p>';
		echo '</form>';

		if ( $report ) {
			self::render_report( $report );
		}
		echo '</div>';
	}

	/**
	 * @param array $report
	 */
	public static function render_report( array $report ) {
		$dry = ! empty( $report['dry_run'] );
		echo '<h3>' . esc_html( $dry ? __( 'Dry-run report', 'sidcraft-page-builder' ) : __( 'Conversion report', 'sidcraft-page-builder' ) ) . '</h3>';
		echo '<p>';
		echo esc_html(
			sprintf(
				/* translators: 1: posts, 2: mapped widgets, 3: unmapped widget types, 4: global binds */
				__( 'Posts: %1$d. Mapped widgets: %2$d. Unmapped types: %3$d. Global color binds: %4$d.', 'sidcraft-page-builder' ),
				(int) ( $report['posts'] ?? 0 ),
				(int) ( $report['mapped'] ?? 0 ),
				count( (array) ( $report['unmapped'] ?? array() ) ),
				(int) ( $report['globals'] ?? 0 )
			)
		);
		if ( ! empty( $report['skipped'] ) ) {
			echo ' ' . esc_html(
				sprintf(
					/* translators: %d: skipped count */
					__( 'Skipped: %d.', 'sidcraft-page-builder' ),
					(int) $report['skipped']
				)
			);
		}
		if ( ! empty( $report['errors'] ) ) {
			echo ' ' . esc_html(
				sprintf(
					/* translators: %d: error count */
					__( 'Errors: %d.', 'sidcraft-page-builder' ),
					(int) $report['errors']
				)
			);
		}
		echo '</p>';
		$warnings = array_values( array_filter( (array) ( $report['warnings'] ?? array() ) ) );
		if ( $warnings ) {
			echo '<ul style="max-width:720px">';
			foreach ( $warnings as $warning ) {
				echo '<li>' . esc_html( (string) $warning ) . '</li>';
			}
			echo '</ul>';
		}

		$unmapped = (array) ( $report['unmapped'] ?? array() );
		if ( $unmapped ) {
			arsort( $unmapped );
			echo '<h4>' . esc_html__( 'Unmapped widgets', 'sidcraft-page-builder' ) . '</h4>';
			echo '<table class="widefat striped" style="max-width:480px"><thead><tr><th>' . esc_html__( 'Source type', 'sidcraft-page-builder' ) . '</th><th>' . esc_html__( 'Count', 'sidcraft-page-builder' ) . '</th></tr></thead><tbody>';
			foreach ( $unmapped as $type => $n ) {
				echo '<tr><td><code>' . esc_html( (string) $type ) . '</code></td><td>' . esc_html( (string) (int) $n ) . '</td></tr>';
			}
			echo '</tbody></table>';
		}

		$items = (array) ( $report['items'] ?? array() );
		if ( $items ) {
			echo '<h4>' . esc_html__( 'Items', 'sidcraft-page-builder' ) . '</h4>';
			echo '<table class="widefat striped"><thead><tr>';
			echo '<th>' . esc_html__( 'ID', 'sidcraft-page-builder' ) . '</th>';
			echo '<th>' . esc_html__( 'Title', 'sidcraft-page-builder' ) . '</th>';
			echo '<th>' . esc_html__( 'Status', 'sidcraft-page-builder' ) . '</th>';
			echo '<th>' . esc_html__( 'Mapped', 'sidcraft-page-builder' ) . '</th>';
			echo '<th>' . esc_html__( 'Unmapped', 'sidcraft-page-builder' ) . '</th>';
			echo '<th>' . esc_html__( 'Note', 'sidcraft-page-builder' ) . '</th>';
			echo '</tr></thead><tbody>';
			foreach ( $items as $row ) {
				$un = (array) ( $row['unmapped'] ?? array() );
				$ul = array();
				foreach ( $un as $t => $n ) {
					$ul[] = $t . "\u{D7}" . (int) $n;
				}
				echo '<tr>';
				echo '<td>' . esc_html( (string) (int) ( $row['id'] ?? 0 ) ) . '</td>';
				echo '<td>' . esc_html( (string) ( $row['title'] ?? '' ) ) . '</td>';
				echo '<td>' . esc_html( (string) ( $row['status'] ?? '' ) ) . '</td>';
				echo '<td>' . esc_html( (string) (int) ( $row['mapped'] ?? 0 ) ) . '</td>';
				echo '<td>' . esc_html( $ul ? implode( ', ', $ul ) : "\u{2014}" ) . '</td>';
				$note = (string) ( $row['error'] ?? '' );
				if ( $note === '' ) {
					$note = (string) ( $row['reason'] ?? '' );
				}
				if ( $note === '' ) {
					$note = (string) ( $row['note'] ?? '' );
				}
				echo '<td>' . esc_html( $note ) . '</td>';
				echo '</tr>';
			}
			echo '</tbody></table>';
		}
	}
}
