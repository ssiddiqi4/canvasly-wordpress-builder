<?php
/**
 * XEditor Loop Architecture — data model (Lite) for a Pro engine.
 *
 *   xe_loop          XEditorLoop        outer query container: source, filters, count, empty state
 *     xe_loop_layout XEditorLoopLayout  visual arrangement: grid | list | masonry, columns, gaps
 *       xe_loop_item XEditorLoopItem    the template of ONE item; its children use dynamic tokens
 *
 * The control schema lives in Lite so documents keep every loop setting even when
 * Sidcraft Syntex Pro is inactive (the document sanitizer only keeps declared keys). These
 * Lite classes render nothing; Sidcraft Syntex Pro subclasses them and adds the query engine
 * (`render_collection()`), and XEditorAccess blocks rendering without a Pro license.
 *
 * @package SidcraftSyntex
 */

namespace SidcraftSyntex\XEditor;

use SidcraftSyntex\XEditor\Elements\XEditorElement;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/elements/class-xeditor-element.php';

class XEditorLoopUnit extends XEditorElement {
	public function type() {
		return 'xe_loop';
	}

	public function title() {
		return __( 'Loop', 'sidcraft-syntex' );
	}

	public function icon() {
		return "\u{27F3}";
	}

	public function source() {
		return 'pro';
	}

	public function keywords() {
		return array( 'loop', 'query', 'posts', 'repeater', 'xeditor', 'archive', 'grid', 'list' );
	}

	public function supports_children() {
		return true;
	}

	protected function tags() {
		return array( 'div', 'section', 'aside', 'nav' );
	}

	public function defaults() {
		return array(
			'tag'             => 'div',
			'query_type'      => 'posts',
			'source'          => 'custom',
			'post_type'       => 'post',
			'posts_per_page'  => 6,
			'offset'          => 0,
			'orderby'         => 'date',
			'order'           => 'DESC',
			'taxonomy'        => '',
			'terms'           => '',
			'terms_operator'  => 'IN',
			'include'         => '',
			'exclude'         => '', // phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- Loop setting key (comma-separated IDs chosen in the editor), not a get_posts() argument; Query::posts_args() applies it with a bounded post__not_in.
			'exclude_current' => true,
			'ignore_sticky'   => true,
			'author'          => '',
			'hide_empty'      => true,
			'empty_mode'      => 'message',
			'empty_message'   => __( 'Nothing found.', 'sidcraft-syntex' ),
			'pagination'      => 'none',
		);
	}

	/**
	 * @return array<string,string>
	 */
	public static function post_type_options() {
		$out = array(
			'post' => __( 'Posts', 'sidcraft-syntex' ),
			'page' => __( 'Pages', 'sidcraft-syntex' ),
		);
		if ( function_exists( 'get_post_types' ) ) {
			foreach ( get_post_types( array( 'public' => true ), 'objects' ) as $name => $obj ) {
				if ( 'attachment' !== $name && ! isset( $out[ $name ] ) ) {
					$out[ $name ] = isset( $obj->labels->name ) ? (string) $obj->labels->name : $name;
				}
			}
		}
		$out['any'] = __( 'Any public type', 'sidcraft-syntex' );
		return $out;
	}

	/**
	 * @return array<string,string>
	 */
	public static function taxonomy_options() {
		$out = array( '' => __( 'None', 'sidcraft-syntex' ) );
		if ( function_exists( 'get_taxonomies' ) ) {
			foreach ( get_taxonomies( array( 'public' => true ), 'objects' ) as $name => $obj ) {
				$out[ $name ] = isset( $obj->labels->name ) ? (string) $obj->labels->name : $name;
			}
		} else {
			$out['category'] = __( 'Categories', 'sidcraft-syntex' );
			$out['post_tag'] = __( 'Tags', 'sidcraft-syntex' );
		}
		return $out;
	}

