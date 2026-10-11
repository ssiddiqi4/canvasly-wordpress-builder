<?php
/**
 * AI Chat Bot: the in-editor design assistant.
 *
 * The chat panel (assets/js/editor-ai.js) sends the conversation plus a compact
 * outline of the open page. The model answers with text and, for a change, a
 * plan of node operations. Plans are previewed on the canvas and applied in the
 * browser through the normal editor history, so nothing is written to the page
 * until the user applies the plan and saves.
 *
 * Requests go through the WordPress AI Client (WordPress 7.0 and later) and the
 * provider the site owner connected under Settings → Connectors. This plugin
 * stores no AI credentials and calls no AI provider itself. Add-ons can supply
 * a different engine through the `sidcraft_page_builder_ai_chat_complete` filter.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Ai;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AiChat {
	/**
	 * Option used by 1.2.1–1.2.2 for the chat's own API key; removed on upgrade.
	 */
	const LEGACY_OPTION = 'sidcraft_page_builder_ai_chat';
	const NS            = 'sidcraft-page-builder/v1';
	const TIMEOUT       = 120;
	const MAX_TOKENS    = 8192;
	const MAX_MESSAGES  = 40;
	const MAX_TEXT      = 60000;
	const MAX_CONTEXT   = 120000;
	const RATE          = 20;

	/**
	 * @return void
	 */
	public static function init() {
		add_action( 'sidcraft_page_builder_rest_register_routes', array( self::class, 'routes' ) );
		add_action( 'sidcraft_page_builder_editor_enqueue', array( self::class, 'enqueue' ), 30 );
		add_filter( 'sidcraft_page_builder_editor_localize_data', array( self::class, 'localize' ), 40, 2 );
		add_action( 'admin_init', array( self::class, 'drop_legacy_key' ) );
	}

	/**
	 * Earlier versions kept their own encrypted API key. The chat now uses the
	 * site's Connectors, so the stored key is deleted.
	 *
	 * @return void
	 */
	public static function drop_legacy_key() {
		if ( false !== get_option( self::LEGACY_OPTION, false ) ) {
			delete_option( self::LEGACY_OPTION );
		}
	}

	/* ------------------------------------------------------------------ *
	 * WordPress AI Client
	 * ------------------------------------------------------------------ */

	/**
	 * Whether this WordPress has the AI Client (7.0 and later) and AI is allowed.
	 *
	 * @return bool
	 */
	public static function client_available() {
		return function_exists( 'wp_ai_client_prompt' ) && function_exists( 'wp_supports_ai' ) && wp_supports_ai() && class_exists( '\\WordPress\\AiClient\\AiClient' );
	}

	/**
	 * Names of the connected AI providers (Settings → Connectors).
	 *
	 * @return string[]
	 */
	public static function connected_providers() {
		if ( ! self::client_available() ) {
			return array();
		}
		$names = array();
		try {
			$registry = \WordPress\AiClient\AiClient::defaultRegistry();
			foreach ( $registry->getRegisteredProviderIds() as $id ) {
				if ( ! $registry->isProviderConfigured( $id ) ) {
					continue;
				}
				$name  = (string) $id;
				$class = $registry->getProviderClassName( $id );
				if ( is_callable( array( $class, 'metadata' ) ) ) {
					$name = (string) $class::metadata()->getName();
				}
				$names[] = $name;
			}
		} catch ( \Throwable $e ) {
			return array();
		}
		return $names;
	}

	/**
	 * Settings and engine flags the chat panel needs. Add-ons adjust them through
	 * `sidcraft_page_builder_ai_chat_config` (for example to add image input).
	 *
	 * @return array
	 */
	public static function config() {
		$available = self::client_available();
		$connected = $available ? self::connected_providers() : array();
		$admin     = self::can_configure();
		if ( ! $available ) {
			$notice = __( 'The AI Chat Bot uses the AI Client built into WordPress 7.0 and later. Update WordPress, then connect an AI provider under Settings → Connectors. HTML import works now.', 'sidcraft-page-builder' );
		} elseif ( ! $connected ) {
			$notice = $admin
				? __( 'Connect an AI provider such as OpenAI, Anthropic or Google under Settings → Connectors. Every plugin that uses AI shares that connection.', 'sidcraft-page-builder' )
				: __( 'Ask an administrator to connect an AI provider under Settings → Connectors.', 'sidcraft-page-builder' );
		} else {
			$notice = __( 'The AI Chat Bot uses the AI providers connected under Settings → Connectors.', 'sidcraft-page-builder' );
		}
		$cfg = array(
			'engine'        => 'lite',
			'ready'         => (bool) $connected,
			'provider'      => '',
			'providerLabel' => $connected ? implode( ', ', $connected ) : __( 'Not connected', 'sidcraft-page-builder' ),
			'model'         => '',
			'canConfigure'  => $admin,
			'managedBy'     => __( 'WordPress Settings → Connectors', 'sidcraft-page-builder' ),
			'settingsUrl'   => $available && $admin ? admin_url( 'options-connectors.php' ) : '',
			'settingsLabel' => __( 'Open Connectors', 'sidcraft-page-builder' ),
			'notice'        => $notice,
			'images'        => false,
			'maxImages'     => 0,
			'html'          => true,
			'rest'          => esc_url_raw( rest_url( self::NS . '/ai-chat' ) ),
			'proUrl'        => 'https://canvasly.pro/price.html#lite-vs-pro',
			'privacy'       => __( 'Your messages and an outline of this page are sent to the AI provider connected on this site. Images are sent only when you attach them.', 'sidcraft-page-builder' ),
		);
		/**
		 * Filter the AI Chat Bot configuration sent to the editor.
		 *
		 * @param array $cfg
		 */
		$filtered = apply_filters( 'sidcraft_page_builder_ai_chat_config', $cfg );
		return is_array( $filtered ) ? array_merge( $cfg, $filtered ) : $cfg;
	}

	/**
	 * Answer a turn with the WordPress AI Client. The plan comes back as JSON
	 * text (see text_plan_instructions()).
	 *
	 * @param string  $system   System instruction.
	 * @param array[] $messages Neutral transcript { role, content }.
	 * @return array{content:string,tool_calls:array}|\WP_Error
	 */
	public static function complete( $system, array $messages ) {
		if ( ! self::client_available() ) {
			return new \WP_Error( 'sidcraft_page_builder_ai_unavailable', __( 'The AI Chat Bot needs WordPress 7.0 or later with an AI provider connected under Settings → Connectors.', 'sidcraft-page-builder' ) );
		}
		if ( ! self::connected_providers() ) {
			return new \WP_Error( 'sidcraft_page_builder_ai_setup', __( 'Connect an AI provider under Settings → Connectors to chat.', 'sidcraft-page-builder' ) );
		}
		try {
			$history = array();
			foreach ( $messages as $m ) {
				$part      = new \WordPress\AiClient\Messages\DTO\MessagePart( (string) $m['content'] );
				$history[] = 'assistant' === $m['role']
					? new \WordPress\AiClient\Messages\DTO\ModelMessage( array( $part ) )
					: new \WordPress\AiClient\Messages\DTO\UserMessage( array( $part ) );
			}
			$options = new \WordPress\AiClient\Providers\Http\DTO\RequestOptions();
			$options->setTimeout( (float) self::TIMEOUT );
			$text = wp_ai_client_prompt( $history )
				->using_system_instruction( (string) $system )
				->using_max_tokens( self::MAX_TOKENS )
				->using_request_options( $options )
				->generate_text();
		} catch ( \Throwable $e ) {
			return new \WP_Error( 'sidcraft_page_builder_ai_client', __( 'The AI request could not be prepared.', 'sidcraft-page-builder' ) );
		}
		if ( is_wp_error( $text ) ) {
			return $text;
		}
		return array(
			'content'    => (string) $text,
			'tool_calls' => array(),
		);
	}

	/**
	 * @return bool
	 */
	public static function can_configure() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * @param int $post_id
	 * @return void
	 */
	public static function enqueue( $post_id = 0 ) {
		unset( $post_id );
		$root = SIDCRAFT_PAGE_BUILDER_PATH;
		$ver  = SIDCRAFT_PAGE_BUILDER_VERSION . '-' . ( file_exists( $root . 'assets/js/editor-ai.js' ) ? filemtime( $root . 'assets/js/editor-ai.js' ) : '0' );
		wp_enqueue_style( 'sidcraft-page-builder-editor-ai', SIDCRAFT_PAGE_BUILDER_URL . 'assets/css/editor-ai.css', array( 'sidcraft-page-builder-editor' ), $ver );
		wp_enqueue_script( 'sidcraft-page-builder-editor-ai', SIDCRAFT_PAGE_BUILDER_URL . 'assets/js/editor-ai.js', array( 'sidcraft-page-builder-editor' ), $ver, true );
	}

	/**
	 * @param array $data
	 * @param int   $post_id
	 * @return array
	 */
	public static function localize( $data, $post_id = 0 ) {
		unset( $post_id );
		if ( ! is_array( $data ) ) {
			$data = array();
		}
		$data['aiChat'] = self::config();
		return $data;
	}


	/* ------------------------------------------------------------------ *
	 * REST
	 * ------------------------------------------------------------------ */

	/**
	 * @param string $ns
	 * @return void
	 */
	public static function routes( $ns = self::NS ) {
		$ns = is_string( $ns ) && '' !== $ns ? $ns : self::NS;
		register_rest_route(
			$ns,
			'/ai-chat',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'rest_turn' ),
				'permission_callback' => array( self::class, 'can_chat' ),
			)
		);
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return bool
	 */
	public static function can_chat( $request ) {
		$post_id = absint( $request->get_param( 'post_id' ) );
		if ( class_exists( '\\SidcraftPageBuilder\\Settings\\Roles' ) && ! \SidcraftPageBuilder\Settings\Roles::can_edit() ) {
			return false;
		}
		return $post_id ? current_user_can( 'edit_post', $post_id ) : current_user_can( 'edit_pages' );
	}

	/**
	 * One chat turn.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function rest_turn( $request ) {
		$limited = self::rate_limit();
		if ( is_wp_error( $limited ) ) {
			return $limited;
		}
		$messages = self::clean_messages( $request->get_param( 'messages' ) );
		if ( ! $messages ) {
			return new \WP_Error( 'sidcraft_page_builder_ai_empty', __( 'Type a message first.', 'sidcraft-page-builder' ), array( 'status' => 400 ) );
		}
		$context = $request->get_param( 'context' );
		$context = is_string( $context ) ? $context : (string) wp_json_encode( $context );
		$context = wp_check_invalid_utf8( substr( $context, 0, self::MAX_CONTEXT ) );
		$images  = $request->get_param( 'images' );
		$images  = is_array( $images ) ? $images : array();
		$system  = self::system_prompt() . "\n\n# Current editor state (JSON)\n" . $context;
		$tools   = array( self::plan_tool() );
		/**
		 * Whether the engine answering this turn supports tool calling. The
		 * WordPress AI Client path returns the plan as JSON text, parsed the
		 * same way as a tool call; add-on engines with tool calling return true.
		 *
		 * @param bool $supports
		 */
		if ( ! apply_filters( 'sidcraft_page_builder_ai_chat_tools', false ) ) {
			$system .= "\n\n" . self::text_plan_instructions();
		}

		/**
		 * Let an add-on answer the turn (for example with image input).
		 * Return null to use the WordPress AI Client.
		 *
		 * @param null|array|\WP_Error $result   { content: string, tool_calls: array }.
		 * @param string               $system   System prompt.
		 * @param array                $messages Neutral transcript.
		 * @param array                $images   Raw images from the request.
		 * @param array                $tools    Tool definitions.
		 */
		$result = apply_filters( 'sidcraft_page_builder_ai_chat_complete', null, $system, $messages, $images, $tools );
		if ( null === $result ) {
			if ( $images ) {
				return new \WP_Error( 'sidcraft_page_builder_ai_images', __( 'Image input is not available with this connection.', 'sidcraft-page-builder' ), array( 'status' => 400 ) );
			}
			$result = self::complete( $system, $messages );
		}
		if ( is_wp_error( $result ) ) {
			$result->add_data( array( 'status' => 502 ) );
			return $result;
		}
		$reply = is_array( $result ) ? (string) ( $result['content'] ?? '' ) : '';
		$plan  = null;
		foreach ( (array) ( $result['tool_calls'] ?? array() ) as $call ) {
			if ( is_array( $call ) && 'propose_plan' === ( $call['name'] ?? '' ) && is_array( $call['arguments'] ?? null ) ) {
				$plan = self::clean_plan( $call['arguments'] );
				break;
			}
		}
		if ( null === $plan && '' !== $reply ) {
			$found = self::plan_from_text( $reply );
			if ( $found ) {
				$plan  = $found['plan'];
				$reply = trim( $found['rest'] );
			}
		}
		return rest_ensure_response(
			array(
				'reply' => wp_kses_post( $reply ),
				'plan'  => $plan,
			)
		);
	}

	/**
	 * @return true|\WP_Error
	 */
	private static function rate_limit() {
		$key   = 'sidsyn_ai_chat_' . get_current_user_id();
		$count = (int) get_transient( $key );
		if ( $count >= self::RATE ) {
			return new \WP_Error( 'sidcraft_page_builder_ai_rate', __( 'Too many requests. Wait a minute and try again.', 'sidcraft-page-builder' ), array( 'status' => 429 ) );
		}
		set_transient( $key, $count + 1, MINUTE_IN_SECONDS );
		return true;
	}

	/**
	 * @param mixed $raw
	 * @return array[]
	 */
	public static function clean_messages( $raw ) {
		$out = array();
		foreach ( array_slice( is_array( $raw ) ? $raw : array(), - self::MAX_MESSAGES ) as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$role = ( $row['role'] ?? '' ) === 'assistant' ? 'assistant' : 'user';
			$text = wp_check_invalid_utf8( substr( (string) ( $row['content'] ?? '' ), 0, self::MAX_TEXT ) );
			if ( '' === trim( $text ) ) {
				continue;
			}
			$out[] = array(
				'role'    => $role,
				'content' => $text,
			);
		}
		while ( $out && 'user' !== $out[0]['role'] ) {
			array_shift( $out );
		}
		return $out;
	}

	/**
	 * Keep the plan JSON-shaped; the browser validates every operation again.
	 *
	 * @param array $args
	 * @return array|null
	 */
	public static function clean_plan( array $args ) {
		$ops = $args['ops'] ?? array();
		if ( is_string( $ops ) ) {
			$ops = json_decode( $ops, true );
		}
		if ( ! is_array( $ops ) || ! $ops ) {
			return null;
		}
		return array(
			'title'   => sanitize_text_field( (string) ( $args['title'] ?? '' ) ),
			'summary' => sanitize_textarea_field( (string) ( $args['summary'] ?? '' ) ),
			'ops'     => array_values( array_slice( array_filter( $ops, 'is_array' ), 0, 400 ) ),
		);
	}

	/**
	 * Instructions for providers that cannot call tools.
	 *
	 * @return string
	 */
	public static function text_plan_instructions() {
		return "# Returning a plan without tools\nWhen the user asks for a change, reply with one short sentence and then the plan as a single JSON object in a ```json code block: {\"title\": \"...\", \"summary\": \"...\", \"ops\": [ ... ]}. Use exactly the operations described above. Do not add citations or links inside the JSON.";
	}

	/**
	 * Some models print the plan as JSON instead of calling the tool.
	 *
	 * @param string $text
	 * @return array{plan:array,rest:string}|null
	 */
	private static function plan_from_text( $text ) {
		$candidates = array();
		if ( preg_match_all( '/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i', $text, $fenced, PREG_SET_ORDER ) ) {
			foreach ( $fenced as $m ) {
				$candidates[] = array( $m[0], $m[1] );
			}
		}
		if ( preg_match( '/\{[\s\S]*"ops"\s*:\s*\[[\s\S]*\}/', $text, $m ) ) {
			$candidates[] = array( $m[0], $m[0] );
		}
		foreach ( $candidates as $c ) {
			$data = json_decode( $c[1], true );
			$plan = is_array( $data ) ? self::clean_plan( $data ) : null;
			if ( $plan ) {
				return array(
					'plan' => $plan,
					'rest' => str_replace( $c[0], '', $text ),
				);
			}
		}
		return null;
	}

	/**
	 * The only tool the editor chat uses.
	 *
	 * @return array{name:string,description:string,schema:array}
	 */
	public static function plan_tool() {
		return array(
			'name'        => 'propose_plan',
			'description' => 'Propose a change to the open page as an ordered list of operations. The user previews the plan on the canvas and applies it. Call this for every change request.',
			'schema'      => array(
				'type'       => 'object',
				'properties' => array(
					'title'   => array(
						'type'        => 'string',
						'description' => 'Short name of the change, at most 6 words, shown on the undo step.',
					),
					'summary' => array(
						'type'        => 'string',
						'description' => 'One or two sentences on what the plan does.',
					),
					'ops'     => array(
						'type'        => 'array',
						'description' => 'Operations applied in order. See the system prompt for each op.',
						'items'       => array(
							'type'                 => 'object',
							'properties'           => array(
								'op' => array(
									'type' => 'string',
									'enum' => array( 'insert', 'update', 'move', 'remove', 'class', 'var', 'add_class', 'remove_class' ),
								),
							),
							'required'             => array( 'op' ),
							'additionalProperties' => true,
						),
					),
				),
				'required'   => array( 'title', 'ops' ),
			),
		);
	}

	/**
	 * Instructions shared by every engine.
	 *
	 * @return string
	 */
	public static function system_prompt() {
		$prompt = <<<'PROMPT'
You are the AI Chat Bot inside Sidcraft Page Builder, a visual WordPress page builder. Act as a senior UI designer and front-end developer. You change the open page only by proposing a plan: call the propose_plan tool when it is available, otherwise return the plan as JSON as described at the end of these instructions. The user previews your plan on the canvas, then applies or discards it. For questions that need no change, answer in short plain text without calling the tool.

# Building blocks
Prefer XEditor elements for new layouts. Each prints one clean HTML element and is styled with reusable classes.
- xe_div_block: generic box. settings: tag (div|section|article|header|footer|main|nav|aside).
- xe_flexbox: flex row/column. settings: direction (row|column), justify (flex-start|center|flex-end|space-between), align (stretch|flex-start|center|flex-end), wrap (wrap|nowrap), gap ("24px").
- xe_grid: CSS grid. settings: columns ("3"), template ("2fr 1fr", overrides columns), col_gap, row_gap.
- xe_heading: settings: text, tag (h1..h6), link.
- xe_paragraph: settings: text (basic inline HTML allowed: strong, em, a, br, span), tag (p).
- xe_image: settings: source "url", src (image URL or ""), alt. Never invent image URLs: use "" so a placeholder shows, and write a helpful alt text.
- xe_button: settings: text, link ("#" when unknown).
Containers (xe_div_block, xe_flexbox, xe_grid) take children. Classic units listed in "units" may also be used when they fit better (forms, price tables, tabs, accordions, sliders); keep their settings minimal.
Responsive values are objects keyed by breakpoint, for example "columns": {"desktop":"3","tablet":"2","mobile":"1"}.

# Styling
Style with classes, not inline settings. Every node has settings.xe_classes: an array of class names (without the "xe-class-" prefix).
- Create or change a class: {"op":"class","name":"card","styles":{"base":{"desktop":{"padding":"24px","border-radius":"12px"},"mobile":{"padding":"16px"}},"hover":{"desktop":{"transform":"translateY(-4px)"}}}}. States: base, hover, focus, active. Breakpoints: desktop, tablet, mobile. Use plain CSS property names and values.
- Create or change a design variable: {"op":"var","name":"brand","type":"color|font|size|spacing|custom","value":"#0052FF"}. Use it in class values as var(--xe-var-brand).
- Reuse existing classes and variables from the editor state before creating new ones. Name them by role (section, container, card, btn-primary, eyebrow), lowercase with hyphens.

# Operations (applied in order)
- {"op":"insert","parent":"<node id or null for the page root>","index":<optional position>,"nodes":[Node,...]}
  Node = {"type":"xe_div_block","ref":"<optional name you choose>","settings":{...},"children":[Node,...]}.
  Later ops may target a new node as "ref:<name>".
- {"op":"update","id":"<node id>","settings":{"text":"New text","columns":{"desktop":"2"}}}  Only the given keys change.
- {"op":"move","id":"<node id>","parent":"<node id or null>","index":<position>}
- {"op":"remove","id":"<node id>"}
- {"op":"add_class","id":"<node id>","classes":["card"]} and {"op":"remove_class","id":"<node id>","classes":["card"]}
- {"op":"class",...} and {"op":"var",...} as above.

# Rules
- Respect the scope in the editor state. "selected": change only the selected node and its children, or insert next to it. "page": the whole page. "site": design variables and classes shared by every page; say in the summary that the change is site-wide.
- When the selected node is a container and the user asks for a new section, insert inside or after it as asked; with nothing selected, insert at the page root.
- Build full, polished sections: realistic copy in the user's language, clear hierarchy, consistent spacing (8px scale), accessible color contrast, mobile-friendly breakpoints (stack columns on mobile).
- For an image of a design: recreate its structure, spacing, type scale and palette as closely as you can with containers, classes and variables. Mention in the summary anything you could not reproduce.
- For HTML or CSS from the user: keep its structure and text, map tags to XEditor elements, and turn repeated styles into classes and colors into variables.
- Use only node ids that exist in the editor state, or refs you created earlier in the same plan.
- Keep plans focused: no more than about 150 operations.
PROMPT;
		/**
		 * Filter the AI Chat Bot instructions.
		 *
		 * @param string $prompt
		 */
		return (string) apply_filters( 'sidcraft_page_builder_ai_chat_prompt', $prompt );
	}

}
