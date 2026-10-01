<?php
namespace SidcraftSyntex\Units;

use SidcraftSyntex\Templates\SavedTemplates;
use SidcraftSyntex\Templates\TemplateEmbed;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Template widget: insert a saved Sidcraft Syntex template into the canvas.
 */
class Template extends Unit {
	public function type() {
		return 'template';
	}
	public function title() {
		return __( 'Template', 'sidcraft-syntex' );
	}
	public function icon() {
		return "\u{25A3}";
	}
	public function category() {
		return 'advanced';
	}
	public function keywords() {
		return array( 'template', 'saved', 'section', 'library', 'embed', 'shortcode' );
	}

	public function defaults() {
		return array(
			'template_id' => 0,
		);
	}

	public function controls() {
		$tpl = __( 'Template', 'sidcraft-syntex' );
		return array(
			'template_id' => $this->ctrl( 'select', __( 'Saved Template', 'sidcraft-syntex' ), 'content', $tpl, array(
				'options'     => self::template_options(),
				'description' => __( 'Choose a saved template to embed. CSS and scripts for that template are loaded automatically.', 'sidcraft-syntex' ),
			) ),
		);
	}

	public function render( $s, $children = '' ) {
		$id = absint( $s['template_id'] ?? 0 );
		if ( ! $id ) {
			return '<div class="' . $this->cls( $s ) . ' lb-template-widget"><div class="lb-embed-placeholder">' . esc_html__( 'Select a saved template', 'sidcraft-syntex' ) . '</div></div>';
		}
		return '<div class="' . $this->cls( $s ) . ' lb-template-widget"><div class="lb-embed-placeholder">' . esc_html__( 'Template', 'sidcraft-syntex' ) . '</div></div>';
	}

	/**
	 * Render the saved template inside this node (frontend).
	 *
	 * @param array $s
	 * @param array $node
	 * @param int   $document_id
	 * @return string
	 */
	public function render_embed( $s, $node, $document_id = 0 ) {
		$s             = is_array( $s ) ? $s : array();
		$node          = is_array( $node ) ? $node : array();
		$template_id   = absint( $s['template_id'] ?? 0 );
		$host_id       = preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) ( $node['id'] ?? '' ) );
		$document_id   = absint( $document_id );
		if ( ! $template_id ) {
			return '<div class="' . $this->cls( $s ) . ' lb-template-widget"><div class="lb-embed-placeholder">' . esc_html__( 'Select a saved template', 'sidcraft-syntex' ) . '</div></div>';
		}
		$html = '';
		if ( class_exists( TemplateEmbed::class ) ) {
			$html = TemplateEmbed::render_inside( $template_id, $host_id, $document_id );
		}
		if ( $html === '' ) {
			return '<div class="' . $this->cls( $s ) . ' lb-template-widget"><div class="lb-embed-placeholder">' . esc_html__( 'Template not found', 'sidcraft-syntex' ) . '</div></div>';
		}
		return '<div class="' . $this->cls( $s ) . ' lb-template-widget" data-lb-template="' . esc_attr( (string) $template_id ) . '">' . $html . '</div>';
	}

	public function style_css( $id, $settings ) {
		$template_id = absint( $settings['template_id'] ?? 0 );
		if ( ! $template_id || ! class_exists( TemplateEmbed::class ) ) {
			return '';
		}
		return TemplateEmbed::host_css( $template_id, $id );
	}

	private static function template_options() {
		if ( class_exists( SavedTemplates::class ) && method_exists( SavedTemplates::class, 'select_options' ) ) {
			return SavedTemplates::select_options();
		}
		$opts = array( '0' => __( 'Select a template', 'sidcraft-syntex' ) );
		if ( ! function_exists( 'get_posts' ) ) {
			return $opts;
		}
		$posts = get_posts(
			array(
				'post_type'              => 'sidsyn_template',
				'post_status'            => 'publish',
				'posts_per_page'         => 100,
				'orderby'                => 'title',
				'order'                  => 'ASC',
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
				'lazy_load_term_meta'    => false,
			)
		);
		foreach ( (array) $posts as $p ) {
			if ( ! $p || empty( $p->ID ) ) {
				continue;
			}
			$label = $p->post_title !== '' ? $p->post_title : ( '#' . $p->ID );
			$opts[ (string) $p->ID ] = $label;
		}
		return $opts;
	}
}