	protected function own_controls() {
		$q  = __( 'Query', 'sidcraft-syntex' );
		$f  = __( 'Filters', 'sidcraft-syntex' );
		$e  = __( 'Empty State & Paging', 'sidcraft-syntex' );
		$is_posts = array( 'query_type' => 'posts' );
		return array(
			'query_type'      => $this->ctrl( 'select', __( 'Data Source', 'sidcraft-syntex' ), 'content', $q, array( 'options' => array( 'posts' => __( 'Posts / pages / custom post types', 'sidcraft-syntex' ), 'terms' => __( 'Taxonomy terms', 'sidcraft-syntex' ) ) ) ),
			'source'          => $this->ctrl( 'select', __( 'Query', 'sidcraft-syntex' ), 'content', $q, array( 'condition' => $is_posts, 'options' => array( 'custom' => __( 'Custom query', 'sidcraft-syntex' ), 'current' => __( 'Current archive / main query', 'sidcraft-syntex' ), 'related' => __( 'Related to current post', 'sidcraft-syntex' ), 'manual' => __( 'Manual selection (IDs)', 'sidcraft-syntex' ) ) ) ),
			'post_type'       => $this->ctrl( 'select', __( 'Post Type', 'sidcraft-syntex' ), 'content', $q, array( 'condition' => $is_posts, 'options' => self::post_type_options() ) ),
			'posts_per_page'  => $this->ctrl( 'number', __( 'Item Count', 'sidcraft-syntex' ), 'content', $q, array( 'range' => array( 'min' => 1, 'max' => 100, 'step' => 1 ) ) ),
			'offset'          => $this->ctrl( 'number', __( 'Offset', 'sidcraft-syntex' ), 'content', $q, array( 'condition' => $is_posts, 'range' => array( 'min' => 0, 'max' => 100, 'step' => 1 ) ) ),
			'orderby'         => $this->ctrl( 'select', __( 'Order By', 'sidcraft-syntex' ), 'content', $q, array( 'options' => array( 'date' => __( 'Date', 'sidcraft-syntex' ), 'title' => __( 'Title', 'sidcraft-syntex' ), 'modified' => __( 'Last modified', 'sidcraft-syntex' ), 'menu_order' => __( 'Menu order', 'sidcraft-syntex' ), 'comment_count' => __( 'Comment count', 'sidcraft-syntex' ), 'rand' => __( 'Random', 'sidcraft-syntex' ), 'ID' => 'ID' ) ) ),
			'order'           => $this->ctrl( 'choose', __( 'Order', 'sidcraft-syntex' ), 'content', $q, array( 'options' => array( 'DESC' => __( 'Descending', 'sidcraft-syntex' ), 'ASC' => __( 'Ascending', 'sidcraft-syntex' ) ) ) ),
			'taxonomy'        => $this->ctrl( 'select', __( 'Taxonomy', 'sidcraft-syntex' ), 'content', $f, array( 'options' => self::taxonomy_options(), 'description' => __( 'For post loops: filter by these terms. For term loops: the taxonomy to list.', 'sidcraft-syntex' ) ) ),
			'terms'           => $this->ctrl( 'text', __( 'Terms', 'sidcraft-syntex' ), 'content', $f, array( 'condition' => $is_posts, 'placeholder' => 'news, 12, featured', 'description' => __( 'Comma separated term slugs or IDs.', 'sidcraft-syntex' ) ) ),
			'terms_operator'  => $this->ctrl( 'select', __( 'Match', 'sidcraft-syntex' ), 'content', $f, array( 'condition' => $is_posts, 'options' => array( 'IN' => __( 'Any of the terms', 'sidcraft-syntex' ), 'AND' => __( 'All of the terms', 'sidcraft-syntex' ), 'NOT IN' => __( 'None of the terms', 'sidcraft-syntex' ) ) ) ),
			'include'         => $this->ctrl( 'text', __( 'Include IDs', 'sidcraft-syntex' ), 'content', $f, array( 'placeholder' => '12, 45, 78' ) ),
			'exclude'         => $this->ctrl( 'text', __( 'Exclude IDs', 'sidcraft-syntex' ), 'content', $f, array( 'placeholder' => '3, 9' ) ), // phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- Loop setting key (comma-separated IDs chosen in the editor), not a get_posts() argument; Query::posts_args() applies it with a bounded post__not_in.
			'author'          => $this->ctrl( 'text', __( 'Author IDs', 'sidcraft-syntex' ), 'content', $f, array( 'condition' => $is_posts ) ),
			'exclude_current' => $this->ctrl( 'switch', __( 'Exclude current post', 'sidcraft-syntex' ), 'content', $f, array( 'condition' => $is_posts ) ),
			'ignore_sticky'   => $this->ctrl( 'switch', __( 'Ignore sticky posts', 'sidcraft-syntex' ), 'content', $f, array( 'condition' => $is_posts ) ),
			'hide_empty'      => $this->ctrl( 'switch', __( 'Hide empty terms', 'sidcraft-syntex' ), 'content', $f, array( 'condition' => array( 'query_type' => 'terms' ) ) ),
			'empty_mode'      => $this->ctrl( 'select', __( 'When nothing is found', 'sidcraft-syntex' ), 'content', $e, array( 'options' => array( 'message' => __( 'Show a message', 'sidcraft-syntex' ), 'hide' => __( 'Hide the loop', 'sidcraft-syntex' ) ) ) ),
			'empty_message'   => $this->ctrl( 'text', __( 'Empty Message', 'sidcraft-syntex' ), 'content', $e, array( 'condition' => array( 'empty_mode' => 'message' ) ) ),
			'pagination'      => $this->ctrl( 'select', __( 'Pagination', 'sidcraft-syntex' ), 'content', $e, array( 'condition' => $is_posts, 'options' => array( 'none' => __( 'None', 'sidcraft-syntex' ), 'numbers' => __( 'Numbers', 'sidcraft-syntex' ), 'prev_next' => __( 'Previous / Next', 'sidcraft-syntex' ) ) ) ),
			'tag'             => $this->tag_control( __( 'Element', 'sidcraft-syntex' ) ),
		);
	}

