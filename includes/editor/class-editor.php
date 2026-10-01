<?php
namespace SidcraftPageBuilder\Editor;
use SidcraftPageBuilder\Units\UnitRegistry;
use SidcraftPageBuilder\Controls\Controls;
use SidcraftPageBuilder\Controls\Code;
use SidcraftPageBuilder\Document\DocumentManager;
use SidcraftPageBuilder\Document\Documents;
use SidcraftPageBuilder\Document\DevMode;
use SidcraftPageBuilder\Design\IconLibrary;
use SidcraftPageBuilder\Design\GlobalClasses;
use SidcraftPageBuilder\Design\Variables;
use SidcraftPageBuilder\Design\ThemeStyle;
use SidcraftPageBuilder\Design\Favorites;
use SidcraftPageBuilder\Design\SiteNavigation;
if(!defined('ABSPATH'))exit;
class Editor {
 public static function enqueue($hook_suffix=''){
  $ok=class_exists('\\SidcraftPageBuilder\\Admin\\AdminContext')?\SidcraftPageBuilder\Admin\AdminContext::is_editor_page($hook_suffix):($hook_suffix==='toplevel_page_sidcraft-page-builder');
  if(!$ok)return;
  if(class_exists('\\SidcraftPageBuilder\\Settings\\AdminSettings')&&\SidcraftPageBuilder\Settings\AdminSettings::is_editor_iframe_shell())return;
  add_filter('user_can_richedit','__return_true',99);
  wp_enqueue_media();
  if(!class_exists('_WP_Editors',false)) require_once ABSPATH.WPINC.'/class-wp-editor.php';
  wp_enqueue_editor();
  wp_enqueue_style('editor-buttons');
  wp_enqueue_script('wp-tinymce');
  wp_enqueue_script('editor');
  wp_enqueue_script('quicktags');
  wp_enqueue_script('wplink');
  add_action('admin_print_footer_scripts',[self::class,'print_tinymce'],50);
  $editor_css=SIDCRAFT_PAGE_BUILDER_PATH.'assets/css/editor.css';
  $editor_js=SIDCRAFT_PAGE_BUILDER_PATH.'assets/js/editor.js';
  $asset_version=SIDCRAFT_PAGE_BUILDER_VERSION.'-'.(file_exists($editor_js)?filemtime($editor_js):time());
  // phpcs:disable WordPress.Security.NonceVerification.Recommended -- Read-only editor screen query var.
  $post_id=isset($_GET['post_id'])?absint(wp_unslash($_GET['post_id'])):0;
  // phpcs:enable WordPress.Security.NonceVerification.Recommended
  $code_editor=[];
  $editor_deps=['jquery','heartbeat','wp-tinymce','editor','quicktags'];
  $style_deps=[];
  if(!class_exists(Code::class,false)){
   $code_file=SIDCRAFT_PAGE_BUILDER_PATH.'includes/controls/class-code.php';
   if(is_readable($code_file)) require_once $code_file;
  }
  if(class_exists(Code::class))$code_editor=Code::enqueue();
  if($code_editor){$editor_deps[]='code-editor';$style_deps[]='code-editor';}
  wp_enqueue_style('sidcraft-page-builder-editor',SIDCRAFT_PAGE_BUILDER_URL.'assets/css/editor.css',$style_deps,$asset_version);
  wp_style_add_data('sidcraft-page-builder-editor','rtl','replace');
  wp_enqueue_script('sidcraft-page-builder-editor',SIDCRAFT_PAGE_BUILDER_URL.'assets/js/editor.js',$editor_deps,$asset_version,true);
  /**
   * Fires after the core editor assets are enqueued. Add-ons enqueue their editor scripts here with
   * 'sidcraft-page-builder-editor' as a dependency so `window.SidcraftPageBuilder` exists when they run.
   * @param int $post_id
   */
  do_action('sidcraft-page-builder/editor/enqueue',$post_id);
  $data=[
   'wpRest'=>esc_url_raw(rest_url('wp/v2')),
   'api'=>esc_url_raw(rest_url('sidcraft-page-builder/v1')),
   'nonce'=>wp_create_nonce('wp_rest'),
   'units'=>self::unit_data(),
   'postId'=>$post_id,
   'updated'=>$post_id?(string)get_post_meta($post_id,DocumentManager::UPDATED,true):'',
   'previewUrl'=>$post_id?esc_url_raw(get_preview_post_link($post_id)):'',
   'permalink'=>$post_id?esc_url_raw(get_permalink($post_id)):'',
   'postTitle'=>$post_id?(get_the_title($post_id)?:''):'',
   'adminUrl'=>admin_url(),
   'globals'=>\SidcraftPageBuilder\Settings\GlobalSettings::get(),
   'icons'=>IconLibrary::all(),
   'iconLibraryUrl'=>SIDCRAFT_PAGE_BUILDER_URL.'assets/data/fontawesome-free-icons.json',
   'googleFontsUrl'=>SIDCRAFT_PAGE_BUILDER_URL.'assets/data/google-fonts.json',
   'googleFonts'=>self::google_fonts(),
   'fontDisplay'=>class_exists('\\SidcraftPageBuilder\\Design\\Fonts')?\SidcraftPageBuilder\Design\Fonts::display():'swap',
   'googleFontsLocal'=>class_exists('\\SidcraftPageBuilder\\Design\\Fonts')?\SidcraftPageBuilder\Design\Fonts::is_local():false,
   'classes'=>[],
   'variables'=>Variables::all(),
   'themeStyle'=>class_exists(ThemeStyle::class)?ThemeStyle::all():[],
   'kitSettings'=>class_exists('\\SidcraftPageBuilder\\Settings\\KitSettings')?\SidcraftPageBuilder\Settings\KitSettings::all():[],
   'designCss'=>Variables::css().(class_exists(ThemeStyle::class)?ThemeStyle::css():'').(class_exists('\\SidcraftPageBuilder\\Settings\\KitSettings')?\SidcraftPageBuilder\Settings\KitSettings::css():'').GlobalClasses::css().(class_exists('\\SidcraftPageBuilder\\Design\\Interactions')?\SidcraftPageBuilder\Design\Interactions::css():''),
   'designSystem'=>\SidcraftPageBuilder\Design\DesignSystem::export(),
   'favorites'=>Favorites::all(),
   'preferences'=>class_exists('\\SidcraftPageBuilder\\Settings\\UserPreferences')?\SidcraftPageBuilder\Settings\UserPreferences::get():[],
   'navigation'=>SiteNavigation::pages(),
   'breakpoints'=>\SidcraftPageBuilder\Settings\Breakpoints::all(),
   'sidebars'=>self::sidebars(),
   'widgets'=>self::widgets(),
   'menus'=>class_exists('\\SidcraftPageBuilder\\Units\\MenuAnchor')?\SidcraftPageBuilder\Units\MenuAnchor::catalog():[],
   'editorCss'=>add_query_arg('v',rawurlencode((string)$asset_version),(string)SIDCRAFT_PAGE_BUILDER_URL.'assets/css/editor'.(function_exists('is_rtl')&&is_rtl()?'-rtl':'').'.css'),
   'frontendCss'=>add_query_arg('v',rawurlencode(SIDCRAFT_PAGE_BUILDER_VERSION.'-'.(file_exists(SIDCRAFT_PAGE_BUILDER_PATH.'assets/css/frontend.css')?filemtime(SIDCRAFT_PAGE_BUILDER_PATH.'assets/css/frontend.css'):time())),(string)SIDCRAFT_PAGE_BUILDER_URL.'assets/css/frontend'.(function_exists('is_rtl')&&is_rtl()?'-rtl':'').'.css'),
   'atomicTypes'=>\SidcraftPageBuilder\Design\Atomic::types(),
   'assetManifest'=>\SidcraftPageBuilder\Design\Performance::manifest(),
   'tinymceBaseUrl'=>includes_url('js/tinymce'),
   'tinymceSkinUrl'=>includes_url('js/tinymce/skins/lightgray/skin.min.css'),
   'controlTypes'=>class_exists(Controls::class)?Controls::instance()->export():[],
   'codeEditor'=>is_array($code_editor)?$code_editor:[],
   'version'=>SIDCRAFT_PAGE_BUILDER_VERSION,
   'googleMapsEmbed'=>class_exists('\\SidcraftPageBuilder\\Settings\\AdminSettings')&&\SidcraftPageBuilder\Settings\AdminSettings::maps_embed_enabled(),
   'googleMapsKey'=>(class_exists('\\SidcraftPageBuilder\\Settings\\AdminSettings')&&\SidcraftPageBuilder\Settings\AdminSettings::maps_embed_enabled())?\SidcraftPageBuilder\Settings\AdminSettings::google_maps_api_key():'',
   'schema'=>DocumentManager::SCHEMA,
   'devMode'=>class_exists(DevMode::class)?DevMode::enabled():false,
   'dynamic'=>class_exists(DevMode::class)?DevMode::canvas_dynamic_map($post_id):[],
   'dynamicTags'=>(class_exists('\\SidcraftPageBuilder\\Dynamic\\Tags')&&class_exists('\\SidcraftPageBuilder\\Dynamic\\Tag'))?\SidcraftPageBuilder\Dynamic\Tags::ready()->export($post_id):['tags'=>[],'groups'=>[],'categories'=>[],'previews'=>[]],
   'interactions'=>class_exists('\\SidcraftPageBuilder\\Design\\Interactions')?\SidcraftPageBuilder\Design\Interactions::export():['presets'=>[],'groups'=>[],'triggers'=>[],'kinds'=>[],'easings'=>[]],
   'i18n'=>class_exists('\SidcraftPageBuilder\I18n\I18n')?\SidcraftPageBuilder\I18n\I18n::editor_strings():[],
   'isRtl'=>function_exists('is_rtl')&&is_rtl(),
   'postType'=>$post_id?(string)get_post_type($post_id):'',
   'postStatus'=>$post_id?(string)get_post_status($post_id):'',
   'canPublish'=>$post_id?self::can_publish($post_id):false,
   'templateTypes'=>class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates')?\SidcraftPageBuilder\Templates\SavedTemplates::types():[],
   'templateCategories'=>class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates')?\SidcraftPageBuilder\Templates\SavedTemplates::category_names():[],
   'templateType'=>$post_id&&function_exists('get_post_type')&&get_post_type($post_id)==='sidsyn_template'?sanitize_key((string)get_post_meta($post_id,'_sidsyn_template_type',true)?:'page'):'',
   'themeChrome'=>class_exists('\\SidcraftPageBuilder\\Templates\\ThemeChrome')?\SidcraftPageBuilder\Templates\ThemeChrome::export():['header'=>false,'footer'=>false,'inherit'=>false],
   'caps'=>class_exists('\\SidcraftPageBuilder\\Settings\\Roles')?\SidcraftPageBuilder\Settings\Roles::editor_caps():['edit'=>current_user_can('sidcraft_page_builder_edit'),'design'=>current_user_can('sidcraft_page_builder_design'),'contentOnly'=>false,'access'=>'full'],
  ];
  if($post_id&&class_exists('\\SidcraftPageBuilder\\Design\\Collaboration')){
   $lock=\SidcraftPageBuilder\Design\Collaboration::heartbeat($post_id);
   $data['lock']=is_array($lock)?$lock:['locked'=>false];
   $data['postLock']=\SidcraftPageBuilder\Design\Collaboration::token($post_id);
   $data['heartbeat']=true;
  }else{
   $data['lock']=['locked'=>false];
   $data['postLock']='';
   $data['heartbeat']=false;
  }
  if(class_exists('\\SidcraftPageBuilder\\Settings\\UnitsManager')){
   $data['caps']['units']=\SidcraftPageBuilder\Settings\UnitsManager::allowed_types();
  }
  /** Filter the data passed to the editor as `window.SidcraftPageBuilderData`. @param array $data @param int $post_id */
  $filtered=apply_filters('sidcraft-page-builder/editor/localize_data',$data,$post_id);
  wp_localize_script('sidcraft-page-builder-editor','SidcraftPageBuilderData',is_array($filtered)?$filtered:$data);
 }
 /**
  * Whether the current user may publish this document from the editor.
  * Saved templates are always published, so the editor never offers it.
  *
  * @param int $post_id
  * @return bool
  */
 public static function can_publish($post_id){
  $post_id=absint($post_id);
  if(!$post_id)return false;
  $type=(string)get_post_type($post_id);
  if($type===''||$type==='sidsyn_template'||$type==='revision')return false;
  if(current_user_can('publish_post',$post_id))return true;
  $obj=function_exists('get_post_type_object')?get_post_type_object($type):null;
  $cap=$obj&&isset($obj->cap->publish_posts)?(string)$obj->cap->publish_posts:($type==='page'?'publish_pages':'publish_posts');
  return current_user_can($cap);
 }
 public static function print_tinymce(){
  if(!class_exists('_WP_Editors',false)) require_once ABSPATH.WPINC.'/class-wp-editor.php';
  add_filter('user_can_richedit','__return_true',99);
  \_WP_Editors::print_tinymce_scripts();
 }
 /**
  * Replace the WordPress admin favicon with the Sidcraft Page Builder C mark.
  * WordPress prints its default W logo after `admin_head`, so icon links are
  * rewritten on DOMContentLoaded as well as immediately.
  */
 public static function print_favicon(){
  $url=self::favicon_url();
  if($url==='')return;
  echo '<link rel="icon" href="'.esc_url($url).'" type="image/svg+xml" sizes="any">'."\n";
  echo '<link rel="apple-touch-icon" href="'.esc_url($url).'">'."\n";
 }
 public static function enqueue_favicon($hook_suffix=''){
  unset($hook_suffix);
  $url=self::favicon_url();
  if($url==='')return;
  $ver=defined('SIDCRAFT_PAGE_BUILDER_VERSION')?SIDCRAFT_PAGE_BUILDER_VERSION:'0';
  wp_register_script('sidcraft-page-builder-admin-favicon',SIDCRAFT_PAGE_BUILDER_URL.'assets/js/admin-favicon.js',array(),$ver,true);
  wp_enqueue_script('sidcraft-page-builder-admin-favicon');
  wp_add_inline_script('sidcraft-page-builder-admin-favicon','window.sidcraftPageBuilderAdminIcon='.wp_json_encode($url).';','before');
 }
 private static function favicon_url(){
  global $plugin_page;
  $page=is_string($plugin_page)?$plugin_page:'';
  if($page===''&&isset($_GET['page']))$page=sanitize_key(wp_unslash($_GET['page'])); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only admin page slug.
  if($page!=='sidcraft-page-builder'&&strpos($page,'sidcraft-page-builder-')!==0)return '';
  $file=SIDCRAFT_PAGE_BUILDER_PATH.'assets/images/lb-icon.svg';
  $url=SIDCRAFT_PAGE_BUILDER_URL.'assets/images/lb-icon.svg';
  if(is_readable($file))$url=add_query_arg('v',rawurlencode(SIDCRAFT_PAGE_BUILDER_VERSION.'.'.(string)filemtime($file)),(string)$url);
  return (string)$url;
 }
 private static function google_fonts(){
  $file=SIDCRAFT_PAGE_BUILDER_PATH.'assets/data/google-fonts.json';
  $data=class_exists('\\SidcraftPageBuilder\\Utils\\JsonCache')?\SidcraftPageBuilder\Utils\JsonCache::read($file):array();
  $fonts=$data?array_values(array_filter($data,'is_string')):[];
  /**
   * Font names shown in the typography control. Google families are the default.
   * Add-ons append custom families; Pro prints the matching @font-face rules.
   *
   * @param string[] $fonts
   */
  $filtered=apply_filters('sidcraft-page-builder/fonts/families',$fonts);
  if(!is_array($filtered))return $fonts;
  $out=[];
  foreach($filtered as $name){ if(is_string($name)&&$name!=='')$out[]=$name; }
  return $out;
 }
 private static function widgets(){$out=[];foreach(\SidcraftPageBuilder\Units\WordPressWidget::registry() as $base=>$w)$out[]=['id'=>$base,'name'=>$w['name']];usort($out,function($a,$b){return strcasecmp($a['name'],$b['name']);});return $out;}
 private static function sidebars(){global $wp_registered_sidebars;$out=[];foreach((array)$wp_registered_sidebars as $id=>$sb)$out[]=['id'=>$id,'name'=>$sb['name']??$id];return $out;}
 private static function unit_source($e){
  if(is_object($e)&&method_exists($e,'source')){
   $slug=sanitize_key((string)$e->source());
   if($slug!=='') return $slug;
  }
  if(class_exists('\\SidcraftPageBuilder\\Settings\\UnitsManager')) return \SidcraftPageBuilder\Settings\UnitsManager::source_slug($e);
  return 'lite';
 }
 private static function unit_data(){$out=[];foreach(UnitRegistry::instance()->all() as $e)$out[]=['type'=>$e->type(),'title'=>$e->title(),'icon'=>$e->icon(),'category'=>$e->category(),'source'=>self::unit_source($e),'controls'=>$e->all_controls(),'defaults'=>$e->get_defaults(),'children'=>$e->supports_children(),'slots'=>$e->supports_slots(),'slot_source'=>$e->slot_source(),'keywords'=>$e->keywords(),'schema'=>$e->uses_schema(),'uses_button'=>$e->uses_button()];return $out;}
 public static function screen(){
  if(class_exists('\\SidcraftPageBuilder\\Settings\\Roles')&&!\SidcraftPageBuilder\Settings\Roles::can_edit()){
   wp_die(esc_html__('You do not have permission to use Sidcraft Page Builder.', 'sidcraft-page-builder'));
  }
  if(class_exists('\\SidcraftPageBuilder\\Settings\\AdminSettings')&&\SidcraftPageBuilder\Settings\AdminSettings::is_editor_iframe_shell()){
   if(class_exists('\\SidcraftPageBuilder\\Ops\\SafeMode'))\SidcraftPageBuilder\Ops\SafeMode::print_banner();
   $src=function_exists('add_query_arg')?add_query_arg('sidsyn_iframe','1'):'';
   // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only editor screen query var.
   $iframe_post=isset($_GET['post_id'])?absint(wp_unslash($_GET['post_id'])):0;
   /** Filter the editor shell iframe URL. @param string $src @param int $iframe_post */
   $src=apply_filters('sidcraft-page-builder/editor/iframe_src',$src,$iframe_post);
   echo '<iframe class="lb-editor-frame" src="'.esc_url($src).'" title="'.esc_attr__('Sidcraft Page Builder editor', 'sidcraft-page-builder').'"></iframe>';
   return;
  }
  if(class_exists('\\SidcraftPageBuilder\\Ops\\SafeMode'))\SidcraftPageBuilder\Ops\SafeMode::print_banner();
  // phpcs:disable WordPress.Security.NonceVerification.Recommended -- Read-only editor screen query vars.
  $post_id=isset($_GET['post_id'])?absint(wp_unslash($_GET['post_id'])):0;
  if(!$post_id){
    $requested_type=isset($_GET['post_type'])?sanitize_key(wp_unslash($_GET['post_type'])):'';
    if($requested_type==='' && !empty($_GET['new_page']))$requested_type='page';
    $is_template=$requested_type==='sidsyn_template'&&class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates');
    if(!$is_template){
     if($requested_type==='' || !Documents::supports($requested_type))$requested_type=Documents::fallback();
     if($requested_type==='' || !Documents::supports($requested_type))wp_die(esc_html__('No post types are enabled for Sidcraft Page Builder.', 'sidcraft-page-builder'));
    }
    $post_type=$requested_type;
    if($is_template){if(!current_user_can('edit_pages'))wp_die(esc_html__('You do not have permission to use Sidcraft Page Builder.', 'sidcraft-page-builder'));}
    elseif(!current_user_can(Documents::edit_cap($post_type)))wp_die(esc_html__('You do not have permission to use Sidcraft Page Builder.', 'sidcraft-page-builder'));
    if($is_template){
     $post_id=\SidcraftPageBuilder\Templates\SavedTemplates::create_blank();
     if(is_wp_error($post_id)||!$post_id)wp_die(esc_html__('WordPress could not create the draft.', 'sidcraft-page-builder'));
    } else {
     $obj=function_exists('get_post_type_object')?get_post_type_object($post_type):null;
     $singular=$obj&&!empty($obj->labels->singular_name)?$obj->labels->singular_name:$post_type;
     if('page'===$post_type)$title=!empty($_GET['new_page'])?__('Sidcraft Page Builder Page', 'sidcraft-page-builder'):__('Sidcraft Page Builder Draft', 'sidcraft-page-builder');
     elseif('post'===$post_type)$title=__('Sidcraft Page Builder Post', 'sidcraft-page-builder');
     else $title=sprintf(/* translators: %s: post type singular name */__('Sidcraft Page Builder %s', 'sidcraft-page-builder'),$singular);
     $post_id=wp_insert_post(['post_title'=>$title,'post_status'=>'draft','post_type'=>$post_type],true);
     if(is_wp_error($post_id)||!$post_id)wp_die(esc_html__('WordPress could not create the draft.', 'sidcraft-page-builder'));
    }
  }
  // phpcs:enable WordPress.Security.NonceVerification.Recommended
  $post=get_post($post_id);
  $is_template=$post&&$post->post_type==='sidsyn_template'&&class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates');
  if(!$post || (!$is_template && !Documents::supports($post->post_type)))wp_die(esc_html__('Sidcraft Page Builder is not enabled for this post type.', 'sidcraft-page-builder'));
  if($is_template){if(!current_user_can('edit_post',$post_id)&&!current_user_can('edit_pages'))wp_die(esc_html__('You do not have permission to edit this content.', 'sidcraft-page-builder'));}
  elseif(!current_user_can('edit_post',$post_id))wp_die(esc_html__('You do not have permission to edit this content.', 'sidcraft-page-builder'));
  $doc=DocumentManager::for_editor($post_id);
  if(class_exists(DevMode::class))$doc=DevMode::sanitize_document($doc);
  $doc_json=wp_json_encode($doc);
  if(!is_string($doc_json)||$doc_json==='')$doc_json='{}';
  /* Keep the payload out of an HTML attribute. Converted pages are large enough
   * that a truncated attribute parses as nothing and the canvas opens empty. */
  $doc_json=str_replace(array('<',"\u{2028}","\u{2029}"),array('\u003c','\u2028','\u2029'),$doc_json);
  echo '<div id="lb-editor-shell" class="lb-admin lb-fullscreen'.(class_exists('\\SidcraftPageBuilder\\Settings\\Roles')&&\SidcraftPageBuilder\Settings\Roles::is_content_only()?' lb-content-only':'').'"'.(function_exists('is_rtl')&&is_rtl()?' dir="rtl"':'').'><div id="lb-editor" data-post-id="'.esc_attr($post_id).'" data-lb-has-document="1"></div></div>';
  wp_print_inline_script_tag($doc_json,array('type'=>'application/json','id'=>'lb-editor-document'));
  echo '<div id="lb-tinymce-boot-wrap" class="lb-tinymce-boot-wrap" hidden>';
  wp_editor('<p></p>','sidsyn_tinymce_boot',[
   'textarea_rows'=>2,
   'media_buttons'=>true,
   'drag_drop_upload'=>true,
   'tinymce'=>[
    'wp_skip_init'=>false,
    'toolbar1'=>'formatselect,bold,italic,underline,bullist,numlist,alignleft,aligncenter,alignright,link,unlink',
    'toolbar2'=>'',
   ],
   'quicktags'=>false,
  ]);
  echo '</div>';
}
}
