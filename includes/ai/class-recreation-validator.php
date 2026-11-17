<?php
/**
 * Structural checks for a generated block tree.
 *
 * Runs on the server against the tree artifact of a recreation run (see
 * Recreation), the tokens artifact it was generated against, and the viewport
 * artifact. It catches what would break or silently do nothing once applied:
 * unknown units, children in units that take none, undefined refs, breakpoint
 * keys the site does not have, classes that do not exist and var() references
 * that resolve to nothing. Layout and visual checks at each breakpoint are
 * separate (the editor and Sidcraft Builder Pro add them to the validation
 * artifact).
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Ai;

use SidcraftPageBuilder\Settings\Breakpoints;
use SidcraftPageBuilder\Units\UnitRegistry;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class RecreationValidator {
	const OPS         = array( 'insert', 'update', 'move', 'remove', 'class', 'var', 'add_class', 'remove_class' );
	const STATES      = array( 'base', 'hover', 'focus', 'active', 'focus_visible' );
	const VAR_TYPES   = array( 'color', 'font', 'size', 'spacing', 'custom' );
	const MAX_OPS     = 400;
	const WARN_OPS    = 150;
	const MAX_ISSUES  = 200;
	const CONTAINERS  = array( 'xe_div_block', 'xe_flexbox', 'xe_grid' );

	/** @var array */
	private $errors = array();
	/** @var array */
	private $warnings = array();
	/** @var array<string,true> */
	private $classes = array();
	/** @var array<string,true> */
	private $vars = array();
	/** @var array<string,true> */
	private $used_classes = array();
	/** @var array<string,string> var name => first path */
	private $used_vars = array();
	/** @var array<string,true> */
	private $refs = array();
	/** @var array<string,true> */
	private $ids = array();
	/** @var string[] */
	private $bp_all = array();
	/** @var string[] */
	private $bp_on = array();
	/** @var int */
	private $nodes = 0;

	/**
	 * @param array $tree     Tree artifact data: { format: plan|document, ops?|root? }.
	 * @param array $tokens   Tokens artifact data: { variables, classes }.
	 * @param array $viewport Viewport artifact data: { breakpoints: [{name,width}] }.
	 * @param int   $post_id  Page the tree is for (its saved node ids are known).
	 * @return array{ok:bool,errors:array,warnings:array,stats:array}
	 */
	public static function check( array $tree, array $tokens, array $viewport, $post_id = 0 ) {
		$v = new self();
		return $v->run( $tree, $tokens, $viewport, (int) $post_id );
	}

	/**
	 * @return array
	 */
	private function run( array $tree, array $tokens, array $viewport, $post_id ) {
		foreach ( (array) ( $tokens['classes'] ?? array() ) as $c ) {
			if ( is_array( $c ) && ! empty( $c['name'] ) ) {
				$this->classes[ (string) $c['name'] ] = true;
			}
		}
		foreach ( (array) ( $tokens['variables'] ?? array() ) as $var ) {
			if ( is_array( $var ) && ! empty( $var['name'] ) ) {
				$this->vars[ (string) $var['name'] ] = true;
			}
		}
		$this->bp_all = class_exists( Breakpoints::class ) ? Breakpoints::names() : array( 'mobile', 'tablet', 'desktop' );
		foreach ( (array) ( $viewport['breakpoints'] ?? array() ) as $b ) {
			if ( is_array( $b ) && ! empty( $b['name'] ) ) {
				$this->bp_on[] = (string) $b['name'];
			}
		}
		if ( ! $this->bp_on ) {
			$this->bp_on = array( 'desktop', 'tablet', 'mobile' );
		}
		if ( $post_id && class_exists( '\\SidcraftPageBuilder\\Document\\DocumentManager' ) ) {
			$doc = \SidcraftPageBuilder\Document\DocumentManager::get( $post_id );
			$this->collect_ids( (array) ( $doc['root'] ?? array() ) );
		}

		$format = (string) ( $tree['format'] ?? '' );
		if ( 'document' === $format ) {
			$root = (array) ( $tree['root'] ?? array() );
			if ( ! $root ) {
				$this->error( 'empty_tree', __( 'The block tree is empty.', 'sidcraft-page-builder' ), 'root' );
			}
			$this->walk( $root, 'root', 0 );
		} elseif ( 'plan' === $format ) {
			$this->plan( (array) ( $tree['ops'] ?? array() ) );
		} else {
			$this->error( 'format', __( 'The tree must be a plan or a document.', 'sidcraft-page-builder' ), 'format' );
		}

		foreach ( $this->used_vars as $name => $path ) {
			if ( ! isset( $this->vars[ $name ] ) ) {
				/* translators: %s: CSS variable name. */
				$this->error( 'unresolved_var', sprintf( __( 'var(--xe-var-%s) is not a design variable on this site or in the plan; the property will not apply.', 'sidcraft-page-builder' ), $name ), $path );
			}
		}
		foreach ( array_keys( $this->used_classes ) as $name ) {
			if ( ! isset( $this->classes[ $name ] ) ) {
				/* translators: %s: class name. */
				$this->warning( 'unknown_class', sprintf( __( 'Class .xe-class-%s does not exist yet, so it adds no style.', 'sidcraft-page-builder' ), $name ), 'xe_classes' );
			}
		}

		return array(
			'ok'       => ! $this->errors,
			'errors'   => array_slice( $this->errors, 0, self::MAX_ISSUES ),
			'warnings' => array_slice( $this->warnings, 0, self::MAX_ISSUES ),
			'stats'    => array(
				'nodes'   => $this->nodes,
				'classes' => count( $this->used_classes ),
				'vars'    => count( $this->used_vars ),
			),
		);
	}

	/* ------------------------------------------------------------------ */

	/**
	 * @param array $ops
	 * @return void
	 */
	private function plan( array $ops ) {
		$count = count( $ops );
		if ( ! $count ) {
			$this->error( 'empty_tree', __( 'The plan has no operations.', 'sidcraft-page-builder' ), 'ops' );
			return;
		}
		if ( $count > self::MAX_OPS ) {
			/* translators: %d: operation limit. */
			$this->error( 'too_many_ops', sprintf( __( 'The plan has more than %d operations.', 'sidcraft-page-builder' ), self::MAX_OPS ), 'ops' );
		} elseif ( $count > self::WARN_OPS ) {
			$this->warning( 'large_plan', __( 'The plan is large; consider building it section by section.', 'sidcraft-page-builder' ), 'ops' );
		}
		// Classes and variables a plan creates count as defined everywhere in it.
		foreach ( $ops as $op ) {
			if ( ! is_array( $op ) ) {
				continue;
			}
			$kind = (string) ( $op['op'] ?? '' );
			$name = self::slug( $op['name'] ?? '' );
			if ( 'class' === $kind && '' !== $name ) {
				$this->classes[ $name ] = true;
			} elseif ( 'var' === $kind && '' !== $name ) {
				$this->vars[ $name ] = true;
			}
		}
		foreach ( array_slice( $ops, 0, self::MAX_OPS ) as $i => $op ) {
			$path = 'ops[' . $i . ']';
			if ( ! is_array( $op ) || ! in_array( $op['op'] ?? '', self::OPS, true ) ) {
				$this->error( 'unknown_op', __( 'Unknown operation.', 'sidcraft-page-builder' ), $path );
				continue;
			}
			switch ( $op['op'] ) {
				case 'insert':
					$this->target( $op['parent'] ?? null, $path . '.parent', true );
					if ( ! is_array( $op['nodes'] ?? null ) || ! $op['nodes'] ) {
						$this->error( 'no_nodes', __( 'An insert needs at least one node.', 'sidcraft-page-builder' ), $path );
						break;
					}
					$this->walk( $op['nodes'], $path . '.nodes', 0, true );
					break;
				case 'update':
					$this->target( $op['id'] ?? null, $path . '.id' );
					$this->settings( (array) ( $op['settings'] ?? array() ), $path . '.settings' );
					break;
				case 'move':
					$this->target( $op['id'] ?? null, $path . '.id' );
					$this->target( $op['parent'] ?? null, $path . '.parent', true );
					break;
				case 'remove':
					$this->target( $op['id'] ?? null, $path . '.id' );
					break;
				case 'add_class':
				case 'remove_class':
					$this->target( $op['id'] ?? null, $path . '.id' );
					if ( 'add_class' === $op['op'] ) {
						$this->class_list( $op['classes'] ?? array() );
					}
					break;
				case 'class':
					$this->design_class( $op, $path );
					break;
				case 'var':
					if ( '' === self::slug( $op['name'] ?? '' ) ) {
						$this->error( 'bad_name', __( 'A design variable needs a name.', 'sidcraft-page-builder' ), $path . '.name' );
					}
					if ( isset( $op['type'] ) && ! in_array( $op['type'], self::VAR_TYPES, true ) ) {
						$this->warning( 'var_type', __( 'Unknown variable type; it is saved as custom.', 'sidcraft-page-builder' ), $path . '.type' );
					}
					$this->css_refs( (string) ( $op['value'] ?? '' ), $path . '.value' );
					break;
			}
		}
	}

	/**
	 * @param array  $nodes
	 * @param string $path
	 * @param int    $depth
	 * @param bool   $plan  Nodes of a plan insert (may define refs).
	 * @return void
	 */
	private function walk( array $nodes, $path, $depth, $plan = false ) {
		if ( $depth > 30 ) {
			$this->error( 'too_deep', __( 'The tree is nested more than 30 levels deep.', 'sidcraft-page-builder' ), $path );
			return;
		}
		$registry = class_exists( UnitRegistry::class ) ? UnitRegistry::instance() : null;
		foreach ( $nodes as $i => $node ) {
			$p = $path . '[' . $i . ']';
			if ( ! is_array( $node ) ) {
				$this->error( 'bad_node', __( 'A node must be an object.', 'sidcraft-page-builder' ), $p );
				continue;
			}
			++$this->nodes;
			$type = sanitize_key( (string) ( $node['type'] ?? '' ) );
			$unit = null;
			if ( '' === $type ) {
				$this->error( 'no_type', __( 'A node has no type.', 'sidcraft-page-builder' ), $p );
			} elseif ( $registry && ! $registry->has( $type ) ) {
				/* translators: %s: unit type. */
				$this->error( 'unknown_unit', sprintf( __( 'Unit "%s" is not available on this site.', 'sidcraft-page-builder' ), $type ), $p . '.type' );
			} elseif ( $registry ) {
				$unit = $registry->get( $type );
			}
			if ( $plan && isset( $node['ref'] ) ) {
				$ref = (string) $node['ref'];
				if ( isset( $this->refs[ $ref ] ) ) {
					/* translators: %s: ref name. */
					$this->error( 'duplicate_ref', sprintf( __( 'Ref "%s" is defined twice.', 'sidcraft-page-builder' ), $ref ), $p . '.ref' );
				}
				$this->refs[ $ref ] = true;
			}
			$settings = (array) ( $node['settings'] ?? array() );
			$this->settings( $settings, $p . '.settings' );
			if ( 'xe_image' === $type ) {
				$src = (string) ( $settings['src'] ?? '' );
				if ( '' !== $src && ! preg_match( '#^(https?:)?//#i', $src ) ) {
					$this->warning( 'image_src', __( 'Image source is not a web address; use an uploaded image or leave it empty for a placeholder.', 'sidcraft-page-builder' ), $p . '.settings.src' );
				}
				if ( '' === trim( (string) ( $settings['alt'] ?? '' ) ) ) {
					$this->warning( 'image_alt', __( 'Image has no alt text.', 'sidcraft-page-builder' ), $p . '.settings.alt' );
				}
			}
			$children = $node['children'] ?? array();
			if ( is_array( $children ) && $children ) {
				$takes = in_array( $type, self::CONTAINERS, true ) || ( $unit && method_exists( $unit, 'supports_children' ) && $unit->supports_children() );
				if ( $unit && ! $takes ) {
					/* translators: %s: unit type. */
					$this->error( 'children', sprintf( __( 'Unit "%s" does not take child units.', 'sidcraft-page-builder' ), $type ), $p . '.children' );
				}
				$this->walk( $children, $p . '.children', $depth + 1, $plan );
			}
		}
	}

	/**
	 * Responsive values, classes and var() references in node settings.
	 *
	 * @param array  $settings
	 * @param string $path
	 * @return void
	 */
	private function settings( array $settings, $path ) {
		foreach ( $settings as $key => $value ) {
			if ( 'xe_classes' === $key ) {
				$this->class_list( $value );
				continue;
			}
			if ( is_array( $value ) && $value && self::is_responsive( $value ) ) {
				foreach ( array_keys( $value ) as $bp ) {
					$this->breakpoint( (string) $bp, $path . '.' . $key );
				}
			}
			if ( is_string( $value ) ) {
				$this->css_refs( $value, $path . '.' . $key );
			}
		}
	}

	/**
	 * @param array  $op
	 * @param string $path
	 * @return void
	 */
	private function design_class( array $op, $path ) {
		if ( '' === self::slug( $op['name'] ?? '' ) ) {
			$this->error( 'bad_name', __( 'A class needs a name.', 'sidcraft-page-builder' ), $path . '.name' );
		}
		foreach ( (array) ( $op['styles'] ?? array() ) as $state => $by_bp ) {
			if ( ! in_array( (string) $state, self::STATES, true ) ) {
				/* translators: %s: state name. */
				$this->error( 'bad_state', sprintf( __( 'Unknown state "%s".', 'sidcraft-page-builder' ), $state ), $path . '.styles' );
				continue;
			}
			foreach ( (array) $by_bp as $bp => $props ) {
				$this->breakpoint( (string) $bp, $path . '.styles.' . $state );
				foreach ( (array) $props as $prop => $val ) {
					$this->css_refs( is_scalar( $val ) ? (string) $val : '', $path . '.styles.' . $state . '.' . $bp . '.' . $prop );
				}
			}
		}
	}

	/**
	 * @param mixed $id
	 * @param string $path
	 * @param bool   $nullable
	 * @return void
	 */
	private function target( $id, $path, $nullable = false ) {
		if ( null === $id || '' === $id || ( $nullable && in_array( $id, array( 'root', 'null' ), true ) ) ) {
			if ( ! $nullable ) {
				$this->error( 'no_target', __( 'The operation has no target node.', 'sidcraft-page-builder' ), $path );
			}
			return;
		}
		$id = (string) $id;
		if ( 0 === strpos( $id, 'ref:' ) ) {
			if ( ! isset( $this->refs[ substr( $id, 4 ) ] ) ) {
				/* translators: %s: ref name. */
				$this->error( 'undefined_ref', sprintf( __( '"%s" is used before it is created.', 'sidcraft-page-builder' ), $id ), $path );
			}
			return;
		}
		if ( isset( $this->refs[ $id ] ) ) {
			return; // The editor also resolves a ref name without the "ref:" prefix.
		}
		if ( $this->ids && ! isset( $this->ids[ $id ] ) ) {
			// The editor may hold unsaved nodes, so this is only a warning here; the browser checks again.
			/* translators: %s: node id. */
			$this->warning( 'unknown_id', sprintf( __( 'Node %s is not on the saved page.', 'sidcraft-page-builder' ), $id ), $path );
		}
	}

	/**
	 * @param mixed $value
	 * @return void
	 */
	private function class_list( $value ) {
		$list = is_array( $value ) ? $value : preg_split( '/[\s,]+/', (string) $value );
		foreach ( (array) $list as $c ) {
			$c = self::slug( $c );
			if ( '' !== $c ) {
				$this->used_classes[ $c ] = true;
			}
		}
	}

	/**
	 * @param string $bp
	 * @param string $path
	 * @return void
	 */
	private function breakpoint( $bp, $path ) {
		if ( ! in_array( $bp, $this->bp_all, true ) ) {
			/* translators: %s: breakpoint name. */
			$this->error( 'bad_breakpoint', sprintf( __( 'Breakpoint "%s" does not exist.', 'sidcraft-page-builder' ), $bp ), $path );
		} elseif ( ! in_array( $bp, $this->bp_on, true ) ) {
			/* translators: %s: breakpoint name. */
			$this->warning( 'off_breakpoint', sprintf( __( 'Breakpoint "%s" is not enabled, so this value never applies.', 'sidcraft-page-builder' ), $bp ), $path );
		}
	}

	/**
	 * @param string $value
	 * @param string $path
	 * @return void
	 */
	private function css_refs( $value, $path ) {
		if ( false === strpos( $value, '--xe-var-' ) ) {
			return;
		}
		if ( preg_match_all( '/var\(\s*--xe-var-([a-z0-9-]+)/i', $value, $m ) ) {
			foreach ( $m[1] as $name ) {
				$name = strtolower( $name );
				if ( ! isset( $this->used_vars[ $name ] ) ) {
					$this->used_vars[ $name ] = $path;
				}
			}
		}
	}

	/**
	 * @param array $nodes
	 * @return void
	 */
	private function collect_ids( array $nodes ) {
		foreach ( $nodes as $n ) {
			if ( is_array( $n ) ) {
				if ( isset( $n['id'] ) ) {
					$this->ids[ (string) $n['id'] ] = true;
				}
				$this->collect_ids( (array) ( $n['children'] ?? array() ) );
			}
		}
	}

	/**
	 * A map keyed by breakpoint names (desktop is always present in the editor's maps).
	 *
	 * @param array $value
	 * @return bool
	 */
	private static function is_responsive( array $value ) {
		if ( array_values( $value ) === $value ) {
			return false;
		}
		$keys = array_map( 'strval', array_keys( $value ) );
		return in_array( 'desktop', $keys, true ) || (bool) array_intersect( $keys, array( 'mobile', 'tablet', 'laptop', 'widescreen', 'mobile_extra', 'tablet_extra' ) );
	}

	/**
	 * Same rule as XEditor's class and variable names.
	 *
	 * @param mixed $name
	 * @return string
	 */
	public static function slug( $name ) {
		if ( class_exists( '\\SidcraftPageBuilder\\XEditor\\XEditorClassesManager' ) ) {
			return \SidcraftPageBuilder\XEditor\XEditorClassesManager::slug( $name );
		}
		$name = strtolower( trim( (string) $name ) );
		$name = preg_replace( '/^(--xe-var-|xe-class-|\.|\$)/', '', $name );
		$name = preg_replace( '/[^a-z0-9-]+/', '-', $name );
		return substr( trim( (string) preg_replace( '/-+/', '-', $name ), '-' ), 0, 48 );
	}

	/**
	 * @return void
	 */
	private function error( $code, $message, $path ) {
		$this->errors[] = array(
			'code'    => $code,
			'message' => $message,
			'path'    => $path,
		);
	}

	/**
	 * @return void
	 */
	private function warning( $code, $message, $path ) {
		$this->warnings[] = array(
			'code'    => $code,
			'message' => $message,
			'path'    => $path,
		);
	}
}