	protected function inner( array $s, $children ) {
		unset( $s, $children );
		return '';
	}

	public function render( $settings, $children = '' ) {
		unset( $settings, $children );
		return '';
	}

	/**
	 * True when Sidcraft Syntex Pro supplies the loop engine.
	 *
	 * @return bool
	 */
	public static function engine() {
		return (bool) apply_filters( 'sidcraft-syntex/xeditor/loop_engine', false );
	}

	/**
	 * Query settings in the shape SidcraftSyntex\Query\Query::run() expects.
	 *
	 * @param array $s
	 * @return array
	 */
	public static function query_settings( array $s ) {
		return array(
			'query_type'      => ( $s['query_type'] ?? 'posts' ) === 'terms' ? 'terms' : 'posts',
			'source'          => (string) ( $s['source'] ?? 'custom' ),
			'post_type'       => (string) ( $s['post_type'] ?? 'post' ),
			'posts_per_page'  => max( 1, min( 100, absint( $s['posts_per_page'] ?? 6 ) ) ),
			'offset'          => absint( $s['offset'] ?? 0 ),
			'orderby'         => (string) ( $s['orderby'] ?? 'date' ),
			'order'           => strtoupper( (string) ( $s['order'] ?? 'DESC' ) ) === 'ASC' ? 'ASC' : 'DESC',
			'taxonomy'        => (string) ( $s['taxonomy'] ?? '' ),
			'terms'           => (string) ( $s['terms'] ?? '' ),
			'terms_operator'  => (string) ( $s['terms_operator'] ?? 'IN' ),
			'include'         => (string) ( $s['include'] ?? '' ),
			'exclude'         => (string) ( $s['exclude'] ?? '' ), // phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- Loop setting key (comma-separated IDs chosen in the editor), not a get_posts() argument; Query::posts_args() applies it with a bounded post__not_in.
			'author'          => (string) ( $s['author'] ?? '' ),
			'exclude_current' => ! empty( $s['exclude_current'] ),
			'ignore_sticky'   => ! empty( $s['ignore_sticky'] ),
			'hide_empty'      => ! isset( $s['hide_empty'] ) || ! empty( $s['hide_empty'] ),
			'terms_orderby'   => in_array( $s['orderby'] ?? '', array( 'title', 'date' ), true ) ? 'name' : 'count',
		);
	}
}

