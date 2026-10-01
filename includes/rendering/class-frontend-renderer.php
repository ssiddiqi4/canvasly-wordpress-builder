<?php
namespace SidcraftPageBuilder\Rendering;
use SidcraftPageBuilder\Document\DocumentManager;
use SidcraftPageBuilder\Document\DevMode;
use SidcraftPageBuilder\Units\UnitRegistry;
use SidcraftPageBuilder\Design\Interactions;
if(!defined('ABSPATH'))exit;
class FrontendRenderer {
 public static function enqueue(){
  $css=SIDCRAFT_PAGE_BUILDER_PATH.'assets/css/frontend.css';
  $js=SIDCRAFT_PAGE_BUILDER_PATH.'assets/js/frontend.js';
  $ver=SIDCRAFT_PAGE_BUILDER_VERSION.'-'.(file_exists($css)?filemtime($css):time());
  $jsver=SIDCRAFT_PAGE_BUILDER_VERSION.'-'.(file_exists($js)?filemtime($js):time());
  wp_register_style('sidcraft-page-builder-frontend',SIDCRAFT_PAGE_BUILDER_URL.'assets/css/frontend.css',[],$ver);
  wp_style_add_data('sidcraft-page-builder-frontend','rtl','replace');
  wp_register_script('sidcraft-page-builder-frontend',SIDCRAFT_PAGE_BUILDER_URL.'assets/js/frontend.js',[],$jsver,true);
  if(function_exists('wp_script_add_data')) wp_script_add_data('sidcraft-page-builder-frontend','strategy','defer');
  wp_localize_script('sidcraft-page-builder-frontend','SidcraftPageBuilderFrontend',[
   'i18n'=>class_exists('\SidcraftPageBuilder\I18n\I18n')?\SidcraftPageBuilder\I18n\I18n::frontend_strings():[],
   'isRtl'=>function_exists('is_rtl')&&is_rtl(),
   'lightbox'=>class_exists('\\SidcraftPageBuilder\\Settings\\KitSettings')?\SidcraftPageBuilder\Settings\KitSettings::lightbox_public():[],
   'loopRest'=>esc_url_raw(rest_url('sidcraft-page-builder/v1/loop')),
   'formEndpoint'=>esc_url_raw(rest_url('sidcraft-page-builder/v1/form')),
   'lazyLoad'=>class_exists('\\SidcraftPageBuilder\\Design\\Optimize')?\SidcraftPageBuilder\Design\Optimize::lazy_load():true,
  ]);
  $root=[];
  $nodes=[];
  $id=0;
  if(function_exists('is_singular')&&is_singular()){
   $id=function_exists('get_the_ID')?absint(get_the_ID()):0;
   $has=$id&&class_exists('\\SidcraftPageBuilder\\Document\\DocumentManager')&&DocumentManager::has($id);
   $doc=$has?DocumentManager::get($id):[];
   $doc=is_array($doc)?$doc:[];
   list($header,$root,$footer)=self::visible_parts($doc);
   $nodes=array_merge($header,$root,$footer);
   if($nodes&&class_exists('\\SidcraftPageBuilder\\Design\\CssPrint')){
    \SidcraftPageBuilder\Design\CssPrint::enqueue_global();
    if($id)\SidcraftPageBuilder\Design\CssPrint::enqueue_post($id);
   }
   if($id&&$nodes)self::enqueue_google_fonts($nodes);
  }
  /** Fires on wp_enqueue_scripts after core frontend assets are registered. Add-ons register their handles here; unit-declared assets enqueue after. */
  do_action('sidcraft-page-builder/frontend/enqueue');
  if($nodes&&class_exists('\\SidcraftPageBuilder\\Rendering\\FrontendAssets'))\SidcraftPageBuilder\Rendering\FrontendAssets::enqueue($nodes,$id);
  if($nodes&&class_exists('\\SidcraftPageBuilder\\Units\\MenuAnchor'))\SidcraftPageBuilder\Units\MenuAnchor::enqueue();
 }
 /**
  * Enqueue frontend CSS/JS/fonts for an embedded document (shortcode, block, widget).
  */
 public static function enqueue_document_assets($doc,$id=0){
  if(!function_exists('wp_enqueue_style'))return;
  wp_enqueue_style('sidcraft-page-builder-frontend');
  $doc=is_array($doc)?$doc:[];
  $nodes=self::document_nodes($doc);
  self::enqueue_google_fonts($nodes);
  if(class_exists('\\SidcraftPageBuilder\\Rendering\\FrontendAssets'))\SidcraftPageBuilder\Rendering\FrontendAssets::enqueue($nodes,$id);
  elseif(self::needs_frontend_script($nodes,$id))wp_enqueue_script('sidcraft-page-builder-frontend');
  if($nodes&&class_exists('\\SidcraftPageBuilder\\Units\\MenuAnchor'))\SidcraftPageBuilder\Units\MenuAnchor::enqueue();
  if(function_exists('is_singular')&&!is_singular())self::enqueue_global_tokens();
 }
 private static function enqueue_global_tokens(){
  if(class_exists('\\SidcraftPageBuilder\\Design\\CssPrint')){
   \SidcraftPageBuilder\Design\CssPrint::enqueue_global();
   return;
  }
  static $done=false;
  if($done||!function_exists('wp_add_inline_style'))return;
  $css='';
  if(class_exists('\\SidcraftPageBuilder\\Design\\Variables'))$css.=\SidcraftPageBuilder\Design\Variables::css();
  if(class_exists('\\SidcraftPageBuilder\\Design\\ThemeStyle'))$css.=\SidcraftPageBuilder\Design\ThemeStyle::css();
  if(class_exists('\\SidcraftPageBuilder\\Settings\\KitSettings'))$css.=\SidcraftPageBuilder\Settings\KitSettings::css();
  if(class_exists('\\SidcraftPageBuilder\\Design\\GlobalClasses'))$css.=\SidcraftPageBuilder\Design\GlobalClasses::css();
  if(class_exists('\\SidcraftPageBuilder\\Design\\Interactions'))$css.=\SidcraftPageBuilder\Design\Interactions::css();
  if($css){wp_add_inline_style('sidcraft-page-builder-frontend',wp_strip_all_tags($css));$done=true;}
 }
 public static function filter_content($content){
  static $rendering=false;
  if($rendering||is_admin()||!is_singular())return $content;
  $id=get_the_ID();
  if(!$id||!DocumentManager::has($id))return $content;
  $doc=DocumentManager::get($id);$nodes=self::document_nodes($doc);if(!$nodes)return $content;
  $rendering=true;
  try{
   wp_enqueue_style('sidcraft-page-builder-frontend');
   if(class_exists('\\SidcraftPageBuilder\\Design\\CssPrint')){
    \SidcraftPageBuilder\Design\CssPrint::enqueue_for_document($id);
   }else{
    $css=DocumentManager::compiled_css($id);if($css)wp_add_inline_style('sidcraft-page-builder-frontend',wp_strip_all_tags($css));
   }
   self::enqueue_google_fonts($nodes);
   if(class_exists('\\SidcraftPageBuilder\\Rendering\\FrontendAssets'))\SidcraftPageBuilder\Rendering\FrontendAssets::enqueue($nodes,$id);
   elseif(self::needs_frontend_script($nodes,$id))wp_enqueue_script('sidcraft-page-builder-frontend');
   if(class_exists('\\SidcraftPageBuilder\\Units\\MenuAnchor'))\SidcraftPageBuilder\Units\MenuAnchor::enqueue();
   return OutputEscape::render(function()use($doc,$id){return self::render_document($doc,$id);});
  }finally{
   $rendering=false;
  }
 }
 /**
  * Render a document array to the same HTML `the_content` uses.
  * `$id` 0 skips the page wrapper's post id but still wraps `.lb-page`.
  */
 public static function render_document($doc,$id=0){
  $doc=is_array($doc)?$doc:DocumentManager::empty();
  $id=absint($id);
  if(class_exists(DevMode::class))$doc=DevMode::sanitize_document($doc);
  list($header,$root,$footer)=self::visible_parts($doc);
  $settings=is_array($doc['settings']??null)?$doc['settings']:[];
  $template=DocumentManager::normalize_page_template($settings['template']??'default');
  $classes='lb-page';
  if($template==='full_width')$classes.=' lb-page-full-width';
  if($template==='canvas')$classes.=' lb-page-canvas';
  $style='';
  $width=trim((string)($settings['page_width']??''));
  if($width===''&&class_exists('\\SidcraftPageBuilder\\Settings\\KitSettings'))$width=\SidcraftPageBuilder\Settings\KitSettings::content_width();
  if($template==='default'&&$width!=='')$style=' style="--lb-page-width:'.esc_attr($width).'"';
  /** Fires before a Sidcraft Page Builder document is rendered on the frontend. @param int $id @param array $doc */
  do_action('sidcraft-page-builder/frontend/before_render',$id,$doc);
  if(class_exists('\\SidcraftPageBuilder\\Design\\Optimize'))\SidcraftPageBuilder\Design\Optimize::begin(array_merge($header,$root,$footer));
  $html='';
  if($header)$html.='<header class="lb-site-header">'.self::nodes($header,$id).'</header>';
  $html.='<div class="'.esc_attr($classes).'"'.$style.($id?' data-lb-document="'.esc_attr((string)$id).'"':'').'>'.self::nodes($root,$id).'</div>';
  if($footer)$html.='<footer class="lb-site-footer">'.self::nodes($footer,$id).'</footer>';
  if(class_exists('\\SidcraftPageBuilder\\Design\\Optimize'))$html=\SidcraftPageBuilder\Design\Optimize::tune_images($html);
  /** Fires after a Sidcraft Page Builder document has been rendered. @param int $id @param array $doc @param string $html */
  do_action('sidcraft-page-builder/frontend/after_render',$id,$doc,$html);
  return $html;
 }
 /**
  * Render a node list with optional extra dynamic context and unique HTML id suffix
  * (used when a Collection Loop repeats an item template).
  */
 public static function render_nodes($nodes,$post_id=0,$extra_ctx=[],$id_suffix=''){
  return self::nodes($nodes,$post_id,is_array($extra_ctx)?$extra_ctx:[],(string)$id_suffix);
 }
 private static function document_nodes($doc){
  $doc=is_array($doc)?$doc:[];
  list($header,$root,$footer)=self::visible_parts($doc);
  return array_merge($header,$root,$footer);
 }
 /**
  * Header and footer nodes are the document's own areas only when the theme
  * does not already provide both. Otherwise the theme chrome is inherited.
  *
  * @param array $doc
  * @return array{0:array,1:array,2:array}
  */
 private static function visible_parts($doc){
  $doc=is_array($doc)?$doc:[];
  $root=is_array($doc['root']??null)?$doc['root']:[];
  $header=is_array($doc['header']??null)?$doc['header']:[];
  $footer=is_array($doc['footer']??null)?$doc['footer']:[];
  if(class_exists('\\SidcraftPageBuilder\\Templates\\ThemeChrome')&&\SidcraftPageBuilder\Templates\ThemeChrome::provides()){
   $header=[];
   $footer=[];
  }
  return array($header,$root,$footer);
 }
 private static function nodes($nodes,$post_id=0,$extra_ctx=[],$id_suffix=''){
  $html='';
  foreach($nodes as $n){
   if(!is_array($n))continue;
   $html.=self::node($n,$post_id,is_array($extra_ctx)?$extra_ctx:[],(string)$id_suffix);
  }
  return $html;
 }
 private static function node($n,$post_id=0,$extra_ctx=[],$id_suffix=''){
  if(!self::should_render($n,$post_id))return '';
  $use_cache=class_exists('\\SidcraftPageBuilder\\Design\\Optimize')&&\SidcraftPageBuilder\Design\Optimize::cacheable($n,$extra_ctx,$id_suffix);
  if($use_cache){
   $hit=\SidcraftPageBuilder\Design\Optimize::get($n,$post_id);
   if($hit!==null)return $hit;
  }
  $el=UnitRegistry::instance()->get($n['type']??'');
  if(!$el)return '';
  $raw_marks=OutputEscape::marks();
  $s=$n['settings']??[];
  $s=self::resolve_dynamic($s,$post_id,$el,$extra_ctx,$n);
  if(method_exists($el,'render_collection')){
   $inner=$el->render_collection($s,$n,$post_id);
  }elseif(method_exists($el,'render_embed')){
   $inner=$el->render_embed($s,$n,$post_id);
  }else{
   $slotted=method_exists($el,'supports_slots')&&$el->supports_slots();
   $children=$slotted?self::slot_html($el,$n,$post_id,$extra_ctx,$id_suffix):(!empty($n['children'])?self::nodes($n['children'],$post_id,$extra_ctx,$id_suffix):'');
   $inner=$el->render($s,$children);
  }
  $single=method_exists($el,'single_element')&&$el->single_element();
  // XEditor elements skip the generic .lb-node layout rules; they are styled by their classes.
  $classes=$single?'xe-node':'lb-node lb-node-'.sanitize_html_class($n['type']??'');
  if($id_suffix!=='')$classes.=' lb-src-'.sanitize_html_class((string)($n['id']??''));
  if(class_exists(Interactions::class))$classes.=Interactions::classes($n);
  elseif(!empty($s['interaction']))$classes.=' lb-interact-'.sanitize_html_class($s['interaction']);
  $html_id=(string)($n['id']??'');
  if($id_suffix!=='')$html_id.='--'.$id_suffix;
  $data=' data-lb-id="'.esc_attr($n['id']).'"';
  if(class_exists(Interactions::class))$data.=Interactions::data_attrs($n);
  elseif(!empty($s['interaction'])){$data.=' data-lb-interaction="'.esc_attr($s['interaction']).'" data-lb-trigger="'.esc_attr($s['interaction_trigger']??'viewport').'" data-lb-delay="'.esc_attr($s['interaction_delay']??0).'" data-lb-duration="'.esc_attr($s['interaction_duration']??0.6).'" data-lb-repeat="'.(!empty($s['interaction_repeat'])?'1':'0').'" data-lb-threshold="'.esc_attr($s['interaction_threshold']??.15).'" style="--lb-easing:'.esc_attr($s['interaction_easing']??'ease').';"';}
  if(($n['type']??'')==='form' && is_string($inner) && strpos($inner,'</form>')!==false && strpos($inner,'name="_post_id"')===false){
   $eid=preg_replace('/[^A-Za-z0-9_-]/','',(string)($n['id']??''));
   $meta='<input type="hidden" name="_post_id" value="'.esc_attr((string)absint($post_id)).'"><input type="hidden" name="_unit_id" value="'.esc_attr($eid).'">';
   $inner=preg_replace('/<\/form>/',$meta.'</form>',$inner,1);
  }
  /** Filter the inner HTML an unit renders. @param string $inner @param Unit $el @param array $s Resolved settings @param array $n Node */
  $inner=apply_filters('sidcraft-page-builder/unit/render_html',$inner,$el,$s,$n);
  $inner=is_string($inner)?$inner:'';
  if(class_exists('\\SidcraftPageBuilder\\Units\\Unit')){
   $jump=\SidcraftPageBuilder\Units\Unit::jump_target(is_array($s)?($s['css_id']??''):'');
   if($jump!==''&&strpos($inner,$jump)===false)$inner=$jump.$inner;
  }
  $attrs=$el->attrs($s).$data;
  if(!(method_exists($el,'handles_aria')&&$el->handles_aria())){
   list($inner,$attrs)=self::apply_aria($inner,$attrs,$s,$el);
  }
  if(class_exists('\\SidcraftPageBuilder\\Design\\Optimize')){
   $html=\SidcraftPageBuilder\Design\Optimize::wrap($html_id,$classes,$attrs,$inner,$n,$el,is_array($s)?$s:[]);
  }else{
   $html='<div id="lb-node-'.esc_attr($html_id).'" class="'.esc_attr($classes).'"'.$attrs.'>'.$inner.'</div>';
  }
  // Output passed through OutputEscape::raw() holds a per-request placeholder, so it is never cached.
  if($use_cache&&OutputEscape::marks()===$raw_marks)\SidcraftPageBuilder\Design\Optimize::set($n,$post_id,$html);
  return $html;
 }
 /**
  * ARIA Label fix. `aria-label` on the generic wrapper <div> is ignored by assistive
  * technology (a div has no role that supports naming). Move it to the element that
  * can carry an accessible name:
  *  - leaf units with exactly one interactive/named element (a link, button, field,
  *    form, image, iframe, video, audio, nav): the label goes on that element;
  *  - anything else (containers, multi-link units): the wrapper keeps the label and
  *    gets role="group" (unless the user set a Role), which makes the name valid.
  *
  * @param string $inner
  * @param string $attrs
  * @param array  $s
  * @param object $el
  * @return array{0:string,1:string}
  */
 public static function apply_aria($inner,$attrs,$s,$el){
  $label=is_array($s)?trim((string)($s['aria_label']??'')):'';
  if($label===''||!is_string($inner))return [$inner,$attrs];
  // The unit already printed this name on its own element (nav menus, figures): keep that one only.
  if(strpos($inner,'aria-label="'.esc_attr($label).'"')!==false){
   return [$inner,preg_replace('/\saria-label="[^"]*"/','',$attrs,1)];
  }
  $has_role=trim((string)($s['role']??''))!=='';
  $container=is_object($el)&&((method_exists($el,'supports_children')&&$el->supports_children())||(method_exists($el,'supports_slots')&&$el->supports_slots()));
  if(!$has_role&&!$container){
   $pattern='/<(a|button|input|select|textarea|form|img|iframe|video|audio|nav|progress|meter)\b(?![^>]*\btype=["\']?hidden)[^>]*>/i';
   if(preg_match_all($pattern,$inner,$m,PREG_OFFSET_CAPTURE)){
    $tags=array_map('strtolower',$m[1]?array_column($m[1],0):[]);
    $target=null;
    $form=array_search('form',$tags,true);
    if(count($tags)===1)$target=0;
    elseif($form!==false)$target=$form; // search / subscribe forms: name the form landmark.
    if($target!==null){
     $open=$m[0][$target][0];$pos=$m[0][$target][1];
     $clean=preg_replace('/\saria-label=("[^"]*"|\'[^\']*\')/i','',$open);
     $named=preg_replace('/^<([a-zA-Z0-9]+)/','<$1 aria-label="'.esc_attr($label).'"',$clean,1);
     if(strtolower($tags[$target])==='form'&&!preg_match('/\srole=/i',$named)&&preg_match('/type=["\']?search/i',$inner))$named=preg_replace('/^<form/i','<form role="search"',$named,1);
     $inner=substr($inner,0,$pos).$named.substr($inner,$pos+strlen($open));
     $attrs=preg_replace('/\saria-label="[^"]*"/','',$attrs,1);
     return [$inner,$attrs];
    }
   }
  }
  if(!$has_role&&strpos($attrs,' role=')===false)$attrs=' role="group"'.$attrs;
  return [$inner,$attrs];
 }
 /**
  * Whether this node should be printed. Default true. False skips the wrapper, children, and assets.
  *
  * @param array $n
  * @param int   $post_id
  * @return bool
  */
 public static function should_render($n,$post_id=0){
  if(!is_array($n))return false;
  if(!function_exists('apply_filters'))return true;
  $render=apply_filters('sidcraft-page-builder/unit/should_render',true,$n,absint($post_id));
  return false!==$render;
 }
 private static function needs_frontend_script($nodes,$post_id=0){
  if(class_exists('\\SidcraftPageBuilder\\Rendering\\FrontendAssets'))return \SidcraftPageBuilder\Rendering\FrontendAssets::needs_script(is_array($nodes)?$nodes:[],$post_id);
  if(class_exists(Interactions::class)&&Interactions::has($nodes))return true;
  return class_exists('\\SidcraftPageBuilder\\Design\\Optimize')&&\SidcraftPageBuilder\Design\Optimize::needs_script(is_array($nodes)?$nodes:[]);
 }
 /** Group rendered children by `slot` (repeater item `_id`) for nested widgets. */
 private static function slot_html($el,$n,$post_id=0,$extra_ctx=[],$id_suffix=''){
  $map=[];
  $slots=method_exists($el,'slots')?$el->slots(is_array($n['settings']??null)?$n['settings']:[]):[];
  $first=isset($slots[0]['id'])?(string)$slots[0]['id']:'';
  foreach((array)($n['children']??[]) as $c){
   if(!is_array($c))continue;
   $sid=preg_replace('/[^a-zA-Z0-9_-]/','',(string)($c['slot']??''));
   if($sid==='')$sid=$first;
   $map[$sid]=($map[$sid]??'').self::nodes([$c],$post_id,$extra_ctx,$id_suffix);
  }
  return $map;
 }

