<?php
namespace SidcraftPageBuilder\Settings;
use SidcraftPageBuilder\Design\Variables;
use SidcraftPageBuilder\Design\GlobalClasses;
use SidcraftPageBuilder\Document\DocumentManager;
use SidcraftPageBuilder\Document\Documents;
if(!defined('ABSPATH')) exit;
class GlobalSettings {
 const KEY='sidcraft_page_builder_global_settings';
 const CSS_GENERATION='sidcraft_page_builder_css_generation';
 /** @var array|null */
 private static $cached=null;
 /** @var mixed */
 private static $cached_raw=null;
 public static function flush_runtime(){self::$cached=null;self::$cached_raw=null;}
 /**
  * Persist plugin settings without autoloading them on every request.
  *
  * @param array $g
  * @return array
  */
 public static function persist($g){
  update_option(self::KEY,$g,false);
  self::flush_runtime();
  if(class_exists(Documents::class)&&method_exists(Documents::class,'flush_runtime'))Documents::flush_runtime();
  return $g;
 }
 public static function defaults(){
  return [
   'colors'=>['primary'=>'#3f7fdf','secondary'=>'#20242a','text'=>'#333333','accent'=>'#6c5ce7'],
   'fonts'=>['heading'=>'','body'=>''],
   'breakpoints'=>Breakpoints::catalog(),
   'content_width'=>'1180px',
   'css_print_method'=>'external',
   'font_display'=>'swap',
   'google_fonts_local'=>false,
   'unit_cache'=>true,
   'unit_cache_ttl'=>86400,
   'lazy_load'=>true,
   'optimized_markup'=>false,
   'post_types'=>class_exists(Documents::class)?Documents::defaults():['post','page'],
   'disable_default_colors'=>false,
   'disable_default_fonts'=>false,
   'google_maps_api_key'=>'',
   'recaptcha_type'=>'v2',
   'recaptcha_site_key'=>'',
   'recaptcha_secret_key'=>'',
   'editor_loader_mode'=>'default',
   'maintenance_mode'=>'off',
   'maintenance_template'=>0,
   'maintenance_exclude_roles'=>['administrator'],
   'experiments'=>[],
   'rollback_keep'=>3,
  ];
 }
 public static function get(){
  $raw=(array)get_option(self::KEY,[]);
  if(self::$cached!==null&&self::$cached_raw===$raw)return self::$cached;
  $d=wp_parse_args($raw,self::defaults());
  $d['breakpoints']=Breakpoints::normalize($d['breakpoints']??[]);
  $d['css_print_method']=class_exists('\\SidcraftPageBuilder\\Design\\CssPrint')?\SidcraftPageBuilder\Design\CssPrint::sanitize_method($d['css_print_method']??'external'):((($d['css_print_method']??'')==='inline')?'inline':'external');
  $d['font_display']=class_exists('\\SidcraftPageBuilder\\Design\\Fonts')?\SidcraftPageBuilder\Design\Fonts::sanitize_display($d['font_display']??'swap'):'swap';
  $d['google_fonts_local']=class_exists('\\SidcraftPageBuilder\\Design\\Fonts')?\SidcraftPageBuilder\Design\Fonts::sanitize_local($d['google_fonts_local']??false):!empty($d['google_fonts_local']);
  if(class_exists('\\SidcraftPageBuilder\\Design\\Optimize')){
   $d['unit_cache']=\SidcraftPageBuilder\Design\Optimize::sanitize_bool($d['unit_cache']??true);
   $d['unit_cache_ttl']=\SidcraftPageBuilder\Design\Optimize::sanitize_ttl($d['unit_cache_ttl']??86400);
   $d['lazy_load']=\SidcraftPageBuilder\Design\Optimize::sanitize_bool($d['lazy_load']??true);
   $d['optimized_markup']=\SidcraftPageBuilder\Design\Optimize::sanitize_bool($d['optimized_markup']??false);
  }else{
   $d['unit_cache']=!isset($d['unit_cache'])||!empty($d['unit_cache']);
   $d['unit_cache_ttl']=max(60,(int)($d['unit_cache_ttl']??86400));
   $d['lazy_load']=!isset($d['lazy_load'])||!empty($d['lazy_load']);
   $d['optimized_markup']=!empty($d['optimized_markup']);
  }
  if(class_exists(Documents::class))$d['post_types']=Documents::normalize($d['post_types']??Documents::defaults());
  if(class_exists(AdminSettings::class))$d=AdminSettings::normalize_stored($d);
  self::$cached_raw=$raw;
  return self::$cached=$d;
 }
 public static function init(){add_action('admin_menu',[__CLASS__,'menu']);}
 public static function menu(){add_submenu_page('sidcraft-page-builder',__('Design System', 'sidcraft-page-builder'),__('Design System', 'sidcraft-page-builder'),'manage_options','sidcraft-page-builder-global',[__CLASS__,'screen']);}

