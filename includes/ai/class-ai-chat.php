<?php
/**
 * AI Chat Bot: the in-editor design assistant.
 *
 * The chat panel (assets/js/editor-ai.js) sends the conversation plus a compact
 * outline of the open page. The model answers with text, or with a plan of node
 * operations through the `propose_plan` tool. Plans are previewed on the canvas
 * and applied in the browser through the normal editor history, so nothing is
 * written to the page until the user applies the plan and saves.
 *
 * This plugin talks to OpenAI, Anthropic or Google Gemini with the site owner's
 * own API key, and only when someone sends a chat message. Add-ons can supply a
 * different engine through the `sidcraft_page_builder_ai_chat_complete` filter.
 *
 * @package SidcraftPageBuilder
 */

namespace SidcraftPageBuilder\Ai;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AiChat {
	const OPTION       = 'sidcraft_page_builder_ai_chat';
	const NS           = 'sidcraft-page-builder/v1';
	const TIMEOUT      = 90;
	const MAX_TOKENS   = 8192;
	const MAX_MESSAGES = 40;
	const MAX_TEXT     = 60000;
	const MAX_CONTEXT  = 120000;
	const RATE         = 20;
	const AZURE_API_VERSION = '2024-10-21';

	/**
	 * @return void
	 */
	public static function init() {
		add_action( 'sidcraft_page_builder_rest_register_routes', array( self::class, 'routes' ) );
		add_action( 'sidcraft_page_builder_editor_enqueue', array( self::class, 'enqueue' ), 30 );
		add_filter( 'sidcraft_page_builder_editor_localize_data', array( self::class, 'localize' ), 40, 2 );
	}

	/* ------------------------------------------------------------------ *
	 * Providers and settings
	 * ------------------------------------------------------------------ */

