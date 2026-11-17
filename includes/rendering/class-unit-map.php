<?php
/**
 * Cached unit map per post: the unit types a document uses (including nested
 * containers, embedded templates, loop item templates and components) and the
 * script and style handles they need.
 *
 * Walking a large page asks every unit for its handles and costs milliseconds
 * on every view (about 18 ms for 1,000 units). The map is built once and kept
 * in post meta, which WordPress already loads with the post (no extra query),
 * and in the object cache when the site has a persistent one. Transients are
 * not used: without an object cache they are extra rows in wp_options.
 *
 * A map is valid while its signature matches: Sidcraft Page Builder (and Pro)
 * version, the registered unit types, whether per-unit CSS is on, and a
 * revision number that changes whenever any template or component is saved
 * (a page's map includes the templates it embeds). Saving the page itself
 * deletes its map (Performance::invalidate).
 *
 * The map lists the assets of every unit in the document, including units
 * that display conditions may hide for some visitors, so one map serves every
 * visitor; a hidden unit at most loads its small CSS file.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Rendering;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class UnitMap {
	const META   = '_sidcraft_unit_map';
	const GROUP  = 'sidcraft_unit_map';
	const REV    = 'sidcraft_page_builder_unit_map_rev';

	/** @var array<int,array> Maps read this request. */
	private static $runtime = array();

	/** @var string|null */
	private static $signature = null;

	/** Forget per-request state (tests). */
	public static function reset_runtime() {
		self::$runtime   = array();
		self::$signature = null;
	}

	/**
	 * Assets for a post's document: from the cache, or walked once and stored.
	 *
	 * @param int   $post_id
	 * @param array $nodes The post's visible nodes (header, root, footer).
	 * @return array{scripts:string[],styles:string[],types:string[]}
	 */
	public static function assets( $post_id, array $nodes ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || ! self::cacheable( $post_id ) ) {
			return FrontendAssets::collect_all( $nodes, $post_id );
		}
		$sig = self::signature();
		if ( isset( self::$runtime[ $post_id ] ) && self::$runtime[ $post_id ]['sig'] === $sig ) {
			return self::$runtime[ $post_id ]['assets'];
		}
		$row = function_exists( 'wp_cache_get' ) ? wp_cache_get( $post_id, self::GROUP ) : false;
		if ( ! self::valid( $row, $sig ) ) {
			$row = get_post_meta( $post_id, self::META, true );
			if ( ! self::valid( $row, $sig ) ) {
				$row = array(
					'sig'    => $sig,
					'assets' => FrontendAssets::collect_all( $nodes, $post_id ),
				);
				update_post_meta( $post_id, self::META, $row );
			}
			if ( function_exists( 'wp_cache_set' ) ) {
				wp_cache_set( $post_id, $row, self::GROUP );
			}
		}
		self::$runtime[ $post_id ] = $row;
		return $row['assets'];
	}

	/**
	 * @param mixed  $row
	 * @param string $sig
	 * @return bool
	 */
	private static function valid( $row, $sig ) {
		return is_array( $row ) && ( $row['sig'] ?? '' ) === $sig && is_array( $row['assets'] ?? null ) && isset( $row['assets']['scripts'], $row['assets']['styles'] );
	}

	/**
	 * Previews and unsaved review copies are walked fresh, never stored.
	 *
	 * @param int $post_id
	 * @return bool
	 */
	private static function cacheable( $post_id ) {
		if ( function_exists( 'is_preview' ) && is_preview() ) {
			return false;
		}
		if ( class_exists( '\\SidcraftPageBuilder\\Document\\DocumentManager' ) && method_exists( '\\SidcraftPageBuilder\\Document\\DocumentManager', 'previewing' ) && \SidcraftPageBuilder\Document\DocumentManager::previewing( $post_id ) ) {
			return false;
		}
		/**
		 * Filters whether a post's unit map is cached.
		 *
		 * @param bool $cache
		 * @param int  $post_id
		 */
		return (bool) apply_filters( 'sidcraft_page_builder_cache_unit_map', true, $post_id );
	}

	/**
	 * @return string
	 */
	public static function signature() {
		if ( null !== self::$signature ) {
			return self::$signature;
		}
		$types = array();
		if ( class_exists( '\\SidcraftPageBuilder\\Units\\UnitRegistry' ) ) {
			$types = array_keys( (array) \SidcraftPageBuilder\Units\UnitRegistry::instance()->all() );
		}
		$parts = array(
			defined( 'SIDCRAFT_PAGE_BUILDER_VERSION' ) ? SIDCRAFT_PAGE_BUILDER_VERSION : '',
			defined( 'SIDCRAFT_BUILDER_PRO_VERSION' ) ? SIDCRAFT_BUILDER_PRO_VERSION : '',
			self::rev(),
			StyleChunks::enabled() ? 'split' : 'full',
			md5( implode( ',', $types ) ),
		);
		/**
		 * Filters the parts of the unit map signature. Add an entry for
		 * anything that changes which assets units ask for.
		 *
		 * @param string[] $parts
		 */
		$parts = (array) apply_filters( 'sidcraft_page_builder_unit_map_signature', $parts );
		return self::$signature = md5( implode( '|', array_map( 'strval', $parts ) ) );
	}

	/**
	 * The revision, stored (autoloaded) on first use: a missing option is a
	 * database query on every request.
	 *
	 * @return string
	 */
	private static function rev() {
		$rev = get_option( self::REV, false );
		if ( false === $rev ) {
			add_option( self::REV, '0', '', true );
			$rev = '0';
		}
		return (string) $rev;
	}

	/**
	 * Delete a post's map (after its document is saved).
	 *
	 * @param int $post_id
	 * @return void
	 */
	public static function forget( $post_id ) {
		$post_id = absint( $post_id );
		if ( ! $post_id ) {
			return;
		}
		unset( self::$runtime[ $post_id ] );
		delete_post_meta( $post_id, self::META );
		if ( function_exists( 'wp_cache_delete' ) ) {
			wp_cache_delete( $post_id, self::GROUP );
		}
		// Pages embed templates and components: a change to one makes every map stale.
		if ( in_array( get_post_type( $post_id ), array( 'sidsyn_template', 'sidsyn_component' ), true ) ) {
			self::bump();
		}
	}

	/**
	 * Make every stored map stale (they rebuild on their next view).
	 *
	 * @return void
	 */
	public static function bump() {
		update_option( self::REV, (string) ( (int) get_option( self::REV, '0' ) + 1 ), true );
		self::$signature = null;
		self::$runtime   = array();
	}

	/**
	 * @return void
	 */
	public static function register_hooks() {
		add_action( 'save_post_sidsyn_template', array( self::class, 'bump' ) );
		add_action( 'save_post_sidsyn_component', array( self::class, 'bump' ) );
		add_action( 'deleted_post', array( self::class, 'on_deleted' ), 10, 2 );
	}

	/**
	 * @param int      $post_id
	 * @param \WP_Post $post
	 * @return void
	 */
	public static function on_deleted( $post_id, $post = null ) {
		if ( $post && in_array( $post->post_type ?? '', array( 'sidsyn_template', 'sidsyn_component' ), true ) ) {
			self::bump();
		}
	}
}