 /**
  * Persist a full breakpoint catalog from REST or the admin form and drop CSS caches.
  *
  * @param mixed $raw
  * @return array
  */
 public static function save_breakpoints($raw){
  $g=self::get();
  $g['breakpoints']=Breakpoints::sanitize($raw);
  self::persist($g);
  self::invalidate_css_cache();
  if(class_exists(Variables::class)){
   $vars=Variables::all();
  Variables::save(['colors'=>$vars['colors'],'fonts'=>$vars['fonts'],'sizes'=>$vars['sizes'],'effects'=>$vars['effects']??[],'breakpoints'=>Breakpoints::values($g['breakpoints']),'custom'=>$vars['custom']??[],'typography'=>$vars['typography']??[],'color_titles'=>$vars['color_titles']??[]]);
  }
  return $g;
 }

 /**
  * Drop every document CSS cache so media queries rebuild with the new breakpoints.
  */
 public static function invalidate_css_cache(){
  if(function_exists('delete_post_meta_by_key')&&class_exists(DocumentManager::class)){
   delete_post_meta_by_key(DocumentManager::CSS_CACHE);
  }
  if(function_exists('delete_post_meta_by_key')&&class_exists('\\SidcraftPageBuilder\\Design\\CssPrint')){
   delete_post_meta_by_key(\SidcraftPageBuilder\Design\CssPrint::META_HASH);
  }
  if(class_exists('\\SidcraftPageBuilder\\Design\\CssPrint'))\SidcraftPageBuilder\Design\CssPrint::invalidate_all();
  update_option(self::CSS_GENERATION,(string)time(),false);
 }

 /**
  * Persist the enabled post-type list from REST or the admin form.
  *
  * @param mixed $raw
  * @return array
  */
 public static function save_post_types($raw){
  $g=self::get();
  $g['post_types']=class_exists(Documents::class)?Documents::sanitize($raw):(is_array($raw)?array_values(array_unique(array_map('sanitize_key',$raw))):['post','page']);
  self::persist($g);
  return $g;
 }

