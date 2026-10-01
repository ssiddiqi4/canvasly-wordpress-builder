<?php
namespace CanvaslyLite\Units; if(!defined('ABSPATH')) exit;
class Shortcode extends Unit {
 public function type(){return 'shortcode';} public function title(){return __('Shortcode', 'canvasly-lite');} public function icon(){return '[]';} public function category(){return 'basic';}
 public function defaults(){return ['shortcode'=>''];} public function controls(){return ['shortcode'=>'text'];}
 public function styles($settings=[]){
  $code=(string)($settings['shortcode']??'');
  if(!preg_match('/\[wpforms\b/i',$code)) return [];
  return self::wpforms_style_handles();
 }
 /**
  * Style handles WPForms queued for the current request.
  *
  * @return string[]
  */
 public static function wpforms_style_handles(){
  $before=array();
  if(function_exists('wp_styles')){
   $styles=wp_styles();
   $before=is_object($styles)&&isset($styles->queue)&&is_array($styles->queue)?$styles->queue:array();
  }
  if(function_exists('wpforms')){
   $plugin=wpforms();
   $frontend=is_object($plugin)&&method_exists($plugin,'obj')?$plugin->obj('frontend'):null;
   if(is_object($frontend)&&method_exists($frontend,'assets_global')) $frontend->assets_global();
  }
  if(!function_exists('wp_styles')) return array();
  $styles=wp_styles();
  if(!is_object($styles)||!isset($styles->queue)||!is_array($styles->queue)) return array();
  $handles=array();
  foreach(array_diff($styles->queue,$before) as $handle){
   $handle=(string)$handle;
   if(preg_match('/wpforms/i',$handle)) $handles[]=$handle;
  }
  return $handles;
 }
 public function render($s,$children=''){
  $code=(string)($s['shortcode']??'');
  self::prime_form_styles($code);
  $before=self::style_handles();
  $html=function_exists('do_shortcode')?do_shortcode(function_exists('wp_kses_post')?wp_kses_post($code):$code):$code;
  $assets=self::styles_since($before);
  $forms=self::queued_form_styles($html,$before);
  $links=array_values(array_unique(array_merge($assets['links'],$forms['links'])));
  $tags=self::stylesheet_tags($links,'canvasly-lite-shortcode-style');
  $css=trim((string)($assets['css']??'')."\n".(string)($forms['css']??''));
  if($css!==''){
   $css=wp_strip_all_tags($css);
   if($css!=='')$tags.='<style>'.$css.'</style>';
  }
  return '<div class="lb-shortcode">'.$tags.$html.'</div>';
 }

 /**
  * Live form or other shortcode markup for the editor canvas.
  *
  * @param string $code
  * @param int    $post_id
  * @return array{html:string,css:string,links:string[]}
  */
 public static function preview( $code, $post_id = 0 ) {
  $code = self::preview_code( $code );
  if ( '' === $code ) {
   return array( 'html' => '', 'css' => '', 'links' => array() );
  }
  $run = function () use ( $code ) {
   self::prime_form_styles( $code );
   $before = self::style_handles();
   $echoed = '';
   $level  = ob_get_level();
   ob_start();
   $html = function_exists( 'do_shortcode' ) ? (string) do_shortcode( $code ) : $code;
   while ( ob_get_level() > $level ) {
    $echoed = (string) ob_get_clean() . $echoed;
   }
   $html = $echoed . $html;
   if ( class_exists( '\\CanvaslyLite\\Templates\\ThemeChrome' ) ) {
    $html = \CanvaslyLite\Templates\ThemeChrome::safe_html( $html );
   }
   $assets = self::styles_since( $before );
   $forms  = self::queued_form_styles( $html, $before );
   return array(
    'html'  => $html,
    'css'   => trim( $assets['css'] . "\n" . $forms['css'] ),
    'links' => array_values( array_unique( array_merge( $assets['links'], $forms['links'] ) ) ),
   );
  };
  if ( class_exists( '\\CanvaslyLite\\Templates\\ThemeChrome' ) ) {
   return \CanvaslyLite\Templates\ThemeChrome::with_post( absint( $post_id ), $run );
  }
  return $run();
 }