	/**
	 * Providers this plugin can call directly.
	 *
	 * The same providers as Sidcraft Builder Pro's AI Connectivity screen, except
	 * Cursor, which has no chat API. Providers without tool calling (Perplexity)
	 * return the plan as JSON text instead.
	 *
	 * @return array<string,array{label:string,base:string,format:string,models:string[],tools:bool,endpoint:bool}>
	 */
	public static function providers() {
		$row = static function ( $label, $base, $format, array $models, $tools = true, $endpoint = false ) {
			return array(
				'label'    => $label,
				'base'     => $base,
				'format'   => $format,
				'models'   => $models,
				'tools'    => $tools,
				'endpoint' => $endpoint,
			);
		};
		return array(
			'openai'     => $row( 'OpenAI', 'https://api.openai.com/v1', 'openai', array( 'gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1' ) ),
			'anthropic'  => $row( 'Anthropic', 'https://api.anthropic.com/v1', 'anthropic', array( 'claude-sonnet-4-5', 'claude-haiku-4-5' ) ),
			'gemini'     => $row( 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta', 'gemini', array( 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash' ) ),
			'azure'      => $row( 'Azure OpenAI', '', 'azure', array( 'gpt-4o', 'gpt-4o-mini' ), true, true ),
			'perplexity' => $row( 'Perplexity', 'https://api.perplexity.ai', 'openai', array( 'sonar', 'sonar-pro' ), false ),
			'groq'       => $row( 'Groq', 'https://api.groq.com/openai/v1', 'openai', array( 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b' ) ),
			'mistral'    => $row( 'Mistral', 'https://api.mistral.ai/v1', 'openai', array( 'mistral-small-latest', 'mistral-large-latest' ) ),
			'deepseek'   => $row( 'DeepSeek', 'https://api.deepseek.com', 'openai', array( 'deepseek-chat', 'deepseek-reasoner' ) ),
		);
	}

	/**
	 * Azure OpenAI resource endpoint: https://NAME.openai.azure.com or
	 * https://NAME.cognitiveservices.azure.com, scheme and host only.
	 *
	 * @param string $url
	 * @return string
	 */
	public static function clean_endpoint( $url ) {
		$url  = trim( (string) $url );
		$host = strtolower( (string) wp_parse_url( $url, PHP_URL_HOST ) );
		if ( 'https' !== strtolower( (string) wp_parse_url( $url, PHP_URL_SCHEME ) ) || ! self::is_azure_host( $host ) ) {
			return '';
		}
		return 'https://' . $host;
	}

	/**
	 * @param string $host
	 * @return bool
	 */
	private static function is_azure_host( $host ) {
		return (bool) preg_match( '/^[a-z0-9][a-z0-9-]{1,62}\.(openai\.azure\.com|cognitiveservices\.azure\.com)$/', (string) $host );
	}

	/**
	 * Saved settings with the key decrypted.
	 *
	 * @return array{provider:string,model:string,key:string,endpoint:string}
	 */
	public static function settings() {
		$raw       = get_option( self::OPTION, array() );
		$raw       = is_array( $raw ) ? $raw : array();
		$providers = self::providers();
		$provider  = sanitize_key( (string) ( $raw['provider'] ?? '' ) );
		if ( ! isset( $providers[ $provider ] ) ) {
			$provider = '';
		}
		return array(
			'provider' => $provider,
			'model'    => self::clean_model( (string) ( $raw['model'] ?? '' ) ),
			'key'      => self::decrypt( (string) ( $raw['key'] ?? '' ) ),
			'endpoint' => self::clean_endpoint( (string) ( $raw['endpoint'] ?? '' ) ),
		);
	}

	/**
	 * @param string $model
	 * @return string
	 */
	private static function clean_model( $model ) {
		return substr( preg_replace( '/[^A-Za-z0-9._:\/-]/', '', $model ), 0, 100 );
	}

	/**
	 * @return bool
	 */
	public static function can_configure() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Settings and engine flags the chat panel needs. Add-ons adjust them through
	 * `sidcraft_page_builder_ai_chat_config` (for example to add image input).
	 *
	 * @return array
	 */
	public static function config() {
		$s         = self::settings();
		$providers = self::providers();
		$list      = array();
		foreach ( $providers as $id => $row ) {
			$list[] = array(
				'id'       => $id,
				'label'    => $row['label'],
				'models'   => $row['models'],
				'endpoint' => $row['endpoint'],
				'tools'    => $row['tools'],
			);
		}
		$cfg = array(
			'engine'        => 'lite',
			'ready'         => '' !== $s['provider'] && '' !== $s['key'] && ( empty( $providers[ $s['provider'] ]['endpoint'] ) || '' !== $s['endpoint'] ),
			'endpoint'      => $s['endpoint'],
			'provider'      => $s['provider'],
			'providerLabel' => '' !== $s['provider'] ? $providers[ $s['provider'] ]['label'] : '',
			'model'         => '' !== $s['model'] ? $s['model'] : ( '' !== $s['provider'] ? $providers[ $s['provider'] ]['models'][0] : '' ),
			'hasKey'        => '' !== $s['key'],
			'providers'     => $list,
			'canConfigure'  => self::can_configure(),
			'managedBy'     => '',
			'settingsUrl'   => '',
			'images'        => false,
			'maxImages'     => 0,
			'html'          => true,
			'rest'          => esc_url_raw( rest_url( self::NS . '/ai-chat' ) ),
			'restSettings'  => esc_url_raw( rest_url( self::NS . '/ai-chat/settings' ) ),
			'proUrl'        => 'https://canvasly.pro/price.html#lite-vs-pro',
			'privacy'       => __( 'Your messages and an outline of this page are sent to the AI provider you connect. Images are sent only when you attach them.', 'sidcraft-page-builder' ),
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
		register_rest_route(
			$ns,
			'/ai-chat/settings',
			array(
				'methods'             => array( 'GET', 'POST' ),
				'callback'            => array( self::class, 'rest_settings' ),
				'permission_callback' => array( self::class, 'can_configure' ),
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
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function rest_settings( $request ) {
		if ( 'POST' === $request->get_method() ) {
			$body      = (array) $request->get_json_params();
			$providers = self::providers();
			$old       = get_option( self::OPTION, array() );
			$old       = is_array( $old ) ? $old : array();
			$provider  = sanitize_key( (string) ( $body['provider'] ?? '' ) );
			if ( '' !== $provider && ! isset( $providers[ $provider ] ) ) {
				return new \WP_Error( 'sidcraft_page_builder_ai_provider', __( 'Choose a supported AI provider.', 'sidcraft-page-builder' ), array( 'status' => 400 ) );
			}
			$new = array(
				'provider' => $provider,
				'model'    => self::clean_model( (string) ( $body['model'] ?? '' ) ),
				'key'      => (string) ( $old['key'] ?? '' ),
				'endpoint' => '',
			);
			if ( '' !== $provider && ! empty( $providers[ $provider ]['endpoint'] ) ) {
				$new['endpoint'] = self::clean_endpoint( (string) ( $body['endpoint'] ?? '' ) );
				if ( '' === $new['endpoint'] ) {
					return new \WP_Error( 'sidcraft_page_builder_ai_endpoint', __( 'Enter your Azure OpenAI endpoint, for example https://your-resource.openai.azure.com.', 'sidcraft-page-builder' ), array( 'status' => 400 ) );
				}
				if ( '' === $new['model'] ) {
					return new \WP_Error( 'sidcraft_page_builder_ai_deployment', __( 'Enter the name of your Azure OpenAI deployment.', 'sidcraft-page-builder' ), array( 'status' => 400 ) );
				}
			}
			if ( ! empty( $body['clearKey'] ) || '' === $provider ) {
				$new['key'] = '';
			}
			$key = trim( sanitize_text_field( (string) ( $body['key'] ?? '' ) ) );
			if ( '' !== $key ) {
				if ( strlen( $key ) < 20 || preg_match( '/\s/', $key ) ) {
					return new \WP_Error( 'sidcraft_page_builder_ai_key', __( 'That does not look like an API key.', 'sidcraft-page-builder' ), array( 'status' => 400 ) );
				}
				$new['key'] = self::encrypt( $key );
			}
			update_option( self::OPTION, $new, false );
		}
		return rest_ensure_response( self::config() );
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
		 * Whether the active connection supports tool calling. Without it the
		 * model is asked to return the plan as JSON text, which is parsed the same way.
		 *
		 * @param bool $supports
		 */
		if ( ! apply_filters( 'sidcraft_page_builder_ai_chat_tools', self::provider_tools() ) ) {
			$system .= "\n\n" . self::text_plan_instructions();
		}

		/**
		 * Let an add-on answer the turn (for example with image input).
		 * Return null to use this plugin's own client.
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
			$result = self::complete( $system, $messages, $tools );
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
	 * Whether this plugin's saved provider supports tool calling.
	 *
	 * @return bool
	 */
	public static function provider_tools() {
		$s         = self::settings();
		$providers = self::providers();
		return '' === $s['provider'] || ! empty( $providers[ $s['provider'] ]['tools'] );
	}

	/**
	 * Instructions for providers that cannot call tools.
	 *
	 * @return string
	 */
	public static function text_plan_instructions() {
		return "# Returning a plan without tools\nThis connection cannot call tools. When the user asks for a change, reply with one short sentence and then the plan as a single JSON object in a ```json code block: {\"title\": \"...\", \"summary\": \"...\", \"ops\": [ ... ]}. Use exactly the operations described above. Do not add citations or links inside the JSON.";
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
You are the AI Chat Bot inside Sidcraft Page Builder, a visual WordPress page builder. Act as a senior UI designer and front-end developer. You change the open page only by calling the propose_plan tool. The user previews your plan on the canvas, then applies or discards it. For questions that need no change, answer in short plain text without calling the tool.

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

	/* ------------------------------------------------------------------ *
	 * Provider client
	 * ------------------------------------------------------------------ */

	/**
	 * @param string  $system
	 * @param array[] $messages
	 * @param array[] $tools
	 * @return array{content:string,tool_calls:array}|\WP_Error
	 */
	public static function complete( $system, array $messages, array $tools ) {
		$s         = self::settings();
		$providers = self::providers();
		if ( '' === $s['provider'] || '' === $s['key'] ) {
			return new \WP_Error( 'sidcraft_page_builder_ai_setup', __( 'Connect an AI provider first: open the settings in the AI Chat Bot panel.', 'sidcraft-page-builder' ) );
		}
		$row   = $providers[ $s['provider'] ];
		$model = '' !== $s['model'] ? $s['model'] : $row['models'][0];
		if ( empty( $row['tools'] ) ) {
			$tools = array();
		}
		switch ( $row['format'] ) {
			case 'anthropic':
				return self::anthropic( $row['base'], $model, $s['key'], $system, $messages, $tools );
			case 'gemini':
				return self::gemini( $row['base'], $model, $s['key'], $system, $messages, $tools );
			case 'azure':
				if ( '' === $s['endpoint'] ) {
					return new \WP_Error( 'sidcraft_page_builder_ai_setup', __( 'Enter your Azure OpenAI endpoint in the AI Chat Bot settings.', 'sidcraft-page-builder' ) );
				}
				return self::openai(
					$s['endpoint'] . '/openai/deployments/' . rawurlencode( $model ) . '/chat/completions?api-version=' . self::AZURE_API_VERSION,
					'',
					array( 'api-key' => $s['key'] ),
					$system,
					$messages,
					$tools
				);
			default:
				return self::openai( $row['base'] . '/chat/completions', $model, array( 'Authorization' => 'Bearer ' . $s['key'] ), $system, $messages, $tools );
		}
	}

	/**
	 * @return array|\WP_Error
	 */
	private static function openai( $url, $model, array $auth, $system, array $messages, array $tools ) {
		$out = array(
			array(
				'role'    => 'system',
				'content' => $system,
			),
		);
		foreach ( $messages as $m ) {
			$out[] = array(
				'role'    => $m['role'],
				'content' => $m['content'],
			);
		}
		$body = array( 'messages' => $out );
		if ( '' !== $model ) {
			$body['model'] = $model;
		}
		foreach ( $tools as $tool ) {
			$body['tools'][] = array(
				'type'     => 'function',
				'function' => array(
					'name'        => $tool['name'],
					'description' => $tool['description'],
					'parameters'  => $tool['schema'],
				),
			);
		}
		$data = self::post( $url, $auth, $body );
		if ( is_wp_error( $data ) ) {
			return $data;
		}
		$msg   = $data['choices'][0]['message'] ?? array();
		$calls = array();
		foreach ( (array) ( $msg['tool_calls'] ?? array() ) as $c ) {
			$args    = json_decode( (string) ( $c['function']['arguments'] ?? '' ), true );
			$calls[] = array(
				'name'      => (string) ( $c['function']['name'] ?? '' ),
				'arguments' => is_array( $args ) ? $args : array(),
			);
		}
		return array(
			'content'    => is_string( $msg['content'] ?? null ) ? $msg['content'] : '',
			'tool_calls' => $calls,
		);
	}

	/**
	 * @return array|\WP_Error
	 */
	private static function anthropic( $base, $model, $key, $system, array $messages, array $tools ) {
		$out = array();
		foreach ( $messages as $m ) {
			$last = count( $out ) - 1;
			if ( $last >= 0 && $out[ $last ]['role'] === $m['role'] ) {
				$out[ $last ]['content'] .= "\n\n" . $m['content'];
				continue;
			}
			$out[] = array(
				'role'    => $m['role'],
				'content' => $m['content'],
			);
		}
		$body = array(
			'model'      => $model,
			'max_tokens' => self::MAX_TOKENS,
			'system'     => $system,
			'messages'   => $out,
		);
		foreach ( $tools as $tool ) {
			$body['tools'][] = array(
				'name'         => $tool['name'],
				'description'  => $tool['description'],
				'input_schema' => $tool['schema'],
			);
		}
		$data = self::post(
			$base . '/messages',
			array(
				'x-api-key'         => $key,
				'anthropic-version' => '2023-06-01',
			),
			$body
		);
		if ( is_wp_error( $data ) ) {
			return $data;
		}
		$text  = array();
		$calls = array();
		foreach ( (array) ( $data['content'] ?? array() ) as $b ) {
			if ( 'text' === ( $b['type'] ?? '' ) ) {
				$text[] = (string) $b['text'];
			} elseif ( 'tool_use' === ( $b['type'] ?? '' ) ) {
				$calls[] = array(
					'name'      => (string) $b['name'],
					'arguments' => is_array( $b['input'] ?? null ) ? $b['input'] : array(),
				);
			}
		}
		return array(
			'content'    => implode( "\n\n", $text ),
			'tool_calls' => $calls,
		);
	}

	/**
	 * @return array|\WP_Error
	 */
	private static function gemini( $base, $model, $key, $system, array $messages, array $tools ) {
		$contents = array();
		foreach ( $messages as $m ) {
			$contents[] = array(
				'role'  => 'assistant' === $m['role'] ? 'model' : 'user',
				'parts' => array( array( 'text' => $m['content'] ) ),
			);
		}
		$decl = array();
		foreach ( $tools as $tool ) {
			$decl[] = array(
				'name'                 => $tool['name'],
				'description'          => $tool['description'],
				'parametersJsonSchema' => $tool['schema'],
			);
		}
		$body = array(
			'systemInstruction' => array( 'parts' => array( array( 'text' => $system ) ) ),
			'contents'          => $contents,
			'tools'             => array( array( 'functionDeclarations' => $decl ) ),
		);
		$data = self::post( $base . '/models/' . rawurlencode( $model ) . ':generateContent', array( 'x-goog-api-key' => $key ), $body );
		if ( is_wp_error( $data ) ) {
			return $data;
		}
		$text  = array();
		$calls = array();
		foreach ( (array) ( $data['candidates'][0]['content']['parts'] ?? array() ) as $p ) {
			if ( isset( $p['text'] ) && empty( $p['thought'] ) ) {
				$text[] = (string) $p['text'];
			}
			if ( isset( $p['functionCall']['name'] ) ) {
				$calls[] = array(
					'name'      => (string) $p['functionCall']['name'],
					'arguments' => is_array( $p['functionCall']['args'] ?? null ) ? $p['functionCall']['args'] : array(),
				);
			}
		}
		return array(
			'content'    => implode( "\n\n", $text ),
			'tool_calls' => $calls,
		);
	}

	/**
	 * @param string $url
	 * @param array  $headers
	 * @param array  $body
	 * @return array|\WP_Error
	 */
	private static function post( $url, array $headers, array $body ) {
		$host    = wp_parse_url( $url, PHP_URL_HOST );
		$allowed = array( 'api.openai.com', 'api.anthropic.com', 'generativelanguage.googleapis.com', 'api.perplexity.ai', 'api.groq.com', 'api.mistral.ai', 'api.deepseek.com' );
		if ( 'https' !== wp_parse_url( $url, PHP_URL_SCHEME ) || ( ! in_array( $host, $allowed, true ) && ! self::is_azure_host( $host ) ) ) {
			return new \WP_Error( 'sidcraft_page_builder_ai_endpoint', __( 'The AI provider address is not allowed.', 'sidcraft-page-builder' ) );
		}
		$response = wp_remote_post(
			$url,
			array(
				'timeout'     => self::TIMEOUT,
				'redirection' => 0,
				'headers'     => array_merge(
					array(
						'Content-Type' => 'application/json',
						'Accept'       => 'application/json',
					),
					$headers
				),
				'body'        => wp_json_encode( $body ),
				'data_format' => 'body',
			)
		);
		if ( is_wp_error( $response ) ) {
			return new \WP_Error( 'sidcraft_page_builder_ai_http', __( 'Could not reach the AI provider.', 'sidcraft-page-builder' ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		$data = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( $code < 200 || $code >= 300 ) {
			$detail = is_array( $data ) ? ( $data['error']['message'] ?? ( is_string( $data['error'] ?? null ) ? $data['error'] : '' ) ) : '';
			return new \WP_Error(
				'sidcraft_page_builder_ai_provider',
				/* translators: 1: HTTP status code, 2: provider error message. */
				trim( sprintf( __( 'The AI provider returned HTTP %1$d. %2$s', 'sidcraft-page-builder' ), $code, sanitize_text_field( (string) $detail ) ) )
			);
		}
		return is_array( $data ) ? $data : new \WP_Error( 'sidcraft_page_builder_ai_response', __( 'The AI provider sent a response the chat could not read.', 'sidcraft-page-builder' ) );
	}

	/* ------------------------------------------------------------------ *
	 * Key storage
	 * ------------------------------------------------------------------ */

	/**
	 * @return string
	 */
	private static function secret() {
		return hash( 'sha256', wp_salt( 'auth' ) . '|sidcraft-ai', true );
	}

	/**
	 * @param string $plain
	 * @return string
	 */
	private static function encrypt( $plain ) {
		if ( '' === $plain || ! function_exists( 'openssl_encrypt' ) ) {
			return $plain;
		}
		$iv  = random_bytes( 16 );
		$enc = openssl_encrypt( $plain, 'aes-256-cbc', self::secret(), OPENSSL_RAW_DATA, $iv );
		return false === $enc ? $plain : 'enc:' . base64_encode( $iv . $enc ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Binary ciphertext stored as text.
	}

	/**
	 * @param string $stored
	 * @return string
	 */
	private static function decrypt( $stored ) {
		if ( 0 !== strpos( $stored, 'enc:' ) ) {
			return $stored;
		}
		if ( ! function_exists( 'openssl_decrypt' ) ) {
			return '';
		}
		$raw = base64_decode( substr( $stored, 4 ), true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- Binary ciphertext stored as text.
		if ( false === $raw || strlen( $raw ) < 17 ) {
			return '';
		}
		$plain = openssl_decrypt( substr( $raw, 16 ), 'aes-256-cbc', self::secret(), OPENSSL_RAW_DATA, substr( $raw, 0, 16 ) );
		return false === $plain ? '' : $plain;
	}
}
