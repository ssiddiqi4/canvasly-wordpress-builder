<?php
/**
 * Readable fallback HTML in post_content.
 *
 * A Sidcraft Page Builder layout lives in post meta (`_sidsyn_document_data`).
 * WordPress itself only knows post_content, so if the builder is switched off
 * the page would show whatever post_content held before. On every save that
 * changes the layout, a clean, semantic copy of the rendered page is written
 * to post_content: headings, paragraphs, links, images, lists, tables and
 * quotes, with no builder classes, inline styles, scripts or forms.
 *
 * While the builder is active the_content still renders the live layout, so
 * visitors never see the fallback. Search, feeds, excerpts, SEO plugins, the
 * REST API and other editors read real content instead of an empty page.
 *
 * The copy is stored as core blocks (headings, paragraphs, lists,
 * separators; anything else as a Custom HTML block), so with the builder
 * off the page opens in the WordPress block editor as ordinary, editable
 * content. A hash of the layout is kept in post meta, so an unchanged layout
 * is never rendered or written twice. The post_content a page had before its
 * first fallback write is kept once in `_sidsyn_original_content`.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Document;

use SidcraftPageBuilder\Rendering\FrontendRenderer;
use SidcraftPageBuilder\Rendering\OutputEscape;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class FallbackContent {

	const OPTION        = 'sidcraft_page_builder_fallback_content';
	const ORIGINAL_META = '_sidsyn_original_content';
	/** Hash of the layout the stored copy was made from. */
	const HASH_META = '_sidsyn_fallback_hash';
	/** md5 of the post_content written, to tell our copy from later edits. */
	const CONTENT_META = '_sidsyn_fallback_md5';

	/** Post types that hold builder parts, never a public page. */
	const SKIP_TYPES = array( 'sidsyn_template', 'sidsyn_component', 'sidsyn_global_class', 'elementor_library', 'revision', 'attachment' );

	/** @var bool Re-entrancy guard: rendering can run shortcodes that save posts. */
	private static $busy = false;

	/**
	 * Whether the feature is on for the site (Settings → Advanced). Default on.
	 *
	 * @return bool
	 */
	public static function site_enabled() {
		return (string) get_option( self::OPTION, '1' ) !== '0';
	}

	/**
	 * Whether post `$id` should carry a fallback copy.
	 *
	 * @param int $id
	 * @return bool
	 */
	public static function applies( $id ) {
		$id   = absint( $id );
		$post = $id ? get_post( $id ) : null;
		if ( ! $post || ! self::site_enabled() ) {
			return false;
		}
		$type = (string) $post->post_type;
		$ok   = ! in_array( $type, self::SKIP_TYPES, true );
		if ( $ok && class_exists( Documents::class ) && method_exists( Documents::class, 'supports' ) ) {
			$ok = Documents::supports( $type );
		}
		/**
		 * Filter whether a document writes readable fallback HTML to post_content.
		 *
		 * @param bool     $ok
		 * @param \WP_Post $post
		 */
		return (bool) apply_filters( 'sidcraft_page_builder_fallback_content_enabled', $ok, $post );
	}

	/**
	 * Hash a document the same way for every caller.
	 *
	 * @param array $doc
	 * @return string
	 */
	public static function doc_hash( $doc ) {
		return DocumentManager::canonical_hash( is_array( $doc ) ? $doc : array() );
	}

	/**
	 * Whether post_content is still the copy this class wrote last.
	 *
	 * @param int    $id
	 * @param string $content
	 * @return bool
	 */
	public static function is_ours( $id, $content ) {
		$md5 = (string) get_post_meta( $id, self::CONTENT_META, true );
		return $md5 !== '' && hash_equals( $md5, md5( (string) $content ) );
	}

	/**
	 * Write the fallback block when the layout changed since the last write.
	 *
	 * @param int   $id
	 * @param array $doc  Sanitized document.
	 * @param bool   $force Rewrite even when the stored hash matches.
	 * @param string $hash  Canonical layout hash, when the caller has it.
	 * @return string 'written', 'unchanged', 'skipped' or 'failed'.
	 */
	public static function sync( $id, $doc, $force = false, $hash = '' ) {
		$id = absint( $id );
		if ( self::$busy || ! $id || ! self::applies( $id ) ) {
			return 'skipped';
		}
		$post = get_post( $id );
		if ( ! $post ) {
			return 'skipped';
		}
		$hash    = $hash !== '' ? $hash : self::doc_hash( $doc );
		$current = (string) $post->post_content;
		$ours    = self::is_ours( $id, $current );
		if ( ! $force && $ours && (string) get_post_meta( $id, self::HASH_META, true ) === $hash ) {
			return 'unchanged';
		}
		self::$busy = true;
		try {
			$block = self::to_blocks( self::build( $id, $doc ) );
		} catch ( \Throwable $e ) {
			self::$busy = false;
			if ( class_exists( '\\SidcraftPageBuilder\\Log\\Logger' ) ) {
				\SidcraftPageBuilder\Log\Logger::log( 'error', 'Fallback content render failed for post ' . $id . ': ' . $e->getMessage() );
			}
			return 'failed';
		}
		self::$busy = false;
		update_post_meta( $id, self::HASH_META, $hash );
		if ( $block === $current ) {
			update_post_meta( $id, self::CONTENT_META, md5( $block ) );
			return 'unchanged';
		}
		// Keep whatever the page held before its first fallback write, once.
		if ( ! $ours && ! metadata_exists( 'post', $id, self::ORIGINAL_META ) ) {
			add_post_meta( $id, self::ORIGINAL_META, wp_slash( $current ), true );
		}
		self::write( $id, $block );
		update_post_meta( $id, self::CONTENT_META, md5( $block ) );
		return 'written';
	}

	/**
	 * Store post_content directly. wp_update_post() would fire save_post on
	 * every builder save and make WordPress add a second revision; the
	 * builder's own revision, recorded right after this, already captures
	 * the new post_content. The HTML was already reduced to a strict
	 * allowlist by clean(), so no further kses pass is needed.
	 *
	 * @param int    $id
	 * @param string $content
	 */
	private static function write( $id, $content ) {
		global $wpdb;
		$wpdb->update( $wpdb->posts, array( 'post_content' => $content ), array( 'ID' => $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		clean_post_cache( $id );
		/**
		 * Fires after fallback HTML was written to post_content.
		 *
		 * @param int    $id
		 * @param string $content
		 */
		do_action( 'sidcraft_page_builder_fallback_content_written', $id, $content );
	}

	/**
	 * Render the document and reduce it to clean HTML.
	 *
	 * @param int   $id
	 * @param array $doc
	 * @return string
	 */
	public static function build( $id, $doc ) {
		$prev_post = $GLOBALS['post'] ?? null;
		$post      = get_post( $id );
		if ( $post ) {
			$GLOBALS['post'] = $post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			setup_postdata( $post );
		}
		try {
			$render = function () use ( $doc, $id ) {
				return FrontendRenderer::render_document( $doc, $id );
			};
			$html = class_exists( OutputEscape::class ) ? OutputEscape::render( $render ) : $render();
		} finally {
			$GLOBALS['post'] = $prev_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			if ( $prev_post ) {
				setup_postdata( $prev_post );
			} else {
				wp_reset_postdata();
			}
		}
		return self::clean( (string) $html );
	}

	/**
	 * Tags kept in the fallback copy. No class, id, style or data attributes.
	 *
	 * @return array<string,array<string,bool>>
	 */
	public static function allowed_html() {
		$cell = array(
			'colspan' => true,
			'rowspan' => true,
			'scope'   => true,
		);
		return array(
			'h1'         => array(),
			'h2'         => array(),
			'h3'         => array(),
			'h4'         => array(),
			'h5'         => array(),
			'h6'         => array(),
			'p'          => array(),
			'br'         => array(),
			'hr'         => array(),
			'a'          => array(
				'href'  => true,
				'title' => true,
				'rel'   => true,
			),
			'img'        => array(
				'src'    => true,
				'alt'    => true,
				'width'  => true,
				'height' => true,
			),
			'figure'     => array(),
			'figcaption' => array(),
			'ul'         => array(),
			'ol'         => array(),
			'li'         => array(),
			'dl'         => array(),
			'dt'         => array(),
			'dd'         => array(),
			'blockquote' => array( 'cite' => true ),
			'cite'       => array(),
			'q'          => array(),
			'table'      => array(),
			'caption'    => array(),
			'thead'      => array(),
			'tbody'      => array(),
			'tfoot'      => array(),
			'tr'         => array(),
			'th'         => $cell,
			'td'         => $cell,
			'strong'     => array(),
			'b'          => array(),
			'em'         => array(),
			'i'          => array(),
			'u'          => array(),
			's'          => array(),
			'mark'       => array(),
			'small'      => array(),
			'sub'        => array(),
			'sup'        => array(),
			'code'       => array(),
			'pre'        => array(),
			'kbd'        => array(),
			'abbr'       => array( 'title' => true ),
			'time'       => array( 'datetime' => true ),
			'address'    => array(),
		);
	}

	/** Elements dropped with everything inside them. */
	const DROP = array( 'script', 'style', 'noscript', 'template', 'svg', 'form', 'button', 'select', 'textarea', 'input', 'iframe', 'object', 'embed', 'canvas', 'video', 'audio', 'source', 'track', 'dialog', 'link', 'meta', 'head', 'title' );

	/** Kept tags that start a new block. */
	const BLOCKS = array( 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'dl', 'table', 'blockquote', 'figure', 'pre', 'hr', 'address' );

	/** Classes whose element is helper markup, not page content. */
	const DROP_CLASSES = array( 'lb-convert-unmapped', 'screen-reader-text', 'sr-only', 'lb-sr-only', 'lb-editor-only', 'lb-node-toolbar' );

	/**
	 * Reduce rendered builder HTML to readable, semantic markup.
	 *
	 * Wrapper elements (div, section, span, nav…) are unwrapped; loose text
	 * between blocks becomes a paragraph; only the tags in allowed_html()
	 * survive, with only their listed attributes.
	 *
	 * @param string $html
	 * @return string
	 */
	public static function clean( $html ) {
		$html = (string) $html;
		if ( trim( $html ) === '' ) {
			return '';
		}
		if ( ! class_exists( '\\DOMDocument' ) ) {
			return trim( wp_kses( $html, self::allowed_html() ) );
		}
		$dom  = new \DOMDocument();
		$prev = libxml_use_internal_errors( true );
		$dom->loadHTML( '<?xml encoding="UTF-8"><html><body><div id="sidsyn-fallback-root">' . $html . '</div></body></html>', LIBXML_NONET );
		libxml_clear_errors();
		libxml_use_internal_errors( $prev );
		$root = $dom->getElementById( 'sidsyn-fallback-root' );
		if ( ! $root ) {
			return trim( wp_kses( $html, self::allowed_html() ) );
		}
		$blocks = array();
		foreach ( self::blocks( $root ) as $b ) {
			$b = trim( wp_kses( $b, self::allowed_html() ) );
			if ( $b !== '' ) {
				$blocks[] = $b;
			}
		}
		// One top-level element per line; to_blocks() relies on it.
		$out = implode( "\n", $blocks );
		/**
		 * Filter the cleaned fallback HTML before it is stored.
		 *
		 * @param string $out
		 * @param string $html Rendered builder HTML.
		 */
		$filtered = apply_filters( 'sidcraft_page_builder_fallback_content_html', $out, $html );
		return is_string( $filtered ) ? trim( $filtered ) : trim( $out );
	}

	/**
	 * @param \DOMNode $node
	 * @return bool
	 */
	private static function dropped( $node ) {
		if ( ! $node instanceof \DOMElement ) {
			return $node instanceof \DOMComment;
		}
		$tag = strtolower( $node->nodeName );
		if ( in_array( $tag, self::DROP, true ) ) {
			return true;
		}
		// Decorative or duplicated markup (icons, carousel clones). Collapsed
		// tab and accordion panels use `hidden` and are real content, so stay.
		if ( $node->getAttribute( 'aria-hidden' ) === 'true' ) {
			return true;
		}
		$class = ' ' . $node->getAttribute( 'class' ) . ' ';
		foreach ( self::DROP_CLASSES as $c ) {
			if ( strpos( $class, ' ' . $c . ' ' ) !== false ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Whether a subtree holds a kept block-level tag.
	 *
	 * @param \DOMNode $node
	 * @return bool
	 */
	private static function has_block( $node ) {
		foreach ( $node->childNodes as $child ) {
			if ( ! $child instanceof \DOMElement || self::dropped( $child ) ) {
				continue;
			}
			$tag = strtolower( $child->nodeName );
			if ( in_array( $tag, self::BLOCKS, true ) || self::has_block( $child ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Flatten a container's children into a list of block HTML strings.
	 *
	 * @param \DOMNode $node
	 * @return string[]
	 */
	private static function blocks( $node ) {
		$allowed = self::allowed_html();
		$out     = array();
		$buffer  = '';
		$flush   = function () use ( &$buffer, &$out ) {
			$text = trim( preg_replace( '/\s+/u', ' ', $buffer ) );
			if ( $text !== '' && trim( wp_strip_all_tags( $text ) ) !== '' || preg_match( '/<img\b/i', $text ) ) {
				$out[] = '<p>' . $text . '</p>';
			}
			$buffer = '';
		};
		foreach ( $node->childNodes as $child ) {
			if ( $child instanceof \DOMText ) {
				$buffer .= esc_html( $child->nodeValue );
				continue;
			}
			if ( ! $child instanceof \DOMElement || self::dropped( $child ) ) {
				continue;
			}
			$tag = strtolower( $child->nodeName );
			if ( in_array( $tag, self::BLOCKS, true ) ) {
				$flush();
				$html = self::serialize( $child );
				if ( $tag === 'hr' || trim( wp_strip_all_tags( $html ) ) !== '' || preg_match( '/<img\b/i', $html ) ) {
					$out[] = $html;
				}
				continue;
			}
			if ( $tag === 'br' ) {
				$buffer .= '<br>';
				continue;
			}
			if ( ! isset( $allowed[ $tag ] ) || self::has_block( $child ) ) {
				// A wrapper (div, section, span…) or an inline tag around blocks.
				if ( self::has_block( $child ) || in_array( $tag, array( 'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'li', 'figure' ), true ) ) {
					$flush();
					$out = array_merge( $out, self::blocks( $child ) );
					continue;
				}
				$buffer .= ' ' . self::serialize_children( $child ) . ' ';
				continue;
			}
			$buffer .= self::serialize( $child );
		}
		$flush();
		return $out;
	}

	/**
	 * Serialize a kept element with its allowed attributes; unwrap anything else.
	 *
	 * @param \DOMElement $el
	 * @return string
	 */
	private static function serialize( $el ) {
		$allowed = self::allowed_html();
		$tag     = strtolower( $el->nodeName );
		if ( ! isset( $allowed[ $tag ] ) ) {
			return self::serialize_children( $el );
		}
		$attrs = '';
		foreach ( $allowed[ $tag ] as $name => $on ) {
			if ( ! $on || ! $el->hasAttribute( $name ) ) {
				continue;
			}
			$val = trim( (string) $el->getAttribute( $name ) );
			if ( in_array( $name, array( 'href', 'src', 'cite' ), true ) ) {
				if ( $name === 'src' && $el->hasAttribute( 'data-src' ) ) {
					$val = trim( (string) $el->getAttribute( 'data-src' ) );
				}
				$val = esc_url( $val );
				if ( $val === '' ) {
					continue;
				}
			}
			$attrs .= ' ' . $name . '="' . esc_attr( $val ) . '"';
		}
		if ( $tag === 'a' && ( strpos( $attrs, 'href=' ) === false || preg_match( '/href="(#|javascript:)/i', $attrs ) ) ) {
			// A link that only works with builder scripts keeps its text.
			return self::serialize_children( $el );
		}
		if ( $tag === 'img' ) {
			return strpos( $attrs, 'src=' ) !== false ? '<img' . $attrs . '>' : '';
		}
		if ( in_array( $tag, array( 'br', 'hr' ), true ) ) {
			return '<' . $tag . '>';
		}
		$structural = in_array( $tag, array( 'ul', 'ol', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'dl' ), true );
		$inner      = self::serialize_children( $el, $structural );
		if ( $tag === 'a' && trim( wp_strip_all_tags( $inner ) ) === '' && strpos( $inner, '<img' ) === false ) {
			return '';
		}
		if ( $structural && trim( $inner ) === '' ) {
			return '';
		}
		return '<' . $tag . $attrs . '>' . trim( (string) $inner ) . '</' . $tag . '>';
	}

	/**
	 * @param \DOMNode $node
	 * @param bool     $elements_only Skip text nodes (between list items or table rows).
	 * @return string
	 */
	private static function serialize_children( $node, $elements_only = false ) {
		$html = '';
		foreach ( $node->childNodes as $child ) {
			if ( $child instanceof \DOMText ) {
				if ( $elements_only ) {
					continue;
				}
				$html .= esc_html( preg_replace( '/\s+/u', ' ', $child->nodeValue ) );
			} elseif ( $child instanceof \DOMElement && ! self::dropped( $child ) ) {
				$html .= self::serialize( $child );
			}
		}
		return preg_replace( '/\s{2,}/', ' ', $html );
	}

	/**
	 * Wrap each top-level element of clean() output in core block markup.
	 *
	 * @param string $html One top-level element per line.
	 * @return string
	 */
	public static function to_blocks( $html ) {
		$out = array();
		foreach ( explode( "\n", (string) $html ) as $el ) {
			$el = trim( $el );
			if ( $el === '' ) {
				continue;
			}
			if ( preg_match( '#^<h([1-6])>(.*)</h\1>$#s', $el, $m ) ) {
				$attrs = $m[1] === '2' ? '' : ' {"level":' . $m[1] . '}';
				$out[] = '<!-- wp:heading' . $attrs . " -->\n<h" . $m[1] . ' class="wp-block-heading">' . $m[2] . '</h' . $m[1] . ">\n<!-- /wp:heading -->";
			} elseif ( preg_match( '#^<p>(.*)</p>$#s', $el, $m ) && strpos( $m[1], '<p>' ) === false ) {
				$out[] = "<!-- wp:paragraph -->\n<p>" . $m[1] . "</p>\n<!-- /wp:paragraph -->";
			} elseif ( preg_match( '#^<(ul|ol)>((?:<li>(?:(?!<li>|</li>|<ul|<ol|<p>|<h[1-6]|<table|<blockquote|<figure|<pre|<hr).)*</li>)+)</\1>$#s', $el, $m ) ) {
				$items = preg_split( '#</li>\s*#', substr( $m[2], 0, -5 ) );
				$lis   = '';
				foreach ( $items as $li ) {
					$lis .= "<!-- wp:list-item -->\n" . $li . "</li>\n<!-- /wp:list-item -->";
				}
				$ordered = $m[1] === 'ol';
				$out[]   = '<!-- wp:list' . ( $ordered ? ' {"ordered":true}' : '' ) . " -->\n<" . $m[1] . ' class="wp-block-list">' . $lis . '</' . $m[1] . ">\n<!-- /wp:list -->";
			} elseif ( $el === '<hr>' ) {
				$out[] = "<!-- wp:separator -->\n<hr class=\"wp-block-separator has-alpha-channel-opacity\"/>\n<!-- /wp:separator -->";
			} else {
				$out[] = "<!-- wp:html -->\n" . $el . "\n<!-- /wp:html -->";
			}
		}
		return implode( "\n\n", $out );
	}

	/**
	 * Restore the post_content a page had before its first fallback write.
	 *
	 * @param int $id
	 * @return bool
	 */
	public static function restore_original( $id ) {
		$id = absint( $id );
		if ( ! $id || ! metadata_exists( 'post', $id, self::ORIGINAL_META ) ) {
			return false;
		}
		self::write( $id, (string) get_post_meta( $id, self::ORIGINAL_META, true ) );
		delete_post_meta( $id, self::ORIGINAL_META );
		delete_post_meta( $id, self::HASH_META );
		delete_post_meta( $id, self::CONTENT_META );
		return true;
	}

	/**
	 * Write fallback copies for existing documents in bounded batches.
	 *
	 * @param int $offset
	 * @param int $limit
	 * @return array{processed:int,written:int,next:int,done:bool}
	 */
	public static function backfill( $offset = 0, $limit = 25 ) {
		global $wpdb;
		$limit = max( 1, min( 200, absint( $limit ) ) );
		$ids   = $wpdb->get_col( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$wpdb->prepare(
				"SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s AND post_id > %d ORDER BY post_id ASC LIMIT %d",
				DocumentManager::META,
				absint( $offset ),
				$limit
			)
		);
		$written = 0;
		$last    = absint( $offset );
		foreach ( (array) $ids as $pid ) {
			$pid  = absint( $pid );
			$last = $pid;
			if ( get_post_type( $pid ) === 'revision' ) {
				continue;
			}
			if ( self::sync( $pid, DocumentManager::get( $pid ) ) === 'written' ) {
				++$written;
			}
		}
		return array(
			'processed' => count( (array) $ids ),
			'written'   => $written,
			'next'      => $last,
			'done'      => count( (array) $ids ) < $limit,
		);
	}
}