 /**
  * @param mixed $code
  * @return string
  */
 private static function preview_code( $code ) {
  $code = is_string( $code ) ? $code : '';
  if ( function_exists( 'wp_check_invalid_utf8' ) ) {
   $code = (string) wp_check_invalid_utf8( $code );
  }
  $code = preg_replace( '/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $code );
  $code = trim( (string) $code );
  if ( strlen( $code ) > 4000 ) {
   $code = \CanvaslyLite\Utils\Text::cut_bytes( $code, 0, 4000 );
  }
  if ( ! preg_match( '/\[[\w-]+/', $code ) ) {
   return '';
  }
  return $code;
 }

 /**
  * @return string[]
  */
 /**
  * Stylesheet tags for the given URLs, printed by WordPress core's style
  * printer (a private WP_Styles instance) rather than hand-built markup, so
  * the fragment carries them without touching the page's global queue.
  *
  * @param string[] $hrefs
  * @param string   $prefix Handle prefix.
  * @return string
  */
 private static function stylesheet_tags( $hrefs, $prefix ) {
  if ( ! class_exists( '\\WP_Styles' ) ) {
   return '';
  }
  static $printer = null;
  if ( null === $printer ) {
   $printer = new \WP_Styles();
  }
  $tags = '';
  foreach ( (array) $hrefs as $href ) {
   $href = esc_url_raw( (string) $href );
   if ( '' === $href ) {
    continue;
   }
   $handle = $prefix . '-' . substr( md5( $href ), 0, 12 );
   if ( ! isset( $printer->registered[ $handle ] ) ) {
    $printer->add( $handle, $href, array(), null );
   }
   ob_start();
   $printer->do_item( $handle );
   $tags .= (string) ob_get_clean();
  }
  return $tags;
 }

 private static function style_handles() {
  if ( ! function_exists( 'wp_styles' ) ) {
   return array();
  }
  $styles = wp_styles();
  if ( ! is_object( $styles ) || ! isset( $styles->queue ) || ! is_array( $styles->queue ) ) {
   return array();
  }
  return array_values( $styles->queue );
 }

 /**
  * @param string[] $before
  * @return array{css:string,links:string[]}
  */
 private static function styles_since( $before ) {
  $css   = '';
  $links = array();
  if ( ! function_exists( 'wp_styles' ) ) {
   return array( 'css' => '', 'links' => array() );
  }
  $styles = wp_styles();
  if ( ! is_object( $styles ) || ! method_exists( $styles, 'do_item' ) ) {
   return array( 'css' => '', 'links' => array() );
  }
  $after = self::style_handles();
  foreach ( array_diff( $after, $before ) as $handle ) {
   ob_start();
   $styles->do_item( $handle );
   $printed = (string) ob_get_clean();
   if ( preg_match_all( '#<link\b[^>]*\bhref=(["\'])([^"\']+)\1#i', $printed, $found ) ) {
    foreach ( $found[2] as $href ) {
     $links[] = $href;
    }
   }
   if ( preg_match_all( '#<style\b[^>]*>(.*?)</style>#is', $printed, $blocks ) ) {
    $css .= implode( "\n", $blocks[1] );
   }
  }
  return array(
   'css'   => $css,
   'links' => array_values( array_unique( $links ) ),
  );
 }

 /**
  * Ask a form plugin to queue the stylesheet it uses on the public page.
  *
  * @param string $code
  */
 private static function prime_form_styles( $code ) {
  if ( ! preg_match( '/\[wpforms\b/i', (string) $code ) || ! function_exists( 'wpforms' ) ) {
   return;
  }
  $plugin   = wpforms();
  $frontend = is_object( $plugin ) && method_exists( $plugin, 'obj' ) ? $plugin->obj( 'frontend' ) : null;
  if ( is_object( $frontend ) && method_exists( $frontend, 'assets_global' ) ) {
   $frontend->assets_global();
  }
 }

 /**
  * Styles a form plugin queued before the shortcode ran, plus inline theme CSS.
  *
  * @param string   $html
  * @param string[] $already Handles queued before the shortcode. Their inline CSS was not printed with it.
  * @return array{css:string,links:string[]}
  */
 private static function queued_form_styles( $html, $already = array() ) {
  $empty = array( 'css' => '', 'links' => array() );
  if ( ! function_exists( 'wp_styles' ) || ! preg_match( '/wpforms|forminator|fluentform|gform_|nf-form|elementor-form/i', (string) $html ) ) {
   return $empty;
  }
  $styles = wp_styles();
  if ( ! is_object( $styles ) || empty( $styles->registered ) || ! is_array( $styles->registered ) ) {
   return $empty;
  }
  $queue   = isset( $styles->queue ) && is_array( $styles->queue ) ? $styles->queue : array();
  $done    = isset( $styles->done ) && is_array( $styles->done ) ? $styles->done : array();
  $already = is_array( $already ) ? $already : array();
  $forced  = array();
  if ( false !== strpos( (string) $html, 'wpforms-container-full' ) ) {
   $forced = array( 'wpforms-full', 'wpforms-classic-full', 'wpforms-modern-full' );
  } elseif ( false !== strpos( (string) $html, 'wpforms-container-base' ) ) {
   $forced = array( 'wpforms-base', 'wpforms-classic-base', 'wpforms-modern-base' );
  }
  $links   = array();
  $css     = '';
  foreach ( $styles->registered as $handle => $obj ) {
   $handle = (string) $handle;
   if ( ! preg_match( '/wpforms|forminator|fluentform|gravity|gform|nf-|elementor-widget-form/i', $handle ) ) {
    continue;
   }
   if ( ! in_array( $handle, $queue, true ) && ! in_array( $handle, $done, true ) && ! in_array( $handle, $forced, true ) ) {
    continue;
   }
   $src = is_object( $obj ) && isset( $obj->src ) ? (string) $obj->src : '';
   if ( '' !== $src ) {
    if ( ! preg_match( '#^(https?:)?//#i', $src ) && isset( $styles->base_url ) ) {
     $src = rtrim( (string) $styles->base_url, '/' ) . '/' . ltrim( $src, '/' );
    }
    $ver = is_object( $obj ) && isset( $obj->ver ) ? (string) $obj->ver : '';
    if ( '' !== $ver && false === strpos( $src, 'ver=' ) ) {
     $src .= ( false === strpos( $src, '?' ) ? '?' : '&' ) . 'ver=' . rawurlencode( $ver );
    }
    $links[] = $src;
   }
   if ( ! in_array( $handle, $already, true ) && ! in_array( $handle, $forced, true ) ) {
    continue;
   }
   $after = ( is_object( $obj ) && isset( $obj->extra ) && is_array( $obj->extra ) && isset( $obj->extra['after'] ) && is_array( $obj->extra['after'] ) ) ? $obj->extra['after'] : array();
   if ( ! $after ) {
    continue;
   }
   $inline = implode( "\n", $after );
   $inline = wp_strip_all_tags( $inline );
   if ( '' !== trim( $inline ) ) {
    $css .= $inline . "\n";
   }
  }
  return array(
   'css'   => trim( $css ),
   'links' => array_values( array_unique( $links ) ),
  );
 }
}