class XEditorLoopLayoutUnit extends XEditorElement {
	public function type() {
		return 'xe_loop_layout';
	}

	public function title() {
		return __( 'Loop Layout', 'sidcraft-syntex' );
	}

	public function icon() {
		return "\u{25A6}";
	}

	public function source() {
		return 'pro';
	}

	public function supports_children() {
		return true;
	}

	protected function tags() {
		return array( 'div', 'ul', 'ol' );
	}

	public function defaults() {
		return array(
			'tag'     => 'div',
			'layout'  => 'grid',
			'columns' => array(
				'desktop' => '3',
				'tablet'  => '2',
				'mobile'  => '1',
			),
			'gap'     => '24px',
			'row_gap' => '',
		);
	}

	protected function own_controls() {
		$sec  = __( 'Layout', 'sidcraft-syntex' );
		$wrap = self::LOCAL;
		return array(
			'layout'  => $this->ctrl( 'choose', __( 'Layout', 'sidcraft-syntex' ), 'content', $sec, array( 'options' => array( 'grid' => __( 'Grid', 'sidcraft-syntex' ), 'list' => __( 'List', 'sidcraft-syntex' ), 'masonry' => __( 'Masonry', 'sidcraft-syntex' ) ) ) ),
			'columns' => $this->ctrl( 'number', __( 'Columns', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'condition' => array( 'layout' => array( 'grid', 'masonry' ) ), 'range' => array( 'min' => 1, 'max' => 8, 'step' => 1 ), 'selectors' => array( $wrap => '--xe-loop-cols: {{RAW}};' ) ) ),
			'gap'     => $this->ctrl( 'slider', __( 'Column Gap', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'units' => array( 'px', 'em', 'rem', '%' ), 'range' => array( 'min' => 0, 'max' => 120 ), 'selectors' => array( $wrap => '--xe-loop-gap: {{VALUE}};' ) ) ),
			'row_gap' => $this->ctrl( 'slider', __( 'Row Gap', 'sidcraft-syntex' ), 'content', $sec, array( 'responsive' => true, 'units' => array( 'px', 'em', 'rem' ), 'range' => array( 'min' => 0, 'max' => 120 ), 'selectors' => array( $wrap => '--xe-loop-row-gap: {{VALUE}};' ) ) ),
			'tag'     => $this->tag_control( __( 'Element', 'sidcraft-syntex' ) ),
		);
	}

	/**
	 * @param array $s
	 * @return string
	 */
	public static function mode( array $s ) {
		$m = (string) ( $s['layout'] ?? 'grid' );
		return in_array( $m, array( 'grid', 'list', 'masonry' ), true ) ? $m : 'grid';
	}

	protected function element_classes( array $s ) {
		return parent::element_classes( $s ) . ' xe-loop-layout--' . self::mode( $s );
	}

	protected function root_attrs( array $s ) {
		return ' data-xe-layout="' . esc_attr( self::mode( $s ) ) . '"';
	}

	protected function inner( array $s, $children ) {
		unset( $s );
		return $children;
	}

	public function render( $settings, $children = '' ) {
		return XEditorLoopUnit::engine() ? parent::render( $settings, $children ) : '';
	}
}

class XEditorLoopItemUnit extends XEditorElement {
	public function type() {
		return 'xe_loop_item';
	}

	public function title() {
		return __( 'Loop Item', 'sidcraft-syntex' );
	}

	public function icon() {
		return "\u{25A3}";
	}

	public function source() {
		return 'pro';
	}

	public function supports_children() {
		return true;
	}

	protected function tags() {
		return array( 'article', 'div', 'li' );
	}

	public function defaults() {
		return array( 'tag' => 'article' );
	}

	protected function own_controls() {
		return array(
			'tag' => $this->tag_control( __( 'Item Template', 'sidcraft-syntex' ) ),
		);
	}

	protected function inner( array $s, $children ) {
		unset( $s );
		return $children;
	}

	public function render( $settings, $children = '' ) {
		return XEditorLoopUnit::engine() ? parent::render( $settings, $children ) : '';
	}
}
