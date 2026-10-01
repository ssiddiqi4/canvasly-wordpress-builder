<?php
namespace SidcraftSyntex\Bootstrap; use SidcraftSyntex\Units\UnitRegistry; use SidcraftSyntex\Document\DocumentManager; use SidcraftSyntex\Document\Documents; if(!defined('ABSPATH')) exit;
class Plugin { private static $instance; public static function instance(){ if(!self::$instance){ self::$instance=new self; self::$instance->init(); } return self::$instance; }
 public static function is_admin_request(){ return !function_exists('is_admin') || is_admin(); }
 public static function init(){
  if(class_exists('SidcraftSyntex\\Compatibility\\Compat'))\SidcraftSyntex\Compatibility\Compat::init();
  elseif(class_exists('SidcraftSyntex\\Compatibility\\ImportExport'))\SidcraftSyntex\Compatibility\ImportExport::init();
  if(class_exists('SidcraftSyntex\\Compatibility\\Duplicate')&&!class_exists('SidcraftSyntex\\Compatibility\\Compat'))\SidcraftSyntex\Compatibility\Duplicate::init();
  if(class_exists('SidcraftSyntex\\Upgrade\\Upgrades'))\SidcraftSyntex\Upgrade\Upgrades::init();
  // Keep the native WordPress Block Editor isolated from Sidcraft Syntex runtime hooks.
  // Gutenberg owns its React application, REST editor state, and editor assets.
  // Sidcraft Syntex only adds a safe launcher after the editor has rendered.
  if(self::is_native_block_editor_request()){
   add_action('admin_enqueue_scripts',[self::class,'native_editor_button']);
   return;
  }
  add_action('init',[self::class,'on_init']);
  // XEditor (atomic elements, classes & variables, loop data model) and integrations.
  $xe_engine=SIDCRAFT_SYNTEX_PATH.'includes/xeditor/class-xeditor-engine.php';
  if(is_readable($xe_engine)){require_once $xe_engine;\SidcraftSyntex\XEditor\XEditorEngine::init();}
  $turnstile=SIDCRAFT_SYNTEX_PATH.'includes/integrations/class-turnstile.php';
  if(is_readable($turnstile)){require_once $turnstile;\SidcraftSyntex\Integrations\Turnstile::init();}
  add_action('rest_api_init',['SidcraftSyntex\Api\Rest','register_routes']);
  add_filter('rest_post_dispatch',['SidcraftSyntex\Api\Rest','utf8_content_type'],10,3);
  if(self::is_admin_request()){
   if(class_exists('SidcraftSyntex\\Admin\\Dashboard'))\SidcraftSyntex\Admin\Dashboard::init();
   add_action('admin_menu',[self::class,'menu']);
   add_action('admin_enqueue_scripts',['SidcraftSyntex\Editor\Editor','enqueue'],10,1);
   add_action('admin_enqueue_scripts',['SidcraftSyntex\Editor\Editor','enqueue_favicon'],10,1);
   add_action('admin_head',['SidcraftSyntex\Editor\Editor','print_favicon']);
   add_filter('post_row_actions',[self::class,'row_action'],10,2);
   add_filter('page_row_actions',[self::class,'row_action'],10,2);
  } else {
   add_action('wp_enqueue_scripts',['SidcraftSyntex\Rendering\FrontendRenderer','enqueue']);
   add_filter('the_content',['SidcraftSyntex\Rendering\FrontendRenderer','filter_content'],20);
   add_action('wp_enqueue_scripts',[self::class,'frontend_head'],30);
  }
  if(class_exists('SidcraftSyntex\\Templates\\PageTemplates'))\SidcraftSyntex\Templates\PageTemplates::init();
  if(class_exists('SidcraftSyntex\\Templates\\ThemeChrome'))\SidcraftSyntex\Templates\ThemeChrome::init();
  if(class_exists('SidcraftSyntex\\Templates\\ThemeChromeEdits'))\SidcraftSyntex\Templates\ThemeChromeEdits::init();
  if(class_exists('SidcraftSyntex\\Theme\\Locations'))\SidcraftSyntex\Theme\Locations::init();
  if(class_exists('SidcraftSyntex\\Templates\\SavedTemplates'))\SidcraftSyntex\Templates\SavedTemplates::init();
  if(class_exists('SidcraftSyntex\\Convert\\Tool'))\SidcraftSyntex\Convert\Tool::init();
  if(class_exists('SidcraftSyntex\\Tools\\ReplaceUrl'))\SidcraftSyntex\Tools\ReplaceUrl::init();
  if(class_exists('SidcraftSyntex\\Design\\CssPrint'))\SidcraftSyntex\Design\CssPrint::init();
  if(class_exists('SidcraftSyntex\\Design\\Fonts'))\SidcraftSyntex\Design\Fonts::init();
  if(class_exists('SidcraftSyntex\\Design\\Optimize'))\SidcraftSyntex\Design\Optimize::init();
  if(class_exists('SidcraftSyntex\\Embed\\OEmbed'))\SidcraftSyntex\Embed\OEmbed::init();
  if(class_exists('SidcraftSyntex\\Ops\\Maintenance'))\SidcraftSyntex\Ops\Maintenance::init();
  if(class_exists('SidcraftSyntex\\Ops\\SafeMode'))\SidcraftSyntex\Ops\SafeMode::init();
  if(class_exists('SidcraftSyntex\\Ops\\SystemInfo'))\SidcraftSyntex\Ops\SystemInfo::init();
  if(class_exists('SidcraftSyntex\\Ops\\Rollback'))\SidcraftSyntex\Ops\Rollback::init();
  if(class_exists('SidcraftSyntex\\Cli\\Cli'))\SidcraftSyntex\Cli\Cli::init();
  if(class_exists('SidcraftSyntex\\Admin\\AdminBar'))\SidcraftSyntex\Admin\AdminBar::init();
  if(class_exists('SidcraftSyntex\\Widgets\\TemplateWidget'))add_action('widgets_init',['SidcraftSyntex\\Widgets\\TemplateWidget','register']);
  if(class_exists('SidcraftSyntex\\Document\\Revisions'))\SidcraftSyntex\Document\Revisions::init();
 }
 public static function is_native_block_editor_request(){
  $pagenow=$GLOBALS['pagenow']??'';
  if(!in_array($pagenow,['post.php','post-new.php'],true)) return false;
  // phpcs:disable WordPress.Security.NonceVerification.Recommended -- Read-only WordPress editor screen routing.
  if($pagenow==='post.php'){
   $post_id=isset($_GET['post'])?absint(wp_unslash($_GET['post'])):0; if(!$post_id)return false;
   $post=get_post($post_id); if(!$post || !Documents::supports($post->post_type))return false;
   if(function_exists('use_block_editor_for_post'))return (bool)use_block_editor_for_post($post);
   return true;
  }
  $post_type=isset($_GET['post_type'])?sanitize_key(wp_unslash($_GET['post_type'])):'post';
  // phpcs:enable WordPress.Security.NonceVerification.Recommended
  if(!Documents::supports($post_type))return false;
  if(function_exists('use_block_editor_for_post_type'))return (bool)use_block_editor_for_post_type($post_type);
  return true;
 }
 public static function native_editor_button(){
  if(function_exists('sidcraft_syntex_native_editor_launcher')) sidcraft_syntex_native_editor_launcher();
 }
 public static function on_init(){
  self::register_template_cpt();
  self::register_component_cpt();
  self::register_global_class_cpt();
  self::register_units();
  self::init_global_settings();
  self::compatibility_hooks();
 }
 public static function init_global_settings(){
  if(class_exists('SidcraftSyntex\\Settings\\GlobalSettings')) \SidcraftSyntex\Settings\GlobalSettings::init();
  if(class_exists('SidcraftSyntex\\Settings\\AdminSettings')) \SidcraftSyntex\Settings\AdminSettings::init();
  if(class_exists('SidcraftSyntex\\Settings\\Roles')) \SidcraftSyntex\Settings\Roles::init();
  if(class_exists('SidcraftSyntex\\Settings\\UnitsManager')) \SidcraftSyntex\Settings\UnitsManager::init();
  if(class_exists('SidcraftSyntex\\Settings\\KitSettings')) \SidcraftSyntex\Settings\KitSettings::init();
  if(class_exists('SidcraftSyntex\\Design\\Kit')) \SidcraftSyntex\Design\Kit::init();
 }
 public static function menu(){
  $cap=class_exists('SidcraftSyntex\\Settings\\Roles')?\SidcraftSyntex\Settings\Roles::CAP_EDIT:'edit_posts';
  add_menu_page(__('Sidcraft Syntex', 'sidcraft-syntex'),__('Sidcraft Syntex', 'sidcraft-syntex'),$cap,'sidcraft-syntex',['SidcraftSyntex\Editor\Editor','screen'],'dashicons-layout',58);
 }
 public static function gutenberg_editor_notice(){
  // Keep the native WordPress block editor completely untouched. Sidcraft Syntex only adds a small PHP notice/button; it does not enqueue editor assets here.
  $screen=get_current_screen();
  if(!$screen || !Documents::supports($screen->post_type) || !in_array($screen->base,['post','post-new'],true) || !current_user_can(Documents::edit_cap($screen->post_type))) return;
  if(class_exists('SidcraftSyntex\\Settings\\Roles')&&!\SidcraftSyntex\Settings\Roles::can_edit()) return;
  $post_id=0;
  // phpcs:disable WordPress.Security.NonceVerification -- Read-only post ID from the editor screen URL or the post form.
  if(!empty($_GET['post'])) $post_id=absint(wp_unslash($_GET['post']));
  elseif(!empty($_POST['post_ID'])) $post_id=absint(wp_unslash($_POST['post_ID']));
  // phpcs:enable WordPress.Security.NonceVerification
  if($post_id && !current_user_can('edit_post',$post_id)) return;
  if($post_id){
    $post=get_post($post_id);
    if($post && function_exists('use_block_editor_for_post') && !use_block_editor_for_post($post)) return;
  } elseif(function_exists('use_block_editor_for_post_type') && !use_block_editor_for_post_type($screen->post_type)) {
    return;
  }
  $url=$post_id ? admin_url('admin.php?page=sidcraft-syntex&post_id='.$post_id) : admin_url('admin.php?page=sidcraft-syntex&post_type='.rawurlencode($screen->post_type));
  echo '<div class="notice notice-info" style="display:flex;align-items:center;gap:14px;padding:10px 12px;"><strong>'.esc_html__('Sidcraft Syntex', 'sidcraft-syntex').'</strong><span>'.esc_html__('You can edit this content with the visual builder.', 'sidcraft-syntex').'</span><a class="button button-primary" href="'.esc_url($url).'">'.esc_html__('Edit with Sidcraft Syntex', 'sidcraft-syntex').'</a></div>';
 }
 public static function register_template_cpt(){
  if(class_exists('\\SidcraftSyntex\\Templates\\SavedTemplates')){\SidcraftSyntex\Templates\SavedTemplates::register();return;}
  register_post_type('sidsyn_template',['label'=>__('Sidcraft Syntex Templates', 'sidcraft-syntex'),'public'=>false,'show_ui'=>false,'supports'=>['title']]);
 }
 public static function register_component_cpt(){register_post_type('sidsyn_component',['label'=>__('Sidcraft Syntex Components', 'sidcraft-syntex'),'public'=>false,'show_ui'=>false,'supports'=>['title']]);}
 public static function register_global_class_cpt(){register_post_type('sidsyn_global_class',['label'=>__('Sidcraft Syntex Global Classes', 'sidcraft-syntex'),'public'=>false,'show_ui'=>false,'supports'=>['title']]);}
 public static function compatibility_hooks(){
  if(!class_exists('SidcraftSyntex\\Design\\Performance'))return;
  if(class_exists('\\SidcraftSyntex\\Admin\\AdminContext')&&!\SidcraftSyntex\Admin\AdminContext::allows_background())return;
  $manifest=\SidcraftSyntex\Design\Performance::manifest();
  $stored=function_exists('get_option')?get_option('sidcraft_syntex_asset_manifest'):false;
  if(is_array($stored)&&isset($stored['version'])&&isset($manifest['version'])&&(string)$stored['version']===(string)$manifest['version'])return;
  update_option('sidcraft_syntex_asset_manifest',$manifest,false);
 }
 public static function performance_hooks(){ if(function_exists('wp_script_add_data')) wp_script_add_data('sidcraft-syntex-frontend','strategy','defer'); }
 public static function defer_frontend($tag,$handle,$src){ unset($handle,$src); return $tag; }
 public static function row_action($a,$p){
  if(!Documents::supports($p->post_type)||!current_user_can('edit_post',$p->ID))return $a;
  if(class_exists('SidcraftSyntex\\Settings\\Roles')&&!\SidcraftSyntex\Settings\Roles::can_edit())return $a;
  $a['sidcraft-syntex']='<a href="'.esc_url(admin_url('admin.php?page=sidcraft-syntex&post_id='.$p->ID)).'">'.esc_html__('Edit with Sidcraft Syntex', 'sidcraft-syntex').'</a>';
  return $a;
 }
 public static function activate(){
  if(class_exists('SidcraftSyntex\\Upgrade\\Upgrades'))\SidcraftSyntex\Upgrade\Upgrades::on_activate();
  else update_option('sidcraft_syntex_version', SIDCRAFT_SYNTEX_VERSION, false);
  if(class_exists('SidcraftSyntex\\Settings\\Roles'))\SidcraftSyntex\Settings\Roles::sync();
  flush_rewrite_rules();
 } public static function deactivate(){
  if(class_exists('SidcraftSyntex\\Upgrade\\Upgrades'))\SidcraftSyntex\Upgrade\Upgrades::on_deactivate();
  flush_rewrite_rules();
 } public static function register_units(){ $r=UnitRegistry::instance();$unit_file=SIDCRAFT_SYNTEX_PATH.'includes/units/class-unit.php';if(is_readable($unit_file)) require_once $unit_file;$files=['container','inner_section','grid','heading','text','image','button','divider','spacer','icon','icon_list','image_box','progress','counter','alert','html','embed','shortcode','video','accordion','toggle','tabs','nested_tabs','nested_accordion','nested_toggle','social','gallery','carousel','star_rating','testimonial','menu_anchor','site_nav','read_more','soundcloud','audio','google_maps','sidebar','wordpress','link_in_bio','rating','icon_box','text_path','code','price_table','flip_box','login','collection_loop','template','component','form','tinymce_text_editor'];$classes=['Container','InnerSection','Grid','Heading','Text','Image','Button','Divider','Spacer','Icon','IconList','ImageBox','Progress','Counter','Alert','Html','Embed','Shortcode','Video','Accordion','Toggle','Tabs','NestedTabs','NestedAccordion','NestedToggle','Social','Gallery','Carousel','StarRating','Testimonial','MenuAnchor','SiteNav','ReadMore','SoundCloud','Audio','GoogleMaps','Sidebar','WordPressWidget','LinkInBio','Rating','IconBox','TextPath','Code','PriceTable','FlipBox','Login','CollectionLoop','Template','Component','Form','TinyMCETextEditor'];foreach($files as $i=>$f){$fq='SidcraftSyntex\\Units\\'.$classes[$i];$type=($f==='wordpress')?'wordpress_widget':$f;$r->register_lazy($type,SIDCRAFT_SYNTEX_PATH.'includes/units/class-'.$f.'.php',$fq);}
  // Extension points: control types first (units may use them), then add-on units.
  // Require the file directly - do not rely on the autoloader - so a missing/outdated
  // deploy cannot fatal with "Class Controls not found" / "undefined method boot()".
  $controls_file=SIDCRAFT_SYNTEX_PATH.'includes/controls/class-controls.php';
  if(is_readable($controls_file)) require_once $controls_file;
  if(class_exists('\SidcraftSyntex\Controls\Controls',false))\SidcraftSyntex\Controls\Controls::instance()->boot();
  $groups_file=SIDCRAFT_SYNTEX_PATH.'includes/controls/class-groups.php';
  if(is_readable($groups_file)) require_once $groups_file;
  if(class_exists('\SidcraftSyntex\Controls\Groups',false))\SidcraftSyntex\Controls\Groups::init();
  $code_file=SIDCRAFT_SYNTEX_PATH.'includes/controls/class-code.php';
  if(is_readable($code_file)) require_once $code_file;
  if(class_exists('\SidcraftSyntex\Controls\Code',false))\SidcraftSyntex\Controls\Code::init();
  $query_file=SIDCRAFT_SYNTEX_PATH.'includes/query/class-query.php';
  if(is_readable($query_file)) require_once $query_file;
  $tags_dir=SIDCRAFT_SYNTEX_PATH.'includes/dynamic/';
  foreach(array('tag','tags','resolver','builtin') as $f){ $file=$tags_dir.'class-'.$f.'.php'; if(is_readable($file)) require_once $file; }
  if(class_exists('\SidcraftSyntex\Dynamic\Tags',false)&&class_exists('\SidcraftSyntex\Dynamic\Tag',false))\SidcraftSyntex\Dynamic\Tags::ready();
  if(method_exists($r,'boot'))$r->boot();
  if(function_exists('sidcraft_syntex_pro_register_units')) sidcraft_syntex_pro_register_units();
  $anchor_file=SIDCRAFT_SYNTEX_PATH.'includes/units/class-menu_anchor.php';
  if(is_readable($anchor_file)) require_once $anchor_file;
  if(class_exists('\SidcraftSyntex\Units\MenuAnchor',false)&&method_exists('\SidcraftSyntex\Units\MenuAnchor','boot')) \SidcraftSyntex\Units\MenuAnchor::boot();
  $nav_file=SIDCRAFT_SYNTEX_PATH.'includes/units/class-site_nav.php';
  if(is_readable($nav_file)) require_once $nav_file;
  if(class_exists('\SidcraftSyntex\Units\SiteNav',false)&&method_exists('\SidcraftSyntex\Units\SiteNav','boot')) \SidcraftSyntex\Units\SiteNav::boot();
 }
 public static function frontend_assets(){if(is_singular()){} }
 public static function frontend_head(){
  if(function_exists('is_singular')&&!is_singular())return;
  $id=function_exists('get_the_ID')?absint(get_the_ID()):0;
  if(!$id||!class_exists('\\SidcraftSyntex\\Document\\DocumentManager')||!DocumentManager::has($id))return;
  self::frontend_global_css();
 }
 public static function frontend_form_endpoint(){ if(!function_exists('wp_add_inline_script'))return; $js='window.sidcraftSyntexFormEndpoint='.wp_json_encode(esc_url_raw(rest_url('sidcraft-syntex/v1/form'))).';'; if(function_exists('wp_script_is')&&!wp_script_is('sidcraft-syntex-frontend','registered')&&function_exists('wp_register_script')) wp_register_script('sidcraft-syntex-frontend',false,array(),defined('SIDCRAFT_SYNTEX_VERSION')?SIDCRAFT_SYNTEX_VERSION:null,true); wp_enqueue_script('sidcraft-syntex-frontend'); wp_add_inline_script('sidcraft-syntex-frontend',$js,'before'); }
 public static function frontend_global_css(){
  if(class_exists('\\SidcraftSyntex\\Design\\CssPrint')){
   \SidcraftSyntex\Design\CssPrint::print_head_fallback();
   return;
  }
  if(!is_singular())return;$css=\SidcraftSyntex\Design\Variables::css();if(class_exists('\\SidcraftSyntex\\Design\\ThemeStyle'))$css.=\SidcraftSyntex\Design\ThemeStyle::css();if(class_exists('\\SidcraftSyntex\\Settings\\KitSettings'))$css.=\SidcraftSyntex\Settings\KitSettings::css();$css.=\SidcraftSyntex\Design\GlobalClasses::css().\SidcraftSyntex\Design\Interactions::css();if($css&&function_exists('wp_add_inline_style')){wp_register_style('sidcraft-syntex-global',false,array('sidcraft-syntex-frontend'),defined('SIDCRAFT_SYNTEX_VERSION')?SIDCRAFT_SYNTEX_VERSION:null);wp_enqueue_style('sidcraft-syntex-frontend');wp_enqueue_style('sidcraft-syntex-global');wp_add_inline_style('sidcraft-syntex-global',wp_strip_all_tags($css));}
 }
}
