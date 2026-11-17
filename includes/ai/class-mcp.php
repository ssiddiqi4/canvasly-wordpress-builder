<?php
/**
 * Read-only MCP endpoint for Sidcraft Builder.
 *
 * POST /wp-json/sidcraft-page-builder/v1/mcp speaks the Model Context Protocol
 * (Streamable HTTP, JSON responses) using WordPress application passwords.
 *
 * This endpoint is the free tier: agents can read the site, the builder guide,
 * the document schema and pages. Everything that writes (content editing,
 * templates, design tokens, media, menus, components, WooCommerce, Sidcraft
 * Commerce, code) lives in Sidcraft Builder Pro and is served by its endpoint.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Ai;

use SidcraftPageBuilder\Document\DocumentManager;
use SidcraftPageBuilder\Document\Documents;
use SidcraftPageBuilder\Document\Schema;
use SidcraftPageBuilder\Settings\Breakpoints;
use SidcraftPageBuilder\Units\UnitRegistry;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Mcp {
	const NS       = 'sidcraft-page-builder/v1';
	const ROUTE    = '/mcp';
	const PREFIX   = 'sidcraft-';
	const VERSIONS = array( '2025-06-18', '2025-03-26', '2024-11-05' );
	const MAX_BATCH = 20;

	/**
	 * @return void
	 */
	public static function register_hooks() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	/**
	 * @return void
	 */
	public static function routes() {
		register_rest_route(
			self::NS,
			self::ROUTE,
			array(
				array(
					'methods'             => 'POST',
					'callback'            => array( __CLASS__, 'handle' ),
					'permission_callback' => array( __CLASS__, 'can_connect' ),
				),
				array(
					'methods'             => 'GET, DELETE',
					'callback'            => static function () {
						$res = new \WP_REST_Response( null, 405 );
						$res->header( 'Allow', 'POST' );
						return $res;
					},
					'permission_callback' => '__return_true',
				),
			)
		);
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return true|\WP_Error
	 */
	public static function can_connect( $request ) {
		$origin = (string) $request->get_header( 'origin' );
		if ( '' !== $origin && wp_parse_url( $origin, PHP_URL_HOST ) !== wp_parse_url( home_url(), PHP_URL_HOST ) ) {
			return new \WP_Error( 'rest_forbidden', __( 'Requests from other sites are not allowed.', 'sidcraft-page-builder' ), array( 'status' => 403 ) );
		}
		if ( ! is_user_logged_in() ) {
			return new \WP_Error( 'rest_not_logged_in', __( 'Sign in with an application password.', 'sidcraft-page-builder' ), array( 'status' => 401 ) );
		}
		if ( ! current_user_can( 'edit_pages' ) ) {
			return new \WP_Error( 'rest_forbidden', __( 'You cannot edit pages.', 'sidcraft-page-builder' ), array( 'status' => 403 ) );
		}
		return true;
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response
	 */
	public static function handle( $request ) {
		$body = json_decode( (string) $request->get_body(), true );
		if ( ! is_array( $body ) ) {
			return self::respond( self::error( null, -32700, 'Parse error' ) );
		}
		$batch = array_keys( $body ) === range( 0, count( $body ) - 1 ) && $body;
		$list  = $batch ? array_slice( $body, 0, self::MAX_BATCH ) : array( $body );
		$out   = array();
		foreach ( $list as $msg ) {
			$reply = self::dispatch( is_array( $msg ) ? $msg : array() );
			if ( null !== $reply ) {
				$out[] = $reply;
			}
		}
		if ( ! $out ) {
			return new \WP_REST_Response( null, 202 );
		}
		return self::respond( $batch ? $out : $out[0] );
	}

	/**
	 * @param array|object $payload
	 * @return \WP_REST_Response
	 */
	private static function respond( $payload ) {
		$res = new \WP_REST_Response( $payload, 200 );
		$res->header( 'Content-Type', 'application/json; charset=utf-8' );
		$res->header( 'Cache-Control', 'no-store' );
		return $res;
	}

	/**
	 * @param array $msg
	 * @return array|null
	 */
	public static function dispatch( array $msg ) {
		$has_id = array_key_exists( 'id', $msg );
		$id     = $has_id ? $msg['id'] : null;
		$method = isset( $msg['method'] ) && is_string( $msg['method'] ) ? $msg['method'] : '';
		if ( '' === $method ) {
			return isset( $msg['result'] ) || isset( $msg['error'] ) ? null : self::error( $id, -32600, 'Invalid Request' );
		}
		if ( ! $has_id ) {
			return null;
		}
		$params = isset( $msg['params'] ) && is_array( $msg['params'] ) ? $msg['params'] : array();
		switch ( $method ) {
			case 'initialize':
				return self::result( $id, self::initialize( $params ) );
			case 'ping':
				return self::result( $id, new \stdClass() );
			case 'tools/list':
				return self::result( $id, array( 'tools' => self::tool_list() ) );
			case 'tools/call':
				return self::result( $id, self::call_tool( $params ) );
			case 'resources/list':
				return self::result( $id, array( 'resources' => array() ) );
			case 'resources/templates/list':
				return self::result( $id, array( 'resourceTemplates' => array() ) );
		}
		return self::error( $id, -32601, 'Method not found' );
	}

	/**
	 * @param array $params
	 * @return array
	 */
	private static function initialize( array $params ) {
		$asked = (string) ( $params['protocolVersion'] ?? '' );
		return array(
			'protocolVersion' => in_array( $asked, self::VERSIONS, true ) ? $asked : self::VERSIONS[0],
			'capabilities'    => array(
				'tools'     => array( 'listChanged' => false ),
				'resources' => array( 'listChanged' => false ),
			),
			'serverInfo'      => array(
				'name'    => 'sidcraft-page-builder',
				'title'   => 'Sidcraft Builder',
				'version' => defined( 'SIDCRAFT_PAGE_BUILDER_VERSION' ) ? SIDCRAFT_PAGE_BUILDER_VERSION : '',
			),
			'instructions'    => 'Read-only access to Sidcraft Builder. Start with sidcraft-site-info, read sidcraft-builder-guide before reading content, and use sidcraft-content to list or read pages and their documents. '
				. 'Writing pages, templates, design tokens, media, menus, components, WooCommerce and Sidcraft Commerce needs Sidcraft Builder Pro and its endpoint at /wp-json/sidcraft-builder-pro/v1/mcp.',
		);
	}

	/**
	 * @return array[]
	 */
	private static function tool_list() {
		$out = array();
		foreach ( self::tools() as $slug => $tool ) {
			$schema = $tool['input'];
			if ( empty( $schema['properties'] ) ) {
				$schema['properties'] = new \stdClass();
			}
			$out[] = array(
				'name'        => self::PREFIX . $slug,
				'title'       => $tool['title'],
				'description' => $tool['description'],
				'inputSchema' => $schema,
				'annotations' => array(
					'title'           => $tool['title'],
					'readOnlyHint'    => true,
					'destructiveHint' => false,
					'idempotentHint'  => true,
					'openWorldHint'   => false,
				),
			);
		}
		return $out;
	}

	/**
	 * Read-only tool catalog.
	 *
	 * @return array[]
	 */
	public static function tools() {
		$id = array(
			'type'        => 'integer',
			'description' => 'Post ID.',
		);
		return array(
			'site-info'     => array(
				'title'       => 'Site information',
				'description' => 'WordPress, PHP, theme, Sidcraft Builder versions, the post types Sidcraft can edit and the configured breakpoints.',
				'input'       => self::object( array(), array() ),
			),
			'builder-guide' => array(
				'title'       => 'Sidcraft Builder guide',
				'description' => 'How the Sidcraft document format works: root/header/footer/settings, unit nodes, responsive settings, breakpoints and the editing workflow. Read this before editing.',
				'input'       => self::object(
					array(
						'include_units' => array(
							'type'        => 'boolean',
							'description' => 'Include the unit catalog (default true).',
						),
					),
					array()
				),
			),
			'schema'        => array(
				'title'       => 'Document schema',
				'description' => 'The published JSON Schema (document format 2.8) with every unit and its settings controls.',
				'input'       => self::object( array(), array() ),
			),
			'content'       => array(
				'title'       => 'Read content',
				'description' => 'List, search or read Sidcraft documents. Actions: list, search, get, get_settings. Read-only: editing needs Sidcraft Builder Pro.',
				'input'       => self::object(
					array(
						'action'    => array(
							'type' => 'string',
							'enum' => array( 'list', 'search', 'get', 'get_settings' ),
						),
						'post_type' => array(
							'type'        => 'string',
							'description' => 'Post type to list (default: the enabled Sidcraft types).',
						),
						'status'    => array(
							'type'        => 'string',
							'description' => 'Post status (default any).',
						),
						'search'    => array( 'type' => 'string' ),
						'per_page'  => array( 'type' => 'integer' ),
						'page'      => array( 'type' => 'integer' ),
						'post_id'   => $id,
					),
					array( 'action' )
				),
			),
		);
	}

	/**
	 * @param array $props
	 * @param array $required
	 * @return array
	 */
	private static function object( array $props, array $required ) {
		return array(
			'type'       => 'object',
			'properties' => $props,
			'required'   => $required,
		);
	}

	/**
	 * @param array $params
	 * @return array
	 */
	private static function call_tool( array $params ) {
		$name = (string) ( $params['name'] ?? '' );
		$args = isset( $params['arguments'] ) && is_array( $params['arguments'] ) ? $params['arguments'] : array();
		if ( 0 !== strpos( $name, self::PREFIX ) ) {
			return self::tool_error( __( 'Unknown tool.', 'sidcraft-page-builder' ) );
		}
		$res = self::call( substr( $name, strlen( self::PREFIX ) ), $args );
		if ( is_wp_error( $res ) ) {
			return self::tool_error( $res->get_error_message() );
		}
		return array(
			'content'           => array(
				array(
					'type' => 'text',
					'text' => (string) wp_json_encode( $res, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ),
				),
			),
			'structuredContent' => is_array( $res ) && $res ? $res : new \stdClass(),
			'isError'           => false,
		);
	}

	/**
	 * @param string $message
	 * @return array
	 */
	private static function tool_error( $message ) {
		return array(
			'content' => array(
				array(
					'type' => 'text',
					'text' => $message,
				),
			),
			'isError' => true,
		);
	}

	/**
	 * Execute one read-only tool.
	 *
	 * @param string $slug
	 * @param array  $args
	 * @return array|\WP_Error
	 */
	public static function call( $slug, array $args ) {
		switch ( $slug ) {
			case 'site-info':
				return self::site_info();
			case 'builder-guide':
				return self::builder_guide( ! isset( $args['include_units'] ) || $args['include_units'] );
			case 'schema':
				return self::schema();
			case 'content':
				return self::content( $args );
		}
		return new \WP_Error( 'unknown_tool', __( 'Unknown tool.', 'sidcraft-page-builder' ) );
	}

	/**
	 * @return array
	 */
	public static function site_info() {
		$theme = wp_get_theme();
		return array(
			'site'           => array(
				'name'        => get_bloginfo( 'name' ),
				'description' => get_bloginfo( 'description' ),
				'url'         => home_url( '/' ),
				'admin_url'   => admin_url(),
				'locale'      => get_locale(),
				'timezone'    => wp_timezone_string(),
			),
			'versions'       => array(
				'wordpress'           => get_bloginfo( 'version' ),
				'php'                 => PHP_VERSION,
				'sidcraft_builder'    => defined( 'SIDCRAFT_PAGE_BUILDER_VERSION' ) ? SIDCRAFT_PAGE_BUILDER_VERSION : '',
				'document_schema'     => DocumentManager::SCHEMA,
			),
			'theme'          => array(
				'name'    => $theme->get( 'Name' ),
				'version' => $theme->get( 'Version' ),
			),
			'document_types' => Documents::enabled(),
			'breakpoints'    => class_exists( Breakpoints::class ) ? Breakpoints::all() : array(),
			'user'           => array(
				'id'    => get_current_user_id(),
				'name'  => wp_get_current_user()->display_name ?? '',
				'roles' => array_values( (array) ( wp_get_current_user()->roles ?? array() ) ),
			),
		);
	}

	/**
	 * @param bool $units
	 * @return array
	 */
	public static function builder_guide( $units = true ) {
		$registry = UnitRegistry::instance();
		$guide    = array(
			'product'   => 'Sidcraft Builder (Sidcraft Page Builder)',
			'version'   => defined( 'SIDCRAFT_PAGE_BUILDER_VERSION' ) ? SIDCRAFT_PAGE_BUILDER_VERSION : '',
			'schema'    => DocumentManager::SCHEMA,
			'overview'  => 'A Sidcraft document is stored per post in post meta. It has a format version plus four top-level keys: root (the page units), header, footer and settings.',
			'structure' => array(
				'document' => '{ "version": "2.8", "root": [ unit, ... ], "header": [ unit, ... ], "footer": [ unit, ... ], "settings": { ... } }',
				'unit'     => '{ "id": "a1b2c3", "type": "container", "settings": { ... }, "children": [ unit, ... ] }',
				'rules'    => array(
					'Every unit needs a unique id (letters, digits, - and _).',
					'type must be a registered unit (see units below).',
					'children are only allowed on units that support them (container, grid, section and similar).',
					'settings keys are the unit controls; unknown keys are ignored by the renderer.',
					'Responsive values use suffixes: key_tablet, key_mobile, key_laptop, key_tablet_extra, key_mobile_extra, key_widescreen.',
				),
			),
			'breakpoints' => class_exists( Breakpoints::class ) ? Breakpoints::catalog() : array(),
			'workflow'    => array(
				'1. Read the page document with sidcraft-content (action get).',
				'2. Change the smallest part possible: add, update or remove one unit.',
				'3. Save with update_content or update_tree; the editor re-renders from the saved document.',
				'4. Use sidcraft-schema and the unit catalog below to inspect controls and defaults before setting values.',
			),
			'free_tier'  => 'This endpoint is read-only. Writing content, templates, design tokens, media, menus, components, WooCommerce and Sidcraft Commerce is available with Sidcraft Builder Pro at /wp-json/sidcraft-builder-pro/v1/mcp.',
		);
		if ( $units ) {
			$guide['units'] = self::unit_catalog();
		}
		return $guide;
	}

	/**
	 * Compact unit catalog.
	 *
	 * @return array
	 */
	public static function unit_catalog() {
		$out = array();
		foreach ( UnitRegistry::instance()->all() as $type => $unit ) {
			if ( ! is_object( $unit ) ) {
				continue;
			}
			$out[ $type ] = array(
				'title'      => $unit->title(),
				'category'   => $unit->category(),
				'children'   => (bool) $unit->supports_children(),
				'defaults'   => $unit->get_defaults(),
			);
		}
		ksort( $out );
		return $out;
	}

	/**
	 * @return array
	 */
	public static function schema() {
		if ( ! class_exists( Schema::class ) ) {
			return array( 'version' => DocumentManager::SCHEMA, 'root' => array() );
		}
		return Schema::json_schema();
	}

	/**
	 * Read-only content actions.
	 *
	 * @param array $args
	 * @return array|\WP_Error
	 */
	public static function content( array $args ) {
		$action = sanitize_key( (string) ( $args['action'] ?? '' ) );
		$id     = absint( $args['post_id'] ?? 0 );
		if ( 'get_settings' === $action && ! $id ) {
			return new \WP_Error( 'missing_id', __( 'post_id is required.', 'sidcraft-page-builder' ) );
		}
		if ( in_array( $action, array( 'get', 'get_settings' ), true ) ) {
			$post = $id ? get_post( $id ) : null;
			if ( ! $post ) {
				return new \WP_Error( 'not_found', __( 'Post not found.', 'sidcraft-page-builder' ) );
			}
			if ( ! current_user_can( 'edit_post', $id ) ) {
				return new \WP_Error( 'forbidden', __( 'You cannot read this post.', 'sidcraft-page-builder' ) );
			}
			$document = DocumentManager::get( $id );
			if ( 'get_settings' === $action ) {
				return array(
					'post_id'  => $id,
					'settings' => $document['settings'] ?? array(),
				);
			}
			return array(
				'post'     => self::post_summary( $post ),
				'document' => $document,
			);
		}

		$types = ! empty( $args['post_type'] ) ? array( sanitize_key( $args['post_type'] ) ) : Documents::enabled();
		$query = array(
			'post_type'              => $types,
			'post_status'            => ! empty( $args['status'] ) ? sanitize_key( $args['status'] ) : array( 'publish', 'draft', 'private', 'pending' ),
			'posts_per_page'         => max( 1, min( 100, absint( $args['per_page'] ?? 20 ) ) ),
			'paged'                  => max( 1, absint( $args['page'] ?? 1 ) ),
			'orderby'                => 'modified',
			'order'                  => 'DESC',
			'no_found_rows'          => true,
			'ignore_sticky_posts'    => true,
			'update_post_term_cache' => false,
		);
		if ( ! empty( $args['search'] ) ) {
			$query['s'] = sanitize_text_field( $args['search'] );
		}
		$q   = new \WP_Query( $query );
		$out = array();
		foreach ( $q->posts as $post ) {
			if ( current_user_can( 'edit_post', $post->ID ) ) {
				$out[] = self::post_summary( $post );
			}
		}
		return array(
			'posts' => $out,
			'total' => count( $out ),
		);
	}

	/**
	 * @param \WP_Post $post
	 * @return array
	 */
	private static function post_summary( $post ) {
		$document = DocumentManager::has( $post->ID ) ? DocumentManager::get( $post->ID ) : null;
		$count    = 0;
		$walk     = static function ( $nodes ) use ( &$walk, &$count ) {
			foreach ( (array) $nodes as $node ) {
				$count++;
				if ( ! empty( $node['children'] ) ) {
					$walk( $node['children'] );
				}
			}
		};
		if ( is_array( $document ) ) {
			$walk( $document['root'] ?? array() );
		}
		return array(
			'id'         => $post->ID,
			'title'      => get_the_title( $post ),
			'post_type'  => $post->post_type,
			'status'     => $post->post_status,
			'slug'       => $post->post_name,
			'url'        => get_permalink( $post ),
			'edit_url'   => admin_url( 'admin.php?page=sidcraft-page-builder&post_id=' . $post->ID ),
			'modified'   => $post->post_modified_gmt,
			'has_document' => (bool) $document,
			'root_units' => is_array( $document ) ? count( (array) ( $document['root'] ?? array() ) ) : 0,
			'unit_count' => $count,
		);
	}

	/**
	 * @param mixed $id
	 * @param mixed $result
	 * @return array
	 */
	private static function result( $id, $result ) {
		return array(
			'jsonrpc' => '2.0',
			'id'      => $id,
			'result'  => $result,
		);
	}

	/**
	 * @param mixed  $id
	 * @param int    $code
	 * @param string $message
	 * @return array
	 */
	private static function error( $id, $code, $message ) {
		return array(
			'jsonrpc' => '2.0',
			'id'      => $id,
			'error'   => array(
				'code'    => $code,
				'message' => $message,
			),
		);
	}
}
