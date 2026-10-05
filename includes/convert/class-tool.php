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
		add_action( 'sidcraft_page_builder_rest_register_routes', array( self::class, 'routes' ) );
		if ( ! function_exists( 'is_admin' ) || is_admin() ) {
			add_action( 'sidcraft_page_builder_tools_screen', array( self::class, 'screen' ) );
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
	public static function duplicate_as_copy( $post_id ) {
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

	/**
	 * Form fallback (no JavaScript): start a job and run one batch, or run
	 * the next batch of the current job. The Tools screen shows progress and
	 * a Continue button until the job is done.
	 */
	public static function handle() {
		if ( ! self::can_manage() ) {
			wp_die( esc_html__( 'Only administrators can convert layout data.', 'sidcraft-page-builder' ) );
		}
		check_admin_referer( 'sidsyn_convert' );
		$mode = sanitize_key( wp_unslash( $_POST['mode'] ?? 'stage' ) );
		// Older forms posted preview/run.
		if ( $mode === 'preview' ) {
			$mode = 'dry';
		} elseif ( $mode === 'run' ) {
			$mode = ! empty( $_POST['save_as_copy'] ) ? 'copy' : 'in_place';
		}
		if ( $mode === 'continue' ) {
			$job = Job::step();
		} else {
			$ids = self::ids_from( isset( $_POST['ids'] ) ? array_map( 'absint', (array) wp_unslash( $_POST['ids'] ) ) : array() );
			if ( ! $ids && empty( $_POST['all'] ) ) {
				self::store_notice( 'error', __( 'Select at least one page, or choose All pages.', 'sidcraft-page-builder' ) );
				wp_safe_redirect( self::tools_url() );
				exit;
			}
			$job = Job::start(
				array(
					'ids'          => $ids,
					'mode'         => $mode,
					'force'        => ! empty( $_POST['force'] ),
					'stage_target' => sanitize_key( wp_unslash( $_POST['stage_target'] ?? 'in_place' ) ),
					'batch'        => absint( wp_unslash( $_POST['batch'] ?? 5 ) ),
					'replace'      => true,
				)
			);
			if ( ! is_wp_error( $job ) ) {
				$job = Job::step();
			}
		}
		if ( is_wp_error( $job ) ) {
			self::store_notice( 'error', $job->get_error_message() );
		}
		wp_safe_redirect( self::tools_url() . '#sidcraft-page-builder-import-elementor' );
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
		$total      = count( Converter::candidate_ids() );
		$job        = Job::get();

		echo '<div id="sidcraft-page-builder-import-elementor" class="card" style="max-width:none;margin-top:24px;padding:16px 20px;">';
		echo '<h2 style="display:flex;align-items:center;gap:8px;">' . wp_kses( self::elementor_badge( 'lg' ), self::badge_allowed_html() ) . esc_html__( 'Import Elementor Pages / Convert Raw Data', 'sidcraft-page-builder' ) . '</h2>';
		echo '<p class="description">' . esc_html__( 'Converts stored Elementor layouts into Sidcraft Page Builder documents in small batches. Source Elementor data is never modified or deleted. By default each result waits in Review Conversions, where you compare it side by side with the current page and accept it only when it looks right.', 'sidcraft-page-builder' ) . '</p>';

		self::render_job_panel( $job );

		if ( ! $candidates ) {
			echo '<p>' . esc_html__( 'No Elementor or raw-data pages were found to import.', 'sidcraft-page-builder' ) . '</p>';
			echo '</div>';
			return;
		}

		echo '<form method="post" id="sidsyn-convert-form" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		wp_nonce_field( 'sidsyn_convert' );
		echo '<input type="hidden" name="action" value="sidsyn_convert">';
		echo '<table class="form-table"><tbody>';
		echo '<tr><th>' . esc_html__( 'Pages', 'sidcraft-page-builder' ) . '</th><td>';
		echo '<label style="display:block;margin-bottom:6px;"><input type="checkbox" name="all" value="1" id="sidsyn-convert-all"> <strong>' . esc_html(
			sprintf(
				/* translators: %d: number of pages */
				_n( 'All %d page with Elementor data', 'All %d pages with Elementor data', $total, 'sidcraft-page-builder' ),
				$total
			)
		) . '</strong></label>';
		echo '<fieldset id="sidsyn-convert-list" style="max-height:260px;overflow:auto;border:1px solid #dcdcde;padding:8px 12px;max-width:640px">';
		foreach ( $candidates as $p ) {
			$label = ( $p['title'] ?? '' ) !== '' ? $p['title'] : '#' . (int) ( $p['id'] ?? 0 );
			$meta  = (string) ( $p['type'] ?? 'post' );
			if ( $meta === Converter::SOURCE_LIBRARY_TYPE ) {
				$meta = __( 'Elementor template', 'sidcraft-page-builder' );
			}
			if ( ! empty( $p['has_loom'] ) ) {
				$meta .= " \u{B7} " . __( 'already has a Sidcraft Page Builder document', 'sidcraft-page-builder' );
			}
			if ( class_exists( Review::class ) && Review::staged( (int) ( $p['id'] ?? 0 ) ) ) {
				$meta .= " \u{B7} " . __( 'waiting for review', 'sidcraft-page-builder' );
			}
			echo '<label style="display:flex;align-items:center;gap:6px;margin:4px 0;">';
			echo '<input type="checkbox" name="ids[]" value="' . esc_attr( (string) ( $p['id'] ?? 0 ) ) . '"> ';
			echo wp_kses( self::elementor_badge( 'sm', true ), self::badge_allowed_html() );
			echo esc_html( $label . ' (' . $meta . ')' );
			echo '</label>';
		}
		echo '</fieldset>';
		if ( $total > count( $candidates ) ) {
			echo '<p class="description">' . esc_html(
				sprintf(
					/* translators: 1: listed, 2: total */
					__( 'Showing the %1$d most recently edited of %2$d pages. Choose All pages to convert every one.', 'sidcraft-page-builder' ),
					count( $candidates ),
					$total
				)
			) . '</p>';
		}
		echo '</td></tr>';

		echo '<tr><th>' . esc_html__( 'What to do', 'sidcraft-page-builder' ) . '</th><td><fieldset>';
		$modes = array(
			'stage'    => array( __( 'Convert for review (recommended)', 'sidcraft-page-builder' ), __( 'Nothing on the site changes. Each result waits in Review Conversions for you to compare and accept.', 'sidcraft-page-builder' ) ),
			'dry'      => array( __( 'Dry run', 'sidcraft-page-builder' ), __( 'Report only: what maps, what does not, and any errors. Nothing is saved.', 'sidcraft-page-builder' ) ),
			'copy'     => array( __( 'Convert into new copies now', 'sidcraft-page-builder' ), __( 'Each page gets a converted copy with the same status. Originals are not touched.', 'sidcraft-page-builder' ) ),
			'in_place' => array( __( 'Replace pages now (no review)', 'sidcraft-page-builder' ), __( 'Pages switch to the converted layout immediately. Each can be reverted from Review Conversions.', 'sidcraft-page-builder' ) ),
		);
		foreach ( $modes as $key => $m ) {
			echo '<label style="display:block;margin-bottom:6px;"><input type="radio" name="mode" value="' . esc_attr( $key ) . '"' . ( $key === 'stage' ? ' checked' : '' ) . '> <strong>' . esc_html( $m[0] ) . '</strong> <span class="description">' . esc_html( $m[1] ) . '</span></label>';
		}
		echo '</fieldset></td></tr>';

		echo '<tr><th>' . esc_html__( 'Options', 'sidcraft-page-builder' ) . '</th><td>';
		echo '<label style="display:block;"><input type="checkbox" name="force" value="1"> ' . esc_html__( 'Overwrite existing Sidcraft Page Builder documents (Replace pages now only)', 'sidcraft-page-builder' ) . '</label>';
		echo '<label style="display:block;margin-top:6px;">' . esc_html__( 'Pages per batch', 'sidcraft-page-builder' ) . ' <input type="number" name="batch" value="5" min="1" max="50" style="width:70px"></label>';
		echo '<p class="description">' . esc_html__( 'Each batch also stops early when it nears the PHP time or memory limit. Progress is saved after every page, so you can close this screen and resume later.', 'sidcraft-page-builder' ) . '</p>';
		echo '</td></tr></tbody></table>';
		echo '<p><button class="button button-primary" type="submit" id="sidsyn-convert-start">' . esc_html__( 'Start', 'sidcraft-page-builder' ) . '</button></p>';
		echo '</form>';
		echo '</div>';
		self::print_runner_script();
	}

	/**
	 * Progress, failures and controls for the current job.
	 *
	 * @param array|null $job
	 */
	public static function render_job_panel( $job ) {
		echo '<div id="sidsyn-convert-job" style="margin:12px 0 16px">';
		if ( ! $job ) {
			echo '</div>';
			return;
		}
		$view   = Job::public_view( $job );
		$labels = array(
			'dry'      => __( 'Dry run', 'sidcraft-page-builder' ),
			'stage'    => __( 'Convert for review', 'sidcraft-page-builder' ),
			'copy'     => __( 'Convert into copies', 'sidcraft-page-builder' ),
			'in_place' => __( 'Replace pages', 'sidcraft-page-builder' ),
		);
		$status = array(
			'running'   => __( 'In progress', 'sidcraft-page-builder' ),
			'paused'    => __( 'Paused', 'sidcraft-page-builder' ),
			'done'      => __( 'Finished', 'sidcraft-page-builder' ),
			'cancelled' => __( 'Cancelled', 'sidcraft-page-builder' ),
		);
		$c = $view['counts'];
		echo '<div style="background:#f6f7f7;border:1px solid #dcdcde;border-radius:4px;padding:12px 16px">';
		echo '<p style="margin:0 0 8px"><strong>' . esc_html( ( $labels[ $view['mode'] ] ?? $view['mode'] ) . ': ' . ( $status[ $view['status'] ] ?? $view['status'] ) ) . '</strong> &middot; ';
		echo esc_html(
			sprintf(
				/* translators: 1: done, 2: total */
				__( '%1$d of %2$d pages', 'sidcraft-page-builder' ),
				(int) $view['cursor'],
				(int) $view['total']
			)
		) . '</p>';
		echo '<div style="height:10px;background:#dcdcde;border-radius:5px;overflow:hidden;max-width:640px"><div style="height:100%;width:' . (int) $view['percent'] . '%;background:#2271b1"></div></div>';
		echo '<p style="margin:8px 0 0">' . esc_html(
			sprintf(
				/* translators: 1: converted, 2: staged, 3: skipped, 4: errors, 5: dynamic fields */
				__( 'Converted: %1$d · Waiting for review: %2$d · Skipped: %3$d · Failed: %4$d · Dynamic fields to re-link: %5$d', 'sidcraft-page-builder' ),
				(int) $c['converted'],
				(int) $c['staged'],
				(int) $c['skipped'],
				(int) $c['errors'],
				(int) $c['dynamic']
			)
		) . '</p>';
		if ( in_array( $view['status'], array( 'running', 'paused' ), true ) ) {
			echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" style="margin-top:8px">';
			wp_nonce_field( 'sidsyn_convert' );
			echo '<input type="hidden" name="action" value="sidsyn_convert"><input type="hidden" name="mode" value="continue">';
			echo '<button class="button button-primary" type="submit" data-sidsyn-job="resume">' . esc_html__( 'Resume', 'sidcraft-page-builder' ) . '</button> ';
			echo '<button class="button" type="button" data-sidsyn-job="pause" hidden>' . esc_html__( 'Pause', 'sidcraft-page-builder' ) . '</button> ';
			echo '<button class="button-link button-link-delete" type="button" data-sidsyn-job="cancel">' . esc_html__( 'Cancel job', 'sidcraft-page-builder' ) . '</button>';
			echo '</form>';
		}
		if ( $view['mode'] === 'stage' && (int) $c['staged'] > 0 && class_exists( Review::class ) ) {
			echo '<p><a class="button" href="' . esc_url( Review::url() ) . '">' . esc_html__( 'Open Review Conversions', 'sidcraft-page-builder' ) . '</a></p>';
		}
		if ( ! empty( $view['failures'] ) ) {
			echo '<h4 style="margin:14px 0 6px">' . esc_html__( 'Failed pages', 'sidcraft-page-builder' ) . '</h4>';
			echo '<p class="description">' . esc_html__( 'These pages were left exactly as they were. Location shows the source element where conversion stopped.', 'sidcraft-page-builder' ) . '</p>';
			echo '<table class="widefat striped"><thead><tr><th>' . esc_html__( 'Page', 'sidcraft-page-builder' ) . '</th><th>' . esc_html__( 'Stopped at', 'sidcraft-page-builder' ) . '</th><th>' . esc_html__( 'Element ID', 'sidcraft-page-builder' ) . '</th><th>' . esc_html__( 'Error', 'sidcraft-page-builder' ) . '</th></tr></thead><tbody>';
			foreach ( array_slice( array_reverse( (array) $view['failures'] ), 0, 100 ) as $f ) {
				echo '<tr><td>' . esc_html( ( $f['title'] !== '' ? $f['title'] : '#' . (int) $f['post'] ) . ' (#' . (int) $f['post'] . ')' ) . '</td>';
				echo '<td>' . esc_html( $f['path'] !== '' ? $f['path'] : "\u{2014}" ) . '</td>';
				echo '<td><code>' . esc_html( $f['node'] !== '' ? $f['node'] : "\u{2014}" ) . '</code></td>';
				echo '<td>' . esc_html( $f['message'] ) . '</td></tr>';
			}
			echo '</tbody></table>';
		}
		if ( in_array( $view['status'], array( 'done', 'cancelled' ), true ) ) {
			self::render_report( Job::as_report( $job ) );
		}
		echo '</div></div>';
	}

	/**
	 * Drive the job from the browser: start, step until done, pause, cancel.
	 */
	private static function print_runner_script() {
		$cfg = array(
			'root'  => esc_url_raw( rest_url( 'sidcraft-page-builder/v1/convert/job' ) ),
			'nonce' => wp_create_nonce( 'wp_rest' ),
			'i18n'  => array(
				'select'  => __( 'Select at least one page, or choose All pages.', 'sidcraft-page-builder' ),
				'confirm' => __( 'Replace the selected pages now, without review? Each one can be reverted later from Review Conversions.', 'sidcraft-page-builder' ),
				'cancel'  => __( 'Cancel this conversion job? Pages already converted stay converted.', 'sidcraft-page-builder' ),
				'error'   => __( 'The batch request failed. Progress is saved; click Resume to try again.', 'sidcraft-page-builder' ),
			),
		);
		wp_register_script( 'sidcraft-page-builder-convert-tools', false, array(), SIDCRAFT_PAGE_BUILDER_VERSION, true );
		wp_enqueue_script( 'sidcraft-page-builder-convert-tools' );
		wp_add_inline_script( 'sidcraft-page-builder-convert-tools', 'window.sidsynConvertTools=' . wp_json_encode( $cfg ) . ';', 'before' );
		wp_add_inline_script( 'sidcraft-page-builder-convert-tools', self::runner_js() );
	}

	/**
	 * @return string
	 */
	private static function runner_js() {
		return <<<'JS'
		(function(){
			var cfg=window.sidsynConvertTools||{};
			var form=document.getElementById('sidsyn-convert-form');
			var panel=document.getElementById('sidsyn-convert-job');
			var paused=false,busy=false;
			function call(path,body){
				return fetch(cfg.root+path,{method:body?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json','X-WP-Nonce':cfg.nonce},body:body?JSON.stringify(body):undefined})
					.then(function(r){return r.json().then(function(j){if(!r.ok)throw j;return j;});});
			}
			function refresh(){ return fetch(location.href,{credentials:'same-origin'}).then(function(r){return r.text();}).then(function(html){
				var doc=new DOMParser().parseFromString(html,'text/html');var next=doc.getElementById('sidsyn-convert-job');
				if(next&&panel){panel.innerHTML=next.innerHTML;bind();}
			});}
			var failures=0;
			function loop(){
				if(paused)return;busy=true;
				call('/step',{}).then(function(res){
					failures=0;
					var job=res.job;return refresh().then(function(){
						if(job&&job.status==='running'&&!paused){setTimeout(loop,150);}else{busy=false;}
					});
				}).catch(function(err){
					if(err&&err.code==='job_busy'){setTimeout(loop,2000);return;}
					// A step that died (fatal error, timeout) saved its checkpoint;
					// the next step records the failed page and moves on.
					failures++;
					call('').then(function(res){
						var job=res&&res.job;
						if(job&&job.status==='running'&&!paused&&failures<4){setTimeout(loop,1000);return;}
						busy=false;
						refresh().then(function(){var p=document.createElement('p');p.style.color='#b32d2e';p.textContent=(err&&err.message)||cfg.i18n.error;panel.appendChild(p);});
					}).catch(function(){busy=false;});
				});
			}
			function bind(){
				if(!panel)return;
				var resume=panel.querySelector('[data-sidsyn-job="resume"]');
				var pause=panel.querySelector('[data-sidsyn-job="pause"]');
				var cancel=panel.querySelector('[data-sidsyn-job="cancel"]');
				if(resume){resume.onclick=function(e){e.preventDefault();paused=false;if(!busy)loop();};}
				if(pause){pause.hidden=false;pause.onclick=function(e){e.preventDefault();paused=true;call('/pause',{}).then(refresh);};}
				if(cancel){cancel.onclick=function(e){e.preventDefault();if(!confirm(cfg.i18n.cancel))return;paused=true;call('/cancel',{}).then(refresh);};}
			}
			bind();
			if(form){
				var all=document.getElementById('sidsyn-convert-all'),list=document.getElementById('sidsyn-convert-list');
				if(all&&list){all.addEventListener('change',function(){list.disabled=all.checked;list.style.opacity=all.checked?.5:1;});}
				form.addEventListener('submit',function(e){
					e.preventDefault();
					var fd=new FormData(form),ids=fd.getAll('ids[]').map(Number),mode=fd.get('mode')||'stage';
					if(!fd.get('all')&&!ids.length){alert(cfg.i18n.select);return;}
					if(mode==='in_place'&&!confirm(cfg.i18n.confirm))return;
					var body={ids:fd.get('all')?[]:ids,mode:mode,force:!!fd.get('force'),batch:Number(fd.get('batch')||5),replace:true};
					paused=false;
					call('',body).then(function(){return refresh();}).then(loop).catch(function(err){alert((err&&err.message)||cfg.i18n.error);});
				});
			}
			// A job left running (tab closed mid-way) resumes when the owner clicks Resume.
		})();
JS;
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
		if ( ! empty( $report['staged'] ) ) {
			echo ' ' . esc_html(
				sprintf(
					/* translators: %d: number of staged conversions */
					__( 'Waiting for review: %d.', 'sidcraft-page-builder' ),
					(int) $report['staged']
				)
			);
		}
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
				$un = $row['unmapped'] ?? array();
				$ul = array();
				if ( is_array( $un ) ) {
					foreach ( $un as $t => $n ) {
						$ul[] = $t . "\u{D7}" . (int) $n;
					}
				} elseif ( (int) $un > 0 ) {
					$ul[] = (string) (int) $un;
				}
				echo '<tr>';
				echo '<td>' . esc_html( (string) (int) ( $row['id'] ?? 0 ) ) . '</td>';
				echo '<td>' . esc_html( (string) ( $row['title'] ?? '' ) ) . '</td>';
				echo '<td>' . esc_html( (string) ( $row['status'] ?? '' ) ) . '</td>';
				echo '<td>' . esc_html( (string) (int) ( $row['mapped'] ?? 0 ) ) . '</td>';
				echo '<td>' . esc_html( $ul ? implode( ', ', $ul ) : "\u{2014}" ) . '</td>';
				$note = (string) ( $row['error'] ?? '' );
				if ( $note !== '' && ! empty( $row['path'] ) && strpos( $note, (string) $row['path'] ) === false ) {
					$note .= ' [' . (string) $row['path'] . ']';
				}
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
