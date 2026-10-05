<?php
/**
 * Conversion review: stage, compare side by side, accept or discard.
 *
 * A staged conversion is stored next to the source page and changes nothing
 * visitors see. The owner opens the review screen, compares the current page
 * with the converted one, reads what could not be converted (widgets, dynamic
 * data, missing text), and only then accepts it - in place or as a copy - or
 * discards it. An accepted in-place conversion can be reverted: the
 * Sidcraft Page Builder document is removed and the page goes back to its
 * source builder data, which is never modified.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Convert;

use SidcraftPageBuilder\Document\DocumentManager;
use SidcraftPageBuilder\Document\FallbackContent;
use SidcraftPageBuilder\Document\Revisions;
use SidcraftPageBuilder\Rendering\FrontendRenderer;
use SidcraftPageBuilder\Rendering\OutputEscape;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Review {

	const PAGE        = 'sidcraft-page-builder-review';
	const DOC_META    = '_sidsyn_staged_document';
	const REPORT_META = '_sidsyn_staged_report';
	const AT_META     = '_sidsyn_staged_at';
	const TARGET_META = '_sidsyn_staged_target';
	const BY_META     = '_sidsyn_staged_by';
	const QUERY_VAR   = 'sidsyn_review';
	const NOTICE      = 'sidcraft_page_builder_review_notice';

	public static function init() {
		add_action( 'template_redirect', array( self::class, 'maybe_preview' ), 0 );
		if ( ! function_exists( 'is_admin' ) || is_admin() ) {
			add_action( 'admin_menu', array( self::class, 'menu' ), 20 );
			add_action( 'admin_post_sidsyn_review_accept', array( self::class, 'handle_accept' ) );
			add_action( 'admin_post_sidsyn_review_discard', array( self::class, 'handle_discard' ) );
			add_action( 'admin_post_sidsyn_review_revert', array( self::class, 'handle_revert' ) );
		}
	}

	public static function can_manage() {
		return current_user_can( 'manage_options' );
	}

	public static function menu() {
		$count = count( self::staged_ids() );
		$label = __( 'Review Conversions', 'sidcraft-page-builder' );
		if ( $count ) {
			$label .= ' <span class="awaiting-mod">' . (int) $count . '</span>';
		}
		add_submenu_page( 'sidcraft-page-builder', __( 'Review Conversions', 'sidcraft-page-builder' ), $label, 'manage_options', self::PAGE, array( self::class, 'screen' ) );
	}

	public static function url( $post_id = 0 ) {
		$args = array( 'page' => self::PAGE );
		if ( $post_id ) {
			$args['post'] = absint( $post_id );
		}
		return add_query_arg( $args, admin_url( 'admin.php' ) );
	}

	/* ------------------------------------------------------------------ */
	/* Storage                                                             */
	/* ------------------------------------------------------------------ */

	/**
	 * Keep a converted document beside the source page until it is reviewed.
	 *
	 * @param int    $post_id
	 * @param array  $doc
	 * @param array  $report
	 * @param string $target in_place|copy
	 * @return true|\WP_Error
	 */
	public static function stage( $post_id, array $doc, array $report, $target = 'in_place' ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || ! current_user_can( 'edit_post', $post_id ) ) {
			return new \WP_Error( 'forbidden', __( 'You cannot convert this document.', 'sidcraft-page-builder' ) );
		}
		$target = in_array( $target, array( 'in_place', 'copy' ), true ) ? $target : 'in_place';
		if ( get_post_type( $post_id ) === Converter::SOURCE_LIBRARY_TYPE ) {
			$target = 'template';
		}
		DocumentManager::write_json_meta( $post_id, self::DOC_META, wp_json_encode( $doc ) );
		update_post_meta( $post_id, self::REPORT_META, self::slim_report( $report ) );
		update_post_meta( $post_id, self::AT_META, current_time( 'mysql' ) );
		update_post_meta( $post_id, self::TARGET_META, $target );
		update_post_meta( $post_id, self::BY_META, get_current_user_id() );
		return true;
	}

	/**
	 * Report fields worth keeping (warnings capped so meta stays small).
	 *
	 * @param array $report
	 * @return array
	 */
	private static function slim_report( array $report ) {
		$keep = array( 'mapped', 'unmapped', 'warnings', 'nodes', 'globals', 'layout', 'dynamic', 'unmapped_nodes' );
		$out  = array();
		foreach ( $keep as $k ) {
			if ( array_key_exists( $k, $report ) ) {
				$out[ $k ] = $report[ $k ];
			}
		}
		foreach ( array( 'warnings', 'dynamic', 'unmapped_nodes' ) as $k ) {
			if ( isset( $out[ $k ] ) && is_array( $out[ $k ] ) ) {
				$out[ $k ] = array_slice( array_values( $out[ $k ] ), 0, 200 );
			}
		}
		return $out;
	}

	/**
	 * @param int $post_id
	 * @return array|null {document, report, at, target, by}
	 */
	public static function staged( $post_id ) {
		$post_id = absint( $post_id );
		$raw     = $post_id ? get_post_meta( $post_id, self::DOC_META, true ) : '';
		if ( ! $raw ) {
			return null;
		}
		$doc = is_array( $raw ) ? $raw : json_decode( (string) $raw, true );
		if ( ! is_array( $doc ) ) {
			return null;
		}
		$report = get_post_meta( $post_id, self::REPORT_META, true );
		return array(
			'document' => $doc,
			'report'   => is_array( $report ) ? $report : array(),
			'at'       => (string) get_post_meta( $post_id, self::AT_META, true ),
			'target'   => (string) get_post_meta( $post_id, self::TARGET_META, true ),
			'by'       => (int) get_post_meta( $post_id, self::BY_META, true ),
		);
	}

	/**
	 * @return int[]
	 */
	public static function staged_ids() {
		global $wpdb;
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s ORDER BY post_id ASC", self::DOC_META ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		return array_values( array_filter( array_map( 'absint', (array) $ids ) ) );
	}

	/**
	 * @param int $post_id
	 */
	public static function clear( $post_id ) {
		foreach ( array( self::DOC_META, self::REPORT_META, self::AT_META, self::TARGET_META, self::BY_META ) as $k ) {
			delete_post_meta( $post_id, $k );
		}
	}

	/* ------------------------------------------------------------------ */
	/* Accept / discard / revert                                           */
	/* ------------------------------------------------------------------ */

	/**
	 * Make a staged conversion live.
	 *
	 * @param int    $post_id
	 * @param string $target in_place|copy (templates always become a saved template)
	 * @return array|\WP_Error {id, target_id, mode}
	 */
	public static function accept( $post_id, $target = '' ) {
		$post_id = absint( $post_id );
		$staged  = self::staged( $post_id );
		if ( ! $staged ) {
			return new \WP_Error( 'not_staged', __( 'There is no conversion waiting for review on this page.', 'sidcraft-page-builder' ) );
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return new \WP_Error( 'forbidden', __( 'You cannot edit this page.', 'sidcraft-page-builder' ) );
		}
		$post   = get_post( $post_id );
		$doc    = $staged['document'];
		$target = $target !== '' ? $target : ( $staged['target'] !== '' ? $staged['target'] : 'in_place' );
		$conv   = new Converter();

		if ( $post && $post->post_type === Converter::SOURCE_LIBRARY_TYPE ) {
			$tpl = $conv->save_as_template( $post, $doc );
			if ( is_wp_error( $tpl ) ) {
				return $tpl;
			}
			update_post_meta( $post_id, Converter::CONVERTED_META, 'library:' . (int) $tpl );
			update_post_meta( $post_id, Converter::CONVERTED_AT, current_time( 'mysql' ) );
			self::clear( $post_id );
			return array(
				'id'        => $post_id,
				'target_id' => (int) $tpl,
				'mode'      => 'template',
			);
		}

		if ( $target === 'copy' ) {
			$copy = Tool::duplicate_as_copy( $post_id );
			if ( ! $copy ) {
				return new \WP_Error( 'copy_failed', __( 'The copy could not be created. The original page was not changed.', 'sidcraft-page-builder' ) );
			}
			$saved = DocumentManager::save( $copy, $doc );
			if ( is_wp_error( $saved ) ) {
				return $saved;
			}
			update_post_meta( $copy, Converter::CONVERTED_META, 'document' );
			update_post_meta( $copy, Converter::CONVERTED_AT, current_time( 'mysql' ) );
			self::clear( $post_id );
			return array(
				'id'        => $post_id,
				'target_id' => (int) $copy,
				'mode'      => 'copy',
			);
		}

		// In place. Snapshot whatever builder document the page has now, so
		// the page's own revision history can bring it back.
		if ( DocumentManager::has( $post_id ) && class_exists( Revisions::class ) ) {
			Revisions::record( $post_id, __( 'Before conversion', 'sidcraft-page-builder' ) );
		}
		$saved = DocumentManager::save( $post_id, $doc );
		if ( is_wp_error( $saved ) ) {
			return $saved;
		}
		update_post_meta( $post_id, Converter::CONVERTED_META, 'document' );
		update_post_meta( $post_id, Converter::CONVERTED_AT, current_time( 'mysql' ) );
		self::clear( $post_id );
		/**
		 * Fires after a reviewed conversion replaced a page.
		 *
		 * @param int   $post_id
		 * @param array $saved
		 */
		do_action( 'sidcraft_page_builder_conversion_accepted', $post_id, $saved );
		return array(
			'id'        => $post_id,
			'target_id' => $post_id,
			'mode'      => 'in_place',
		);
	}

	/**
	 * Whether an accepted in-place conversion can be undone.
	 *
	 * @param int $post_id
	 * @return bool
	 */
	public static function can_revert( $post_id ) {
		return (string) get_post_meta( $post_id, Converter::CONVERTED_META, true ) === 'document'
			&& Converter::has_source( $post_id )
			&& DocumentManager::has( $post_id );
	}

	/**
	 * Undo an in-place conversion: the page shows its source builder layout
	 * again. The Sidcraft Page Builder version stays in the page's revisions.
	 *
	 * @param int $post_id
	 * @return true|\WP_Error
	 */
	public static function revert( $post_id ) {
		$post_id = absint( $post_id );
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return new \WP_Error( 'forbidden', __( 'You cannot edit this page.', 'sidcraft-page-builder' ) );
		}
		if ( ! self::can_revert( $post_id ) ) {
			return new \WP_Error( 'not_revertible', __( 'This page has no converted layout that can be reverted.', 'sidcraft-page-builder' ) );
		}
		if ( class_exists( Revisions::class ) ) {
			Revisions::record( $post_id, __( 'Before revert to original builder', 'sidcraft-page-builder' ) );
		}
		foreach ( array( DocumentManager::META, DocumentManager::HASH, DocumentManager::CSS_CACHE, DocumentManager::VERSION, DocumentManager::UPDATED, Converter::CONVERTED_META, Converter::CONVERTED_AT ) as $k ) {
			delete_post_meta( $post_id, $k );
		}
		if ( class_exists( FallbackContent::class ) ) {
			FallbackContent::restore_original( $post_id );
		}
		DocumentManager::flush_runtime( $post_id );
		if ( class_exists( '\\SidcraftPageBuilder\\Design\\CssPrint' ) ) {
			\SidcraftPageBuilder\Design\CssPrint::invalidate_post( $post_id );
		}
		clean_post_cache( $post_id );
		return true;
	}

	/* ------------------------------------------------------------------ */
	/* Comparison                                                          */
	/* ------------------------------------------------------------------ */

	/**
	 * Visible text from the source layout that does not appear on the
	 * converted page.
	 *
	 * @param int   $post_id
	 * @param array $doc Converted document.
	 * @return array{checked:int,missing:array<int,array{text:string,type:string,node:string}>,partial:array}
	 */
	public static function content_check( $post_id, array $doc ) {
		$source  = Converter::source_data( $post_id );
		$strings = array();
		self::collect_source_text( is_array( $source ) ? $source : array(), $strings );
		$html = '';
		try {
			$html = self::render( $post_id, $doc );
		} catch ( \Throwable $e ) {
			$html = '';
		}
		$target  = self::norm( wp_strip_all_tags( $html ) . ' ' . self::doc_text( $doc ) );
		$missing = array();
		$partial = array();
		$seen    = array();
		foreach ( $strings as $row ) {
			$n = self::norm( $row['text'] );
			if ( $n === '' || isset( $seen[ $n ] ) ) {
				continue;
			}
			$seen[ $n ] = true;
			if ( strpos( $target, $n ) !== false ) {
				continue;
			}
			$words = array_filter( explode( ' ', $n ), static function ( $w ) {
				return strlen( $w ) > 2;
			} );
			$found = 0;
			foreach ( $words as $w ) {
				if ( strpos( $target, $w ) !== false ) {
					++$found;
				}
			}
			$ratio = $words ? $found / count( $words ) : 0;
			$row['text'] = wp_html_excerpt( $row['text'], 160, '…' );
			if ( $ratio >= 0.8 ) {
				$partial[] = $row;
			} else {
				$missing[] = $row;
			}
		}
		return array(
			'checked' => count( $seen ),
			'missing' => $missing,
			'partial' => $partial,
		);
	}

	/**
	 * Render a document as visitors would see it.
	 *
	 * @param int   $post_id
	 * @param array $doc
	 * @return string
	 */
	private static function render( $post_id, array $doc ) {
		$render = function () use ( $doc, $post_id ) {
			return FrontendRenderer::render_document( DocumentManager::sanitize( $doc ), $post_id );
		};
		return class_exists( OutputEscape::class ) ? (string) OutputEscape::render( $render ) : (string) $render();
	}

	/**
	 * All string settings of a converted document (catches text inside
	 * tabs, accordions and other units that render panels lazily).
	 *
	 * @param array $doc
	 * @return string
	 */
	private static function doc_text( array $doc ) {
		$parts = array();
		$walk  = function ( $value ) use ( &$walk, &$parts ) {
			if ( is_string( $value ) ) {
				$parts[] = wp_strip_all_tags( $value );
			} elseif ( is_array( $value ) ) {
				foreach ( $value as $v ) {
					$walk( $v );
				}
			}
		};
		foreach ( array( 'root', 'header', 'footer' ) as $part ) {
			$walk( $doc[ $part ] ?? array() );
		}
		return implode( ' ', $parts );
	}

	/**
	 * Setting keys that hold visible text, by suffix or name.
	 *
	 * @param string $key
	 * @return bool
	 */
	private static function text_key( $key ) {
		$key = strtolower( (string) $key );
		if ( $key === '' || $key[0] === '_' ) {
			return false;
		}
		foreach ( array( 'color', 'typography', 'size', 'align', 'margin', 'padding', 'border', 'background', 'css', 'class', 'animation', 'position', 'width', 'height', 'icon', 'view', 'shape', 'skin', 'layout', 'link', 'url', 'image', 'gap', 'direction', 'justify', 'tag', 'html_tag', 'style', 'transition', 'effect', 'motion', 'hover', 'z_index', 'ratio', 'columns', 'id' ) as $bad ) {
			if ( $key === $bad || strpos( $key, $bad ) !== false ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @param array $elements
	 * @param array $out
	 */
	private static function collect_source_text( array $elements, array &$out ) {
		foreach ( $elements as $el ) {
			if ( ! is_array( $el ) ) {
				continue;
			}
			$type     = Converter::source_type( $el );
			$settings = is_array( $el['settings'] ?? null ) ? $el['settings'] : array();
			self::collect_settings_text( $settings, $type, (string) ( $el['id'] ?? '' ), $out );
			$kids = $el['elements'] ?? ( $el['units'] ?? array() );
			if ( is_array( $kids ) ) {
				self::collect_source_text( $kids, $out );
			}
		}
	}

	/**
	 * @param array  $settings
	 * @param string $type
	 * @param string $node
	 * @param array  $out
	 */
	private static function collect_settings_text( array $settings, $type, $node, array &$out ) {
		foreach ( $settings as $key => $value ) {
			if ( is_array( $value ) ) {
				// Repeaters (tabs, list items, slides): rows are arrays of fields.
				if ( isset( $value[0] ) && is_array( $value[0] ) ) {
					foreach ( $value as $row ) {
						if ( is_array( $row ) ) {
							self::collect_settings_text( $row, $type, $node, $out );
						}
					}
				}
				continue;
			}
			if ( ! is_string( $value ) || ! self::text_key( (string) $key ) ) {
				continue;
			}
			$text = trim( html_entity_decode( wp_strip_all_tags( $value ), ENT_QUOTES, 'UTF-8' ) );
			if ( strlen( $text ) < 3 || ! preg_match( '/\p{L}{2,}/u', $text ) ) {
				continue;
			}
			if ( preg_match( '#^(https?:|/|\#|[a-z_-]+$)#i', $text ) && strpos( $text, ' ' ) === false ) {
				continue; // URLs, anchors and option slugs.
			}
			$out[] = array(
				'text' => $text,
				'type' => $type,
				'node' => $node,
			);
		}
	}

	/**
	 * @param string $s
	 * @return string
	 */
	private static function norm( $s ) {
		$s = html_entity_decode( (string) $s, ENT_QUOTES, 'UTF-8' );
		$s = function_exists( 'mb_strtolower' ) ? mb_strtolower( $s, 'UTF-8' ) : strtolower( $s );
		$s = preg_replace( '/[^\p{L}\p{N}]+/u', ' ', $s );
		return trim( (string) preg_replace( '/\s+/', ' ', (string) $s ) );
	}

	/* ------------------------------------------------------------------ */
	/* Frontend preview                                                    */
	/* ------------------------------------------------------------------ */

	/**
	 * Signed preview URL for one side of the comparison.
	 *
	 * @param int    $post_id
	 * @param string $side converted|original
	 * @return string
	 */
	public static function preview_url( $post_id, $side ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return '';
		}
		$base = get_post_status( $post ) === 'publish' ? get_permalink( $post ) : get_preview_post_link( $post );
		if ( ! $base ) {
			return '';
		}
		return add_query_arg(
			array(
				self::QUERY_VAR => $side === 'original' ? 'original' : 'converted',
				'sidsyn_post'   => (int) $post_id,
				'_sidsynrev'    => wp_create_nonce( 'sidsyn_review_' . (int) $post_id ),
			),
			$base
		);
	}

	/**
	 * On a signed review URL, show the staged layout (or the untouched
	 * current page) without the admin bar. Nothing is written or cached.
	 */
	public static function maybe_preview() {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- The nonce is verified below.
		if ( empty( $_GET[ self::QUERY_VAR ] ) || empty( $_GET['sidsyn_post'] ) ) {
			return;
		}
		$side    = sanitize_key( wp_unslash( $_GET[ self::QUERY_VAR ] ) );
		$post_id = absint( wp_unslash( $_GET['sidsyn_post'] ) );
		$nonce   = isset( $_GET['_sidsynrev'] ) ? sanitize_text_field( wp_unslash( $_GET['_sidsynrev'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended
		if ( ! $post_id || ! wp_verify_nonce( $nonce, 'sidsyn_review_' . $post_id ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		if ( function_exists( 'nocache_headers' ) ) {
			nocache_headers();
		}
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}
		add_filter( 'show_admin_bar', '__return_false' );
		header( 'X-Robots-Tag: noindex', true );
		if ( $side !== 'converted' ) {
			return;
		}
		$staged = self::staged( $post_id );
		if ( $staged ) {
			DocumentManager::preview( $post_id, $staged['document'] );
		}
	}

	/* ------------------------------------------------------------------ */
	/* Admin                                                               */
	/* ------------------------------------------------------------------ */

	/**
	 * Device widths and synced scrolling for the two preview panes.
	 *
	 * @return string
	 */
	private static function compare_js() {
		return <<<'JS'
			(function(){
				var frames=[].slice.call(document.querySelectorAll('.sidsyn-review-panes iframe'));
				[].forEach.call(document.querySelectorAll('[data-sidsyn-width]'),function(b){
					b.addEventListener('click',function(){
						[].forEach.call(document.querySelectorAll('[data-sidsyn-width]'),function(x){x.classList.toggle('button-primary',x===b);});
						frames.forEach(function(f){f.style.width=b.getAttribute('data-sidsyn-width');});
					});
				});
				var busy=false;
				frames.forEach(function(f,i){
					f.addEventListener('load',function(){
						try{
							f.contentWindow.addEventListener('scroll',function(){
								var box=document.getElementById('sidsyn-sync-scroll');
								if(busy||!box||!box.checked)return;
								var w=f.contentWindow,d=w.document.documentElement,max=Math.max(1,d.scrollHeight-w.innerHeight),r=w.scrollY/max;
								var o=frames[1-i];if(!o||!o.contentWindow)return;
								var od=o.contentWindow.document.documentElement;
								busy=true;o.contentWindow.scrollTo(0,r*Math.max(0,od.scrollHeight-o.contentWindow.innerHeight));
								setTimeout(function(){busy=false;},30);
							});
						}catch(e){}
					});
				});
			})();
JS;
	}

	private static function notice( $type, $message ) {
		set_transient(
			self::NOTICE . '_' . get_current_user_id(),
			array(
				'type'    => $type,
				'message' => $message,
			),
			120
		);
	}

	private static function print_notice() {
		$n = get_transient( self::NOTICE . '_' . get_current_user_id() );
		if ( ! is_array( $n ) ) {
			return;
		}
		delete_transient( self::NOTICE . '_' . get_current_user_id() );
		$class = ( $n['type'] ?? '' ) === 'success' ? 'notice-success' : 'notice-error';
		echo '<div class="notice ' . esc_attr( $class ) . ' is-dismissible"><p>' . wp_kses( (string) ( $n['message'] ?? '' ), array( 'a' => array( 'href' => true ) ) ) . '</p></div>';
	}

	private static function request_post_id() {
		check_admin_referer( 'sidsyn_review' );
		if ( ! self::can_manage() ) {
			wp_die( esc_html__( 'Only administrators can review conversions.', 'sidcraft-page-builder' ) );
		}
		return isset( $_POST['post'] ) ? absint( wp_unslash( $_POST['post'] ) ) : 0;
	}

	public static function handle_accept() {
		$post_id = self::request_post_id();
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified in request_post_id().
		$target  = isset( $_POST['target'] ) ? sanitize_key( wp_unslash( $_POST['target'] ) ) : '';
		$result  = self::accept( $post_id, $target );
		if ( is_wp_error( $result ) ) {
			self::notice( 'error', esc_html( $result->get_error_message() ) );
			wp_safe_redirect( self::url( $post_id ) );
			exit;
		}
		$tid  = (int) $result['target_id'];
		$link = $result['mode'] === 'template' ? '' : get_permalink( $tid );
		$msg  = $result['mode'] === 'copy'
			? __( 'Conversion accepted as a new copy. The original page was not changed.', 'sidcraft-page-builder' )
			: ( $result['mode'] === 'template'
				? __( 'Conversion accepted as a Sidcraft Page Builder template.', 'sidcraft-page-builder' )
				: __( 'Conversion accepted. The page now uses the Sidcraft Page Builder layout; the original builder data was kept and you can revert from this screen.', 'sidcraft-page-builder' ) );
		if ( $link ) {
			$msg = esc_html( $msg ) . ' <a href="' . esc_url( $link ) . '">' . esc_html__( 'View page', 'sidcraft-page-builder' ) . '</a>';
		} else {
			$msg = esc_html( $msg );
		}
		self::notice( 'success', $msg );
		wp_safe_redirect( self::url() );
		exit;
	}

	public static function handle_discard() {
		$post_id = self::request_post_id();
		if ( $post_id && current_user_can( 'edit_post', $post_id ) ) {
			self::clear( $post_id );
			self::notice( 'success', esc_html__( 'Staged conversion discarded. Nothing on the page changed.', 'sidcraft-page-builder' ) );
		}
		wp_safe_redirect( self::url() );
		exit;
	}

	public static function handle_revert() {
		$post_id = self::request_post_id();
		$result  = self::revert( $post_id );
		if ( is_wp_error( $result ) ) {
			self::notice( 'error', esc_html( $result->get_error_message() ) );
		} else {
			self::notice( 'success', esc_html__( 'Reverted. The page shows its original builder layout again; the converted version is kept in the page revisions.', 'sidcraft-page-builder' ) );
		}
		wp_safe_redirect( self::url() );
		exit;
	}

	private static function action_button( $action, $post_id, $label, $class = 'button', $extra = '', $confirm = '' ) {
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" style="display:inline-block;margin:0 6px 6px 0">';
		wp_nonce_field( 'sidsyn_review' );
		echo '<input type="hidden" name="action" value="' . esc_attr( $action ) . '"><input type="hidden" name="post" value="' . esc_attr( (string) $post_id ) . '">';
		echo $extra; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts by callers.
		$onclick = $confirm !== '' ? ' onclick="return confirm(\'' . esc_js( $confirm ) . '\');"' : '';
		echo '<button type="submit" class="' . esc_attr( $class ) . '"' . $onclick . '>' . esc_html( $label ) . '</button></form>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $onclick is escaped.
	}

	public static function screen() {
		if ( ! self::can_manage() ) {
			return;
		}
		echo '<div class="wrap sidsyn-review">';
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only screen routing.
		$post_id = isset( $_GET['post'] ) ? absint( wp_unslash( $_GET['post'] ) ) : 0;
		if ( $post_id ) {
			self::screen_one( $post_id );
		} else {
			self::screen_list();
		}
		echo '</div>';
	}

	private static function screen_list() {
		echo '<h1>' . esc_html__( 'Review Conversions', 'sidcraft-page-builder' ) . '</h1>';
		self::print_notice();
		echo '<p class="description" style="max-width:820px">' . esc_html__( 'Conversions staged from Tools wait here. Nothing changes on a page until you open it, compare the current and converted versions side by side, and click Accept.', 'sidcraft-page-builder' ) . '</p>';
		$ids = self::staged_ids();
		if ( ! $ids ) {
			echo '<p><strong>' . esc_html__( 'No conversions are waiting for review.', 'sidcraft-page-builder' ) . '</strong> ';
			echo '<a href="' . esc_url( Tool::tools_url() . '#sidcraft-page-builder-import-elementor' ) . '">' . esc_html__( 'Convert pages from Tools', 'sidcraft-page-builder' ) . '</a></p>';
		} else {
			echo '<table class="widefat striped"><thead><tr>';
			foreach ( array( __( 'Page', 'sidcraft-page-builder' ), __( 'Staged', 'sidcraft-page-builder' ), __( 'Converted', 'sidcraft-page-builder' ), __( 'Not converted', 'sidcraft-page-builder' ), __( 'Dynamic data', 'sidcraft-page-builder' ), __( 'Accept as', 'sidcraft-page-builder' ), '' ) as $h ) {
				echo '<th>' . esc_html( $h ) . '</th>';
			}
			echo '</tr></thead><tbody>';
			foreach ( $ids as $id ) {
				$s = self::staged( $id );
				if ( ! $s ) {
					continue;
				}
				$r = $s['report'];
				echo '<tr><td><strong><a href="' . esc_url( self::url( $id ) ) . '">' . esc_html( get_the_title( $id ) !== '' ? get_the_title( $id ) : '#' . $id ) . '</a></strong><br><span class="description">' . esc_html( (string) get_post_type( $id ) . ' #' . $id ) . '</span></td>';
				echo '<td>' . esc_html( $s['at'] ) . '</td>';
				echo '<td>' . esc_html( (string) (int) ( $r['mapped'] ?? 0 ) ) . '</td>';
				echo '<td>' . esc_html( (string) count( (array) ( $r['unmapped_nodes'] ?? array() ) ) ) . '</td>';
				echo '<td>' . esc_html( (string) count( (array) ( $r['dynamic'] ?? array() ) ) ) . '</td>';
				echo '<td>' . esc_html( self::target_label( $s['target'] ) ) . '</td>';
				echo '<td><a class="button button-primary" href="' . esc_url( self::url( $id ) ) . '">' . esc_html__( 'Review', 'sidcraft-page-builder' ) . '</a></td></tr>';
			}
			echo '</tbody></table>';
		}
		self::screen_reverts();
	}

	private static function screen_reverts() {
		global $wpdb;
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s AND meta_value = %s ORDER BY post_id DESC LIMIT 100", Converter::CONVERTED_META, 'document' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$ids = array_values( array_filter( array_map( 'absint', (array) $ids ), array( self::class, 'can_revert' ) ) );
		if ( ! $ids ) {
			return;
		}
		echo '<h2 style="margin-top:32px">' . esc_html__( 'Converted pages', 'sidcraft-page-builder' ) . '</h2>';
		echo '<p class="description">' . esc_html__( 'These pages were converted in place. Their original builder data is still stored, so you can go back to it.', 'sidcraft-page-builder' ) . '</p>';
		echo '<table class="widefat striped" style="max-width:820px"><tbody>';
		foreach ( $ids as $id ) {
			echo '<tr><td><a href="' . esc_url( (string) get_permalink( $id ) ) . '">' . esc_html( get_the_title( $id ) !== '' ? get_the_title( $id ) : '#' . $id ) . '</a> <span class="description">' . esc_html( (string) get_post_meta( $id, Converter::CONVERTED_AT, true ) ) . '</span></td><td style="text-align:right">';
			self::action_button( 'sidsyn_review_revert', $id, __( 'Revert to original', 'sidcraft-page-builder' ), 'button', '', __( 'Remove the converted layout from this page and show the original builder layout again? The converted version stays in the page revisions.', 'sidcraft-page-builder' ) );
			echo '</td></tr>';
		}
		echo '</tbody></table>';
	}

	private static function target_label( $target ) {
		if ( $target === 'copy' ) {
			return __( 'New copy', 'sidcraft-page-builder' );
		}
		if ( $target === 'template' ) {
			return __( 'Template', 'sidcraft-page-builder' );
		}
		return __( 'Replace page', 'sidcraft-page-builder' );
	}

	private static function screen_one( $post_id ) {
		$post   = get_post( $post_id );
		$staged = self::staged( $post_id );
		echo '<p><a href="' . esc_url( self::url() ) . '">&larr; ' . esc_html__( 'All conversions', 'sidcraft-page-builder' ) . '</a></p>';
		if ( ! $post || ! $staged ) {
			echo '<h1>' . esc_html__( 'Review Conversion', 'sidcraft-page-builder' ) . '</h1>';
			self::print_notice();
			echo '<p>' . esc_html__( 'There is no conversion waiting for review on this page.', 'sidcraft-page-builder' ) . '</p>';
			return;
		}
		$r      = $staged['report'];
		$check  = self::content_check( $post_id, $staged['document'] );
		$is_tpl = $staged['target'] === 'template';
		/* translators: %s: page title */
		echo '<h1>' . esc_html( sprintf( __( 'Review conversion: %s', 'sidcraft-page-builder' ), get_the_title( $post_id ) !== '' ? get_the_title( $post_id ) : '#' . $post_id ) ) . '</h1>';
		self::print_notice();

		$unmapped = (array) ( $r['unmapped_nodes'] ?? array() );
		$dynamic  = (array) ( $r['dynamic'] ?? array() );
		$stats    = array(
			array( __( 'Converted elements', 'sidcraft-page-builder' ), (int) ( $r['mapped'] ?? 0 ), '' ),
			array( __( 'Not converted', 'sidcraft-page-builder' ), count( $unmapped ), count( $unmapped ) ? '#b32d2e' : '' ),
			array( __( 'Dynamic data', 'sidcraft-page-builder' ), count( $dynamic ), count( $dynamic ) ? '#b26200' : '' ),
			array( __( 'Text missing', 'sidcraft-page-builder' ), count( $check['missing'] ), count( $check['missing'] ) ? '#b32d2e' : '' ),
			array( __( 'Text checked', 'sidcraft-page-builder' ), (int) $check['checked'], '' ),
		);
		echo '<div style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0 18px">';
		foreach ( $stats as $st ) {
			echo '<div style="background:#fff;border:1px solid #dcdcde;border-radius:6px;padding:10px 16px;min-width:120px"><div style="font-size:22px;font-weight:600' . ( $st[2] ? ';color:' . esc_attr( $st[2] ) : '' ) . '">' . esc_html( (string) $st[1] ) . '</div><div class="description">' . esc_html( $st[0] ) . '</div></div>';
		}
		echo '</div>';

		// Decision bar.
		echo '<div style="background:#fff;border:1px solid #dcdcde;border-left:4px solid #2271b1;padding:12px 16px;margin-bottom:18px">';
		echo '<p style="margin-top:0">' . esc_html__( 'Nothing on this page has changed yet. The original builder data is never modified, whichever option you choose.', 'sidcraft-page-builder' ) . '</p>';
		if ( $is_tpl ) {
			self::action_button( 'sidsyn_review_accept', $post_id, __( 'Accept as template', 'sidcraft-page-builder' ), 'button button-primary' );
		} else {
			$replace = '<input type="hidden" name="target" value="in_place">';
			$copy    = '<input type="hidden" name="target" value="copy">';
			self::action_button( 'sidsyn_review_accept', $post_id, __( 'Accept and replace this page', 'sidcraft-page-builder' ), 'button button-primary', $replace, __( 'Replace this page with the converted layout? You can revert later from Review Conversions.', 'sidcraft-page-builder' ) );
			self::action_button( 'sidsyn_review_accept', $post_id, __( 'Accept as a new copy', 'sidcraft-page-builder' ), 'button', $copy );
		}
		self::action_button( 'sidsyn_review_discard', $post_id, __( 'Discard', 'sidcraft-page-builder' ), 'button-link button-link-delete', '', __( 'Discard this staged conversion?', 'sidcraft-page-builder' ) );
		echo '</div>';

		// Side by side.
		$left  = self::preview_url( $post_id, 'original' );
		$right = self::preview_url( $post_id, 'converted' );
		if ( $left && $right && ! $is_tpl ) {
			echo '<h2>' . esc_html__( 'Side by side', 'sidcraft-page-builder' ) . '</h2>';
			echo '<p class="sidsyn-review-devices">';
			foreach ( array(
				'100%'  => __( 'Desktop', 'sidcraft-page-builder' ),
				'768px' => __( 'Tablet', 'sidcraft-page-builder' ),
				'390px' => __( 'Mobile', 'sidcraft-page-builder' ),
			) as $w => $label ) {
				echo '<button type="button" class="button' . ( $w === '100%' ? ' button-primary' : '' ) . '" data-sidsyn-width="' . esc_attr( $w ) . '">' . esc_html( $label ) . '</button> ';
			}
			echo '<label style="margin-left:12px"><input type="checkbox" id="sidsyn-sync-scroll" checked> ' . esc_html__( 'Scroll together', 'sidcraft-page-builder' ) . '</label></p>';
			echo '<div class="sidsyn-review-panes" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
			foreach ( array(
				array( __( 'Current page (what visitors see now)', 'sidcraft-page-builder' ), $left ),
				array( __( 'Converted (not live yet)', 'sidcraft-page-builder' ), $right ),
			) as $pane ) {
				echo '<div style="min-width:0"><div style="font-weight:600;margin-bottom:6px">' . esc_html( $pane[0] ) . ' <a href="' . esc_url( $pane[1] ) . '" target="_blank" rel="noopener" style="font-weight:400">' . esc_html__( 'Open', 'sidcraft-page-builder' ) . '</a></div>';
				echo '<div style="background:#dcdcde;border:1px solid #c3c4c7;height:720px;overflow:hidden;display:flex;justify-content:center"><iframe src="' . esc_url( $pane[1] ) . '" loading="lazy" title="' . esc_attr( $pane[0] ) . '" style="width:100%;height:100%;border:0;background:#fff"></iframe></div></div>';
			}
			echo '</div>';
			wp_register_script( 'sidcraft-page-builder-review', false, array(), SIDCRAFT_PAGE_BUILDER_VERSION, true );
			wp_enqueue_script( 'sidcraft-page-builder-review' );
			wp_add_inline_script( 'sidcraft-page-builder-review', self::compare_js() );
		} elseif ( $is_tpl ) {
			echo '<p class="description">' . esc_html__( 'Library templates have no public page to preview. Use the content check below; after accepting, the template opens in the Sidcraft Page Builder editor.', 'sidcraft-page-builder' ) . '</p>';
		}

		// Content check.
		echo '<h2 style="margin-top:28px">' . esc_html__( 'Content check', 'sidcraft-page-builder' ) . '</h2>';
		echo '<p class="description">' . esc_html__( 'Every piece of text in the source layout is looked up on the converted page.', 'sidcraft-page-builder' ) . '</p>';
		if ( ! $check['missing'] && ! $check['partial'] ) {
			echo '<p style="color:#007017"><strong>' . esc_html__( 'All text from the source layout appears on the converted page.', 'sidcraft-page-builder' ) . '</strong></p>';
		}
		foreach ( array(
			array( $check['missing'], __( 'Missing on the converted page', 'sidcraft-page-builder' ) ),
			array( $check['partial'], __( 'Present with small differences (wording, punctuation or formatting)', 'sidcraft-page-builder' ) ),
		) as $set ) {
			if ( ! $set[0] ) {
				continue;
			}
			echo '<h3>' . esc_html( $set[1] ) . ' (' . (int) count( $set[0] ) . ')</h3>';
			echo '<table class="widefat striped" style="max-width:1100px"><thead><tr><th>' . esc_html__( 'Text', 'sidcraft-page-builder' ) . '</th><th>' . esc_html__( 'Source widget', 'sidcraft-page-builder' ) . '</th><th>' . esc_html__( 'Element ID', 'sidcraft-page-builder' ) . '</th></tr></thead><tbody>';
			foreach ( array_slice( $set[0], 0, 200 ) as $row ) {
				echo '<tr><td>' . esc_html( $row['text'] ) . '</td><td><code>' . esc_html( $row['type'] ) . '</code></td><td><code>' . esc_html( $row['node'] ) . '</code></td></tr>';
			}
			echo '</tbody></table>';
		}

		// Unconverted widgets.
		if ( $unmapped ) {
			echo '<h2 style="margin-top:28px">' . esc_html__( 'Not converted', 'sidcraft-page-builder' ) . '</h2>';
			echo '<p class="description">' . esc_html__( 'These source elements have no Sidcraft Page Builder equivalent yet. Each shows a placeholder on the converted page so you can replace it after accepting.', 'sidcraft-page-builder' ) . '</p>';
			echo '<table class="widefat striped" style="max-width:1100px"><thead><tr><th>' . esc_html__( 'Widget', 'sidcraft-page-builder' ) . '</th><th>' . esc_html__( 'Element ID', 'sidcraft-page-builder' ) . '</th><th>' . esc_html__( 'Location', 'sidcraft-page-builder' ) . '</th></tr></thead><tbody>';
			foreach ( $unmapped as $u ) {
				echo '<tr><td><code>' . esc_html( (string) ( $u['type'] ?? '' ) ) . '</code></td><td><code>' . esc_html( (string) ( $u['node'] ?? '' ) ) . '</code></td><td>' . esc_html( (string) ( $u['path'] ?? '' ) ) . '</td></tr>';
			}
			echo '</tbody></table>';
		}

		// Dynamic data.
		if ( $dynamic ) {
			echo '<h2 style="margin-top:28px">' . esc_html__( 'Dynamic data', 'sidcraft-page-builder' ) . '</h2>';
			echo '<p class="description">' . esc_html__( 'These fields were filled by dynamic tags in the source builder (post title, custom fields, site data). They are not linked after conversion; the converted page shows the static value saved with the widget, if any. Re-link them with Dynamic Tags after accepting.', 'sidcraft-page-builder' ) . '</p>';
			echo '<table class="widefat striped" style="max-width:1100px"><thead><tr><th>' . esc_html__( 'Widget', 'sidcraft-page-builder' ) . '</th><th>' . esc_html__( 'Field → tag', 'sidcraft-page-builder' ) . '</th><th>' . esc_html__( 'Element ID', 'sidcraft-page-builder' ) . '</th></tr></thead><tbody>';
			foreach ( $dynamic as $d ) {
				$pairs = array();
				foreach ( (array) ( $d['fields'] ?? array() ) as $f => $t ) {
					$pairs[] = $f . ' → ' . $t;
				}
				echo '<tr><td><code>' . esc_html( (string) ( $d['type'] ?? '' ) ) . '</code></td><td>' . esc_html( implode( ', ', $pairs ) ) . '</td><td><code>' . esc_html( (string) ( $d['node'] ?? '' ) ) . '</code></td></tr>';
			}
			echo '</tbody></table>';
		}

		$warnings = array_values( array_filter( (array) ( $r['warnings'] ?? array() ) ) );
		if ( $warnings ) {
			echo '<h2 style="margin-top:28px">' . esc_html__( 'Notes', 'sidcraft-page-builder' ) . '</h2><ul style="list-style:disc;padding-left:20px">';
			foreach ( array_unique( $warnings ) as $w ) {
				echo '<li>' . esc_html( (string) $w ) . '</li>';
			}
			echo '</ul>';
		}
	}
}
