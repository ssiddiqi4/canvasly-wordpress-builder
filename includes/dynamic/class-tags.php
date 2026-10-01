<?php
namespace SidcraftPageBuilder\Dynamic;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( __NAMESPACE__ . '\\Tag', false ) ) {
	$sidcraft_page_builder_tag_file = __DIR__ . '/class-tag.php';
	if ( is_readable( $sidcraft_page_builder_tag_file ) ) {
		require_once $sidcraft_page_builder_tag_file;
	}
}

/**
 * Dynamic tag registry.
 *
 * Fire `sidcraft-page-builder/dynamic_tags/register` with this instance after built-ins are loaded.
 * Add-ons call `$tags->register( array|Tag )` / `$tags->unregister( $name )`.
 */
class Tags {
	const CATEGORIES = array( 'text', 'url', 'image', 'number', 'color', 'html' );

	/** @var self|null */
	private static $i;
	/** @var array<string,Tag> */
	private $tags = array();
	private $booted = false;

	public static function instance() {
		if ( ! self::$i ) {
			self::$i = new self();
		}
		return self::$i;
	}

	/** Reset between tests. */
	public static function reset() {
		self::$i = null;
	}

	/** Built-ins + add-on hook. Safe to call more than once. */
	public function boot() {
		if ( $this->booted ) {
			return $this;
		}
		$this->booted = true;
		if ( class_exists( Builtin::class ) ) {
			Builtin::register( $this );
		}
		if ( function_exists( 'do_action' ) ) {
			do_action( 'sidcraft-page-builder/dynamic_tags/register', $this );
		}
		return $this;
	}

	public static function ready() {
		$i = self::instance();
		if ( ! $i->booted ) {
			$i->boot();
		}
		return $i;
	}

	/**
	 * @param Tag|array $tag
	 * @return bool
	 */
	public function register( $tag ) {
		if ( is_array( $tag ) ) {
			if ( ! class_exists( __NAMESPACE__ . '\\Tag', false ) ) {
				$sidsyn_tag_file = __DIR__ . '/class-tag.php';
				if ( is_readable( $sidsyn_tag_file ) ) {
					require_once $sidsyn_tag_file;
				}
			}
			if ( ! class_exists( __NAMESPACE__ . '\\Tag', false ) ) {
				return false;
			}
			$tag = new Tag( $tag );
		}
		if ( ! $tag instanceof Tag ) {
			return false;
		}
		$name = $tag->name();
		if ( $name === '' ) {
			return false;
		}
		$this->tags[ $name ] = $tag;
		return true;
	}

	public function unregister( $name ) {
		$name = function_exists( 'sanitize_key' ) ? sanitize_key( (string) $name ) : strtolower( preg_replace( '/[^a-z0-9_]/i', '', (string) $name ) );
		if ( ! isset( $this->tags[ $name ] ) ) {
			return false;
		}
		unset( $this->tags[ $name ] );
		return true;
	}

	public function has( $name ) {
		$name = function_exists( 'sanitize_key' ) ? sanitize_key( (string) $name ) : strtolower( preg_replace( '/[^a-z0-9_]/i', '', (string) $name ) );
		return isset( $this->tags[ $name ] );
	}

	/** @return Tag|null */
	public function get( $name ) {
		$name = function_exists( 'sanitize_key' ) ? sanitize_key( (string) $name ) : strtolower( preg_replace( '/[^a-z0-9_]/i', '', (string) $name ) );
		return $this->tags[ $name ] ?? null;
	}

	/** @return array<string,Tag> */
	public function all() {
		return $this->tags;
	}

	/**
	 * Tags that overlap any of `$categories`.
	 *
	 * @param string[] $categories
	 * @return Tag[]
	 */
	public function by_categories( array $categories ) {
		$want = array();
		foreach ( $categories as $c ) {
			$c = function_exists( 'sanitize_key' ) ? sanitize_key( (string) $c ) : strtolower( (string) $c );
			if ( $c !== '' ) {
				$want[ $c ] = true;
			}
		}
		if ( ! $want ) {
			return array_values( $this->tags );
		}
		$out = array();
		foreach ( $this->tags as $tag ) {
			foreach ( $tag->categories() as $c ) {
				if ( isset( $want[ $c ] ) ) {
					$out[] = $tag;
					break;
				}
			}
		}
		return $out;
	}

	/** Group slug => label. */
	public function groups() {
		$groups = array(
			'post'    => function_exists( '__' ) ? __( 'Post', 'sidcraft-page-builder' ) : 'Post',
			'author'  => function_exists( '__' ) ? __( 'Author', 'sidcraft-page-builder' ) : 'Author',
			'site'    => function_exists( '__' ) ? __( 'Site', 'sidcraft-page-builder' ) : 'Site',
			'user'    => function_exists( '__' ) ? __( 'Current User', 'sidcraft-page-builder' ) : 'Current User',
			'archive' => function_exists( '__' ) ? __( 'Archive', 'sidcraft-page-builder' ) : 'Archive',
			'term'    => function_exists( '__' ) ? __( 'Term', 'sidcraft-page-builder' ) : 'Term',
			'advanced'=> function_exists( '__' ) ? __( 'Advanced', 'sidcraft-page-builder' ) : 'Advanced',
		);
		if ( function_exists( 'apply_filters' ) ) {
			$filtered = apply_filters( 'sidcraft-page-builder/dynamic_tags/groups', $groups );
			if ( is_array( $filtered ) ) {
				$groups = $filtered;
			}
		}
		return $groups;
	}

	public function category_labels() {
		return array(
			'text'   => function_exists( '__' ) ? __( 'Text', 'sidcraft-page-builder' ) : 'Text',
			'url'    => function_exists( '__' ) ? __( 'URL', 'sidcraft-page-builder' ) : 'URL',
			'image'  => function_exists( '__' ) ? __( 'Image', 'sidcraft-page-builder' ) : 'Image',
			'number' => function_exists( '__' ) ? __( 'Number', 'sidcraft-page-builder' ) : 'Number',
			'color'  => function_exists( '__' ) ? __( 'Color', 'sidcraft-page-builder' ) : 'Color',
			'html'   => function_exists( '__' ) ? __( 'HTML', 'sidcraft-page-builder' ) : 'HTML',
		);
	}

	/**
	 * Editor payload: tags, groups, category labels, default-setting previews.
	 *
	 * @param int $post_id
	 * @return array
	 */
	public function export( $post_id = 0 ) {
		$tags = array();
		foreach ( $this->tags as $tag ) {
			$tags[] = $tag->export();
		}
		$ctx = Resolver::context( (int) $post_id, true );
		$previews = array();
		foreach ( $this->tags as $name => $tag ) {
			$previews[ $name ] = Resolver::preview_string( $tag->preview( array(), $ctx ) );
		}
		return array(
			'tags'       => $tags,
			'groups'     => $this->groups(),
			'categories' => $this->category_labels(),
			'previews'   => $previews,
		);
	}
}