 private static function enqueue_google_fonts($nodes){
  if(class_exists('\\SidcraftPageBuilder\\Design\\Fonts')){\SidcraftPageBuilder\Design\Fonts::enqueue($nodes);return;}
  $fonts=[]; $take=function($v)use(&$fonts){ if(is_string($v)&&$v!==''&&!preg_match('/[,\"\']/', $v)&&strpos($v,'{{var:')===false) $fonts[$v]=true; };
  $seen=[];
  $walk=function($items)use(&$walk,$take,&$seen){foreach((array)$items as $n){$s=$n['settings']??[]; $take($s['font_family']??''); foreach($s as $val){ if(is_array($val)&&isset($val['font_family'])&&(array_key_exists('font_size',$val)||array_key_exists('font_weight',$val)))$take($val['font_family']); } $type=$n['type']??''; $tid=$type==='template'?absint($s['template_id']??0):($type==='collection_loop'&&class_exists('\\SidcraftPageBuilder\\Units\\CollectionLoop')?\SidcraftPageBuilder\Units\CollectionLoop::embedded_template_id(is_array($s)?$s:[]):0); if($tid&&empty($seen[$tid])){ $seen[$tid]=true; $doc=class_exists('\\SidcraftPageBuilder\\Templates\\TemplateEmbed')?\SidcraftPageBuilder\Templates\TemplateEmbed::document($tid):null; if($doc&&!empty($doc['root']))$walk($doc['root']); } if(!empty($n['children']))$walk($n['children']);}}; $walk($nodes);
  if(class_exists('\\SidcraftPageBuilder\\Design\\Variables')) foreach(\SidcraftPageBuilder\Design\Variables::used_font_families() as $f)$fonts[$f]=true;
  if(class_exists('\\SidcraftPageBuilder\\Design\\ThemeStyle')) foreach(\SidcraftPageBuilder\Design\ThemeStyle::used_font_families() as $f)$fonts[$f]=true;
  $font_ver=defined('SIDCRAFT_PAGE_BUILDER_VERSION')?SIDCRAFT_PAGE_BUILDER_VERSION:'1.0.0';
  foreach(array_keys($fonts) as $font){$family=rawurlencode($font); $url='https://fonts.googleapis.com/css2?family='.$family.':wght@400;700&display=swap'; $handle='lb-font-'.sanitize_title($font); wp_enqueue_style($handle,$url,array(),$font_ver);}
 }
 private static function resolve_dynamic($s,$post_id=0,$el=null,$extra_ctx=[],$n=[]){
  $s=is_array($s)?$s:[];
  $post_id=absint($post_id);
  $controls=$el&&method_exists($el,'all_controls')?$el->all_controls():[];
  if(class_exists('\\SidcraftPageBuilder\\Dynamic\\Resolver')){
   $ctx=\SidcraftPageBuilder\Dynamic\Resolver::context($post_id,false);
   if(is_array($extra_ctx)&&$extra_ctx)$ctx=array_merge($ctx,$extra_ctx);
   $s=\SidcraftPageBuilder\Dynamic\Resolver::settings($s,$ctx,$controls);
  }elseif(class_exists(DevMode::class)){
   $post=isset($GLOBALS['post'])&&is_object($GLOBALS['post'])?$GLOBALS['post']:null;
   if(!$post && $post_id && function_exists('get_post'))$post=get_post($post_id);
   $ctx=$post?DevMode::frontend_dynamic_map($post):array();
   $s=DevMode::resolve_settings($s,$ctx,DevMode::enabled());
  }
  /** Filter resolved unit settings before render (translations, add-ons). @param array $s @param array $n @param int $post_id @param object|null $el */
  $filtered=apply_filters('sidcraft-page-builder/unit/settings',$s,is_array($n)?$n:[],$post_id,$el);
  return is_array($filtered)?$filtered:$s;
 }
}