 public static function save(){
  if(!current_user_can('manage_options')||empty($_POST['_wpnonce'])||!wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['_wpnonce'])),'sidsyn_global'))return;
  $d=self::get();
  $defs=self::defaults();
  foreach($defs['colors'] as $k=>$v)$d['colors'][$k]=sanitize_hex_color(isset($_POST[$k])?wp_unslash($_POST[$k]):($d['colors'][$k]??$v))?:$v;
  $d['fonts']=is_array($d['fonts']??null)?$d['fonts']:$defs['fonts'];
  $d['fonts']['heading']=sanitize_text_field(isset($_POST['heading'])?wp_unslash($_POST['heading']):'');
  $d['fonts']['body']=sanitize_text_field(isset($_POST['body'])?wp_unslash($_POST['body']):'');
  $d['content_width']=sanitize_text_field(isset($_POST['content_width'])?wp_unslash($_POST['content_width']):'1180px');
  $posted=[];
  foreach(Breakpoints::names() as $name){
   $posted[$name]=[
    'enabled'=>$name==='desktop'?true:!empty($_POST['bp_'.$name.'_enabled']),
    'value'=>absint($_POST['bp_'.$name.'_value']??0),
    'preview'=>absint($_POST['bp_'.$name.'_preview']??0),
   ];
  }
  $d['breakpoints']=Breakpoints::sanitize($posted);
  if(!empty($_POST['sidsyn_post_types_present'])){
   $posted_types=isset($_POST['post_types'])?map_deep(wp_unslash($_POST['post_types']),'sanitize_key'):array();
   $posted_types=is_array($posted_types)?array_values($posted_types):array();
   $d['post_types']=class_exists(Documents::class)?Documents::sanitize($posted_types):array('post','page');
  }
  self::persist($d);
  self::invalidate_css_cache();
  $vars=Variables::all();
  $colors=is_array($vars['colors']??null)?$vars['colors']:[];
  foreach($d['colors'] as $k=>$v)$colors[$k]=$v;
  Variables::save(['colors'=>$colors,'fonts'=>$d['fonts'],'sizes'=>$vars['sizes']??[],'effects'=>$vars['effects']??[],'breakpoints'=>Breakpoints::values($d['breakpoints']),'typography'=>$vars['typography']??[],'color_titles'=>$vars['color_titles']??[],'custom'=>$vars['custom']??[]]);
 }

 public static function screen(){
  if(isset($_POST['sidsyn_save_global'], $_POST['_wpnonce']) && wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['_wpnonce'])),'sidsyn_global'))self::save();
  $d=self::get();
  $v=Variables::all();
  $c=GlobalClasses::all();
  $bps=Breakpoints::normalize($d['breakpoints']??[]);
  echo '<div class="wrap"><h1>'.esc_html__('Sidcraft Page Builder Design System', 'sidcraft-page-builder').'</h1><form method="post">';
  wp_nonce_field('sidsyn_global');
  echo '<h2>'.esc_html__('Global colors', 'sidcraft-page-builder').'</h2><table class="form-table">';
  foreach(['primary'=>__('Primary', 'sidcraft-page-builder'),'secondary'=>__('Secondary', 'sidcraft-page-builder'),'text'=>__('Text', 'sidcraft-page-builder'),'accent'=>__('Accent', 'sidcraft-page-builder')] as $k=>$l){
   echo '<tr><th>'.esc_html($l).'</th><td><input type="color" name="'.esc_attr($k).'" value="'.esc_attr($d['colors'][$k]).'"></td></tr>';
  }
  echo '</table><p class="description">'.esc_html__('Unlimited custom colors and typography presets are managed from Site Settings in the Sidcraft Page Builder editor.', 'sidcraft-page-builder').'</p>';
  echo '<h2>'.esc_html__('Typography', 'sidcraft-page-builder').'</h2><table class="form-table">';
  echo '<tr><th>'.esc_html__('Heading Font', 'sidcraft-page-builder').'</th><td><input class="regular-text" name="heading" value="'.esc_attr($d['fonts']['heading']).'"></td></tr>';
  echo '<tr><th>'.esc_html__('Body Font', 'sidcraft-page-builder').'</th><td><input class="regular-text" name="body" value="'.esc_attr($d['fonts']['body']).'"></td></tr>';
  echo '<tr><th>'.esc_html__('Content Width', 'sidcraft-page-builder').'</th><td><input class="regular-text" name="content_width" value="'.esc_attr($d['content_width']).'"></td></tr>';
  echo '</table><h2>'.esc_html__('Breakpoints', 'sidcraft-page-builder').'</h2>';
  echo '<p class="description">'.esc_html__('Enable extra devices and set the max-width (or min-width for Widescreen) used by responsive CSS. The canvas width is the editor preview.', 'sidcraft-page-builder').'</p>';
  echo '<table class="widefat striped" style="max-width:720px"><thead><tr>';
  echo '<th>'.esc_html__('Enabled', 'sidcraft-page-builder').'</th><th>'.esc_html__('Device', 'sidcraft-page-builder').'</th><th>'.esc_html__('Width (px)', 'sidcraft-page-builder').'</th><th>'.esc_html__('Query', 'sidcraft-page-builder').'</th><th>'.esc_html__('Canvas (px)', 'sidcraft-page-builder').'</th>';
  echo '</tr></thead><tbody>';
  foreach($bps as $name=>$b){
   $locked=$name==='desktop';
   $dir=($b['direction']??'')==='min'?__('min-width', 'sidcraft-page-builder'):(($b['direction']??'')==='base'?__('Base', 'sidcraft-page-builder'):__('max-width', 'sidcraft-page-builder'));
   echo '<tr><td>';
   echo '<input type="checkbox" name="bp_'.esc_attr($name).'_enabled" value="1"'.(!empty($b['enabled'])?' checked':'').($locked?' disabled':'').'>';
   echo '</td><td>'.esc_html($b['label']??$name).'</td><td>';
   echo '<input type="number" min="0" max="4000" name="bp_'.esc_attr($name).'_value" value="'.esc_attr((int)($b['value']??0)).'"'.($locked?' disabled':'').'>';
   echo '</td><td>'.esc_html($dir).'</td><td>';
   echo '<input type="number" min="0" max="4000" name="bp_'.esc_attr($name).'_preview" value="'.esc_attr((int)($b['preview']??0)).'"'.($locked?' disabled':'').'>';
   echo '</td></tr>';
  }
  echo '</tbody></table>';
  echo '<h2>'.esc_html__('Post Types', 'sidcraft-page-builder').'</h2>';
  echo '<p class="description">'.esc_html__('Choose which public post types can be edited with Sidcraft Page Builder. Posts and Pages are enabled by default; any public custom post type can be added.', 'sidcraft-page-builder').'</p>';
  echo '<input type="hidden" name="sidsyn_post_types_present" value="1">';
  $enabled_types=class_exists(Documents::class)?Documents::enabled():(array)($d['post_types']??['post','page']);
  $available_types=class_exists(Documents::class)?Documents::available():['post'=>__('Posts', 'sidcraft-page-builder'),'page'=>__('Pages', 'sidcraft-page-builder')];
  echo '<fieldset>';
  foreach($available_types as $slug=>$label){
   echo '<label style="display:block;margin:4px 0;"><input type="checkbox" name="post_types[]" value="'.esc_attr($slug).'"'.(in_array($slug,$enabled_types,true)?' checked':'').'> '.esc_html($label).' <code>'.esc_html($slug).'</code></label>';
  }
  echo '</fieldset>';
  echo '<h2>'.esc_html__('Variables', 'sidcraft-page-builder').'</h2><table class="form-table">';
  foreach($v['sizes'] as $k=>$val)echo '<tr><th>'.esc_html($k).'</th><td><input class="regular-text" name="var_'.esc_attr($k).'" value="'.esc_attr($val).'" disabled></td></tr>';
  echo '</table><h2>'.esc_html__('Global Classes', 'sidcraft-page-builder').'</h2><p>'.esc_html__('Manage reusable classes from the Sidcraft Page Builder editor. Current classes: ', 'sidcraft-page-builder').esc_html(count($c)).'</p>';
  echo '<p><button class="button button-primary" name="sidsyn_save_global" value="1">'.esc_html__('Save Design System', 'sidcraft-page-builder').'</button></p></form></div>';
 }
}
