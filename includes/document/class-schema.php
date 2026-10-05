<?php
/**
 * Published JSON Schema for the saved document format.
 *
 * Every Sidcraft Page Builder layout is stored as one JSON document in the
 * `_sidsyn_document_data` post meta. This class describes that format as a
 * JSON Schema (draft 2020-12), generated from the units registered on the
 * site, so the description always matches what save() accepts.
 *
 * Read it at GET /wp-json/sidcraft-page-builder/v1/schema, or with
 * `wp sidcraft-page-builder schema`. Human documentation:
 * https://canvasly.pro/document-format.html
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Document;

use SidcraftPageBuilder\Settings\Breakpoints;
use SidcraftPageBuilder\Units\Unit;
use SidcraftPageBuilder\Units\UnitRegistry;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Schema {

	const DOCS_URL = 'https://canvasly.pro/document-format.html';

	public static function init() {
		add_action( 'sidcraft_page_builder_rest_register_routes', array( self::class, 'routes' ) );
	}

	/**
	 * @param string $namespace
	 */
	public static function routes( $namespace ) {
		register_rest_route(
			$namespace !== '' ? $namespace : 'sidcraft-page-builder/v1',
			'/schema',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'rest_get' ),
				// The format description holds no site data, only unit and setting names.
				'permission_callback' => '__return_true',
			)
		);
	}

	public static function rest_get() {
		$res = rest_ensure_response( self::json_schema() );
		$res->header( 'Cache-Control', 'public, max-age=3600' );
		return $res;
	}

	/**
	 * Breakpoint names a responsive value may be keyed by.
	 *
	 * @return string[]
	 */
	private static function breakpoints() {
		return class_exists( Breakpoints::class ) ? array_values( (array) Breakpoints::names() ) : array( 'desktop', 'tablet', 'mobile' );
	}

	/**
	 * JSON Schema for one control's stored value.
	 *
	 * @param array $def Normalized control definition.
	 * @return array
	 */
	public static function control_schema( array $def ) {
		$type = (string) ( $def['type'] ?? 'text' );
		$out  = array();
		switch ( $type ) {
			case 'switch':
				$out['type'] = 'boolean';
				break;
			case 'number':
				$out['type'] = array( 'number', 'string' );
				if ( isset( $def['range']['min'] ) && is_numeric( $def['range']['min'] ) ) {
					$out['minimum'] = 0 + $def['range']['min'];
				}
				if ( isset( $def['range']['max'] ) && is_numeric( $def['range']['max'] ) ) {
					$out['maximum'] = 0 + $def['range']['max'];
				}
				$out['description'] = 'Number, or "" for unset.';
				break;
			case 'media':
				$out['type']        = 'integer';
				$out['minimum']     = 0;
				$out['description'] = 'Media Library attachment ID.';
				break;
			case 'gallery':
				$out['type']        = 'string';
				$out['pattern']     = '^[0-9,\\s]*$';
				$out['description'] = 'Comma-separated attachment IDs.';
				break;
			case 'slider':
				$out['type']        = array( 'string', 'number', 'object' );
				$out['properties']  = array(
					'size' => array( 'type' => array( 'string', 'number' ) ),
					'unit' => array( 'type' => 'string' ),
				);
				$out['description'] = 'A number (unit from the control default), a number with a CSS unit such as "24px", "1.5em", "50%" or "auto", or {size, unit}. Empty for unset.';
				if ( ! empty( $def['units'] ) && is_array( $def['units'] ) ) {
					$out['x-units'] = array_values( array_map( 'strval', $def['units'] ) );
				}
				break;
			case 'select':
				$out['type'] = 'string';
				if ( ! empty( $def['options'] ) && is_array( $def['options'] ) ) {
					$keys = array();
					foreach ( $def['options'] as $k => $v ) {
						$keys[] = is_int( $k ) && ! is_array( $v ) ? (string) $v : (string) $k;
					}
					$out['x-options'] = array_values( array_unique( $keys ) );
				}
				break;
			case 'color':
				$out['type']        = 'string';
				$out['description'] = 'Hex, rgb()/hsl() or a global color reference such as var(--lb-color-primary).';
				break;
			case 'url':
				$out['type']   = 'string';
				$out['format'] = 'uri-reference';
				break;
			case 'wysiwyg':
				$out['type']                = 'string';
				$out['contentMediaType']    = 'text/html';
				$out['description']         = 'HTML limited to what wp_kses_post() allows.';
				break;
			case 'repeater':
				$fields = array();
				foreach ( (array) ( $def['fields'] ?? array() ) as $fk => $fdef ) {
					if ( ! is_array( $fdef ) ) {
						continue;
					}
					$fields[ sanitize_key( (string) $fk ) ] = self::control_schema( Unit::normalize_control( $fk, $fdef ) );
				}
				$fields['_id'] = array(
					'type'        => 'string',
					'description' => 'Stable row ID. Generated when missing.',
				);
				$out           = array(
					'type'  => 'array',
					'items' => array(
						'type'                 => array( 'object', 'array' ),
				'maxItems'             => 0, // PHP stores an empty object as [].
						'properties'           => $fields,
						'additionalProperties' => true,
					),
				);
				break;
			case 'url_map':
			case 'number_map':
				$out = array(
					'type'                 => array( 'object', 'array' ),
				'maxItems'             => 0, // PHP stores an empty object as [].
					'description'          => 'Keyed by attachment ID.',
					'additionalProperties' => array( 'type' => $type === 'url_map' ? 'string' : 'number' ),
				);
				break;
			case 'text':
			case 'textarea':
			case 'code':
			case 'icon':
			case 'hidden':
				// An empty value may be stored as [].
				$out['type']     = array( 'string', 'number', 'array' );
				$out['maxItems'] = 0;
				break;
			default:
				// Group controls (typography, border, shadow…) and add-on types.
				$out['description'] = 'Control type "' . $type . '". Stored as the control saves it (often an object).';
		}
		$out['x-control'] = $type;
		if ( ! empty( $def['label'] ) ) {
			$out['title'] = wp_strip_all_tags( (string) $def['label'] );
		}
		if ( array_key_exists( 'default', $def ) && is_scalar( $def['default'] ) && $def['default'] !== '' ) {
			$out['default'] = $def['default'];
		}
		if ( ! empty( $def['responsive'] ) ) {
			$single = $out;
			unset( $single['default'], $single['title'], $single['x-control'] );
			$res = array(
				'x-control'    => $type,
				'x-responsive' => true,
				'anyOf'        => array(
					$single,
					array(
						'type'                 => 'object',
						'description'          => 'Per-breakpoint values. A breakpoint without a value inherits one, as in the editor.',
						'propertyNames'        => array( 'enum' => self::breakpoints() ),
						'additionalProperties' => $single,
					),
				),
			);
			if ( isset( $out['title'] ) ) {
				$res['title'] = $out['title'];
			}
			if ( isset( $out['default'] ) ) {
				$res['default'] = $out['default'];
			}
			return $res;
		}
		return $out;
	}

	/**
	 * Settings schema for one unit type.
	 *
	 * @param Unit $unit
	 * @return array
	 */
	private static function unit_settings( $unit ) {
		$props    = array();
		$shared   = array_keys( (array) Unit::shared_controls() );
		$declared = (array) $unit->controls();
		foreach ( (array) $unit->all_controls() as $key => $def ) {
			if ( ! is_array( $def ) ) {
				continue;
			}
			// Shared Style/Advanced controls are described once in $defs/shared_settings.
			if ( in_array( $key, $shared, true ) && ! array_key_exists( $key, $declared ) ) {
				continue;
			}
			$props[ (string) $key ] = self::control_schema( $def );
		}
		$props['_dynamic'] = array(
			'type'                 => array( 'object', 'array' ),
				'maxItems'             => 0, // PHP stores an empty object as [].
			'description'          => 'Dynamic tag bindings keyed by setting name. Resolved at render time.',
			'additionalProperties' => true,
		);
		return array(
			'allOf'                => array( array( '$ref' => '#/$defs/shared_settings' ) ),
			'type'                 => array( 'object', 'array' ),
				'maxItems'             => 0, // PHP stores an empty object as [].
			'title'                => (string) $unit->title(),
			'properties'           => $props,
			'additionalProperties' => true,
			'description'          => 'Unknown keys are dropped on save; missing keys take the defaults shown.',
		);
	}

	/**
	 * Style and Advanced controls every unit has (spacing, background,
	 * border, position, motion, visibility, attributes).
	 *
	 * @return array
	 */
	private static function shared_settings() {
		$props = array();
		foreach ( (array) Unit::shared_controls() as $key => $def ) {
			if ( ! is_array( $def ) ) {
				continue;
			}
			$props[ (string) $key ] = self::control_schema( Unit::normalize_control( $key, $def ) );
		}
		return array(
			'type'                 => array( 'object', 'array' ),
			'maxItems'             => 0,
			'description'          => 'Settings every unit accepts (Style and Advanced tabs).',
			'properties'           => $props,
			'additionalProperties' => true,
		);
	}

	/**
	 * The full schema.
	 *
	 * @return array
	 */
	public static function json_schema() {
		$units  = array();
		$types  = array();
		$routes = array();
		foreach ( UnitRegistry::instance()->all() as $unit ) {
			if ( ! ( $unit instanceof Unit ) ) {
				continue;
			}
			$type = sanitize_key( (string) $unit->type() );
			if ( $type === '' ) {
				continue;
			}
			$types[]                      = $type;
			$units[ 'settings_' . $type ] = self::unit_settings( $unit );
			$units[ 'settings_' . $type ]['x-children'] = (bool) $unit->supports_children();
			$routes[]                     = array(
				'if'   => array(
					'properties' => array( 'type' => array( 'const' => $type ) ),
					'required'   => array( 'type' ),
				),
				'then' => array(
					'properties' => array( 'settings' => array( '$ref' => '#/$defs/settings_' . $type ) ),
				),
			);
		}
		sort( $types );
		$states = array( 'base', 'hover', 'focus', 'active', 'focus_visible' );
		$state  = array();
		foreach ( $states as $s ) {
			$state[ $s ] = array(
				'type'                 => array( 'object', 'array' ),
				'maxItems'             => 0, // PHP stores an empty object as [].
				'description'          => 'CSS property => value for this state (XEditor style layer).',
				'additionalProperties' => true,
			);
		}
		$schema = array(
			'$schema'     => 'https://json-schema.org/draft/2020-12/schema',
			'$id'         => rest_url( 'sidcraft-page-builder/v1/schema' ),
			'title'       => 'Sidcraft Page Builder document',
			'description' => 'One page layout, stored as JSON in the _sidsyn_document_data post meta. Saved templates use _sidsyn_template_data with the same format. Documentation: ' . self::DOCS_URL,
			'x-version'   => DocumentManager::SCHEMA,
			'x-plugin'    => defined( 'SIDCRAFT_PAGE_BUILDER_VERSION' ) ? SIDCRAFT_PAGE_BUILDER_VERSION : '',
			'x-storage'   => array(
				'document'        => DocumentManager::META,
				'hash'            => DocumentManager::HASH,
				'css_cache'       => DocumentManager::CSS_CACHE,
				'autosave'        => DocumentManager::AUTOSAVE,
				'fallback_copy'   => 'post_content (core blocks)',
				'original_backup' => class_exists( FallbackContent::class ) ? FallbackContent::ORIGINAL_META : '',
			),
			'type'        => array( 'object', 'array' ),
				'maxItems'        => 0, // PHP stores an empty object as [].
			'required'    => array( 'version', 'root' ),
			'properties'  => array(
				'version'  => array(
					'type'        => 'string',
					'description' => 'Format version. Older documents are migrated on read; save() always writes the current one.',
					'examples'    => array( DocumentManager::SCHEMA ),
				),
				'root'     => array(
					'type'        => 'array',
					'description' => 'The page body, top to bottom.',
					'items'       => array( '$ref' => '#/$defs/node' ),
				),
				'header'   => array(
					'type'        => 'array',
					'description' => 'Page-specific header. Ignored while the theme provides its own header and footer.',
					'items'       => array( '$ref' => '#/$defs/node' ),
				),
				'footer'   => array(
					'type'        => 'array',
					'description' => 'Page-specific footer. Same rule as header.',
					'items'       => array( '$ref' => '#/$defs/node' ),
				),
				'settings' => array( '$ref' => '#/$defs/page_settings' ),
				'atomic'   => array(
					'type'        => 'boolean',
					'description' => 'Legacy flag kept by older documents.',
				),
			),
			'additionalProperties' => false,
			'$defs'       => array_merge(
				array(
					'shared_settings' => self::shared_settings(),
					'page_settings'   => array(
						'type'                 => array( 'object', 'array' ),
				'maxItems'             => 0, // PHP stores an empty object as [].
						'properties'           => array(
							'title'      => array( 'type' => 'string' ),
							'template'   => array(
								'type' => 'string',
								'enum' => DocumentManager::PAGE_TEMPLATES,
							),
							'body_class' => array( 'type' => 'string' ),
							'page_width' => array(
								'type'        => 'string',
								'description' => 'CSS length, e.g. 1140px.',
							),
						),
						'additionalProperties' => array( 'type' => array( 'boolean', 'number' ) ),
						'description'          => 'Other keys must be booleans or numbers.',
					),
					'editor_settings' => array(
						'type'                 => array( 'object', 'array' ),
				'maxItems'             => 0, // PHP stores an empty object as [].
						'description'          => 'Editor-only state. Never affects what visitors see.',
						'properties'           => array(
							'label'  => array(
								'type'        => 'string',
								'maxLength'   => 80,
								'description' => 'Name shown in the Navigator.',
							),
							'hidden' => array(
								'type'        => 'boolean',
								'description' => 'Hidden on the editor canvas only.',
							),
							'locked' => array(
								'type'        => 'boolean',
								'description' => 'Locked in the editor (with everything inside it).',
							),
						),
						'additionalProperties' => array( 'type' => array( 'boolean', 'number', 'string' ) ),
					),
					'interaction'     => array(
						'type'                 => array( 'object', 'array' ),
				'maxItems'             => 0, // PHP stores an empty object as [].
						'description'          => 'Motion: entrance/exit/hover/scroll effect.',
						'properties'           => array(
							'id'        => array( 'type' => 'string' ),
							'kind'      => array( 'type' => 'string' ),
							'trigger'   => array( 'type' => 'string' ),
							'effect'    => array( 'type' => 'string' ),
							'duration'  => array(
								'type'    => 'number',
								'minimum' => 0,
								'maximum' => 30,
							),
							'delay'     => array(
								'type'    => 'number',
								'minimum' => 0,
								'maximum' => 30,
							),
							'easing'    => array( 'type' => 'string' ),
							'iteration' => array(
								'type'    => 'integer',
								'minimum' => 1,
								'maximum' => 20,
							),
							'repeat'    => array( 'type' => 'boolean' ),
							'threshold' => array(
								'type'    => 'number',
								'minimum' => 0,
								'maximum' => 1,
							),
						),
						'additionalProperties' => true,
					),
					'node'            => array(
						'type'                 => array( 'object', 'array' ),
				'maxItems'             => 0, // PHP stores an empty object as [].
						'required'             => array( 'type' ),
						'properties'           => array(
							'id'              => array(
								'type'        => 'string',
								'pattern'     => '^[A-Za-z0-9_-]{1,40}$',
								'description' => 'Stable ID, unique in the document. Generated when missing. Used for CSS (#lb-node-{id}) and anchors.',
							),
							'type'            => array(
								'type'        => 'string',
								'enum'        => $types,
								'description' => 'Registered unit type. Nodes of unknown types are dropped on save.',
							),
							'atomic'          => array(
								'type'        => 'boolean',
								'description' => 'XEditor element (prints one HTML element, styled by classes).',
							),
							'settings'        => array(
								'type'        => array( 'object', 'array' ),
				'maxItems'        => 0, // PHP stores an empty object as [].
								'description' => 'Control values. See $defs/settings_{type}.',
							),
							'styles'          => array(
								'type'                 => array( 'object', 'array' ),
				'maxItems'             => 0, // PHP stores an empty object as [].
								'properties'           => $state,
								'additionalProperties' => false,
							),
							'interactions'    => array(
								'type'  => 'array',
								'items' => array( '$ref' => '#/$defs/interaction' ),
							),
							'editor_settings' => array( '$ref' => '#/$defs/editor_settings' ),
							'children'        => array(
								'type'        => 'array',
								'description' => 'Only for types with x-children true.',
								'items'       => array( '$ref' => '#/$defs/node' ),
							),
							'slot'            => array(
								'type'        => 'string',
								'description' => 'For children of slotted units (Nested Tabs, Nested Accordion): the repeater row _id this child belongs to.',
							),
							'exposed'         => array(
								'type'        => 'array',
								'items'       => array( 'type' => 'string' ),
								'description' => 'Component instances: settings exposed for overrides.',
							),
						),
						'allOf'                => $routes,
						'additionalProperties' => false,
					),
				),
				$units
			),
			'examples'    => array(
				array(
					'version'  => DocumentManager::SCHEMA,
					'settings' => array( 'template' => 'default' ),
					'root'     => array(
						array(
							'id'       => 'hero',
							'type'     => 'container',
							'settings' => array(),
							'children' => array(
								array(
									'id'       => 'title',
									'type'     => 'heading',
									'settings' => array(
										'text' => 'Hello',
										'tag'  => 'h1',
									),
								),
							),
						),
					),
				),
			),
		);
		/**
		 * Filter the published document schema (add-ons describe their own units here).
		 *
		 * @param array $schema
		 */
		return apply_filters( 'sidcraft_page_builder_document_schema', $schema );
	}
}
