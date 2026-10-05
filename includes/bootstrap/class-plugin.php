<?php
namespace SidcraftPageBuilder\Bootstrap; use SidcraftPageBuilder\Units\UnitRegistry; use SidcraftPageBuilder\Document\DocumentManager; use SidcraftPageBuilder\Document\Documents; if(!defined('ABSPATH')) exit;
class Plugin { private static $instance; public static function instance(){ if(!self::$instance){ self::$instance=new self; self::$instance->init(); } return self::$instance; }
 public static function is_admin_request(){ return !function_exists('is_admin') || is_admin(); }
 public static function init(){
  if(!self::is_admin_request()&&class_exists('SidcraftPageBuilder\\Tools\\Benchmark'))\SidcraftPageBuilder\Tools\Benchmark::init();
  if(class_exists('SidcraftPageBuilder\\Compatibility\\Compat'))\SidcraftPageBuilder\Compatibility\Compat::init();
  elseif(class_exists('SidcraftPageBuilder\\Compatibility\\ImportExport'))\SidcraftPageBuilder\Compatibility\ImportExport::init();
  if(class_exists('SidcraftPageBuilder\\Compatibility\\Duplicate')&&!class_exists('SidcraftPageBuilder\\Compatibility\\Compat'))\SidcraftPageBuilder\Compatibility\Duplicate::init();
  if(class_exists('SidcraftPageBuilder\\Upgrade\\Upgrades'))\SidcraftPageBuilder\Upgrade\Upgrades::init();
  // Keep the native WordPress Block Editor isolated from Sidcraft Page Builder runtime hooks.
  // Gutenberg owns its React application, REST editor state, and editor assets.
  // Sidcraft Page Builder only adds a safe launcher after the editor has rendered.
  if(self::is_native_block_editor_request()){
   add_action('admin_enqueue_scripts',[self::class,'native_editor_button']);
   return;
  }
  add_action('init',[self::class,'on_init']);
  // XEditor (atomic elements, classes & variables, loop data model) and integrations.
  $xe_engine=SIDCRAFT_PAGE_BUILDER_PATH.'includes/xeditor/class-xeditor-engine.php';
  if(is_readable($xe_engine)){require_once $xe_engine;\SidcraftPageBuilder\XEditor\XEditorEngine::init();}
  $turnstile=SIDCRAFT_PAGE_BUILDER_PATH.'includes/integrations/class-turnstile.php';
  if(is_readable($turnstile)){require_once $turnstile;\SidcraftPageBuilder\Integrations\Turnstile::init();}
  add_action('rest_api_init',['SidcraftPageBuilder\Api\Rest','register_routes']);
  add_filter('rest_post_dispatch',['SidcraftPageBuilder\Api\Rest','utf8_content_type'],10,3);
  if(self::is_admin_request()){
   if(class_exists('SidcraftPageBuilder\\Admin\\Dashboard'))\SidcraftPageBuilder\Admin\Dashboard::init();
   add_action('admin_menu',[self::class,'menu']);
   add_action('admin_enqueue_scripts',['SidcraftPageBuilder\Editor\Editor','enqueue'],10,1);
   add_action('admin_enqueue_scripts',['SidcraftPageBuilder\Editor\Editor','enqueue_favicon'],10,1);
   add_action('admin_head',['SidcraftPageBuilder\Editor\Editor','print_favicon']);
   add_filter('post_row_actions',[self::class,'row_action'],10,2);
   add_filter('page_row_actions',[self::class,'row_action'],10,2);
  } else {
   add_action('wp_enqueue_scripts',['SidcraftPageBuilder\Rendering\FrontendRenderer','enqueue']);
   add_filter('the_content',['SidcraftPageBuilder\Rendering\FrontendRenderer','filter_content'],20);
   add_action('wp_enqueue_scripts',[self::class,'frontend_head'],30);
  }
  if(class_exists('SidcraftPageBuilder\\Templates\\PageTemplates'))\SidcraftPageBuilder\Templates\PageTemplates::init();
  if(class_exists('SidcraftPageBuilder\\Templates\\ThemeChrome'))\SidcraftPageBuilder\Templates\ThemeChrome::init();
  if(class_exists('SidcraftPageBuilder\\Templates\\ThemeChromeEdits'))\SidcraftPageBuilder\Templates\ThemeChromeEdits::init();
  if(class_exists('SidcraftPageBuilder\\Theme\\Locations'))\SidcraftPageBuilder\Theme\Locations::init();
  if(class_exists('SidcraftPageBuilder\\Templates\\SavedTemplates'))\SidcraftPageBuilder\Templates\SavedTemplates::init();
  if(class_exists('SidcraftPageBuilder\\Convert\\Tool'))\SidcraftPageBuilder\Convert\Tool::init();
  if(class_exists('SidcraftPageBuilder\\Document\\Schema'))\SidcraftPageBuilder\Document\Schema::init();
  if(class_exists('SidcraftPageBuilder\\Convert\\Review'))\SidcraftPageBuilder\Convert\Review::init();
  if(class_exists('SidcraftPageBuilder\\Convert\\Job'))\SidcraftPageBuilder\Convert\Job::init();
  if(class_exists('SidcraftPageBuilder\\Tools\\ReplaceUrl'))\SidcraftPageBuilder\Tools\ReplaceUrl::init();
  if(class_exists('SidcraftPageBuilder\\Design\\CssPrint'))\SidcraftPageBuilder\Design\CssPrint::init();
  if(class_exists('SidcraftPageBuilder\\Design\\Fonts'))\SidcraftPageBuilder\Design\Fonts::init();
  if(class_exists('SidcraftPageBuilder\\Design\\Optimize'))\SidcraftPageBuilder\Design\Optimize::init();
  if(class_exists('SidcraftPageBuilder\\Embed\\OEmbed'))\SidcraftPageBuilder\Embed\OEmbed::init();
  if(class_exists('SidcraftPageBuilder\\Ops\\Maintenance'))\SidcraftPageBuilder\Ops\Maintenance::init();
  if(class_exists('SidcraftPageBuilder\\Ops\\SafeMode'))\SidcraftPageBuilder\Ops\SafeMode::init();
  if(class_exists('SidcraftPageBuilder\\Ops\\SystemInfo'))\SidcraftPageBuilder\Ops\SystemInfo::init();
  if(class_exists('SidcraftPageBuilder\\Ops\\Rollback'))\SidcraftPageBuilder\Ops\Rollback::init();
  if(class_exists('SidcraftPageBuilder\\Cli\\Cli'))\SidcraftPageBuilder\Cli\Cli::init();
  if(class_exists('SidcraftPageBuilder\\Admin\\AdminBar'))\SidcraftPageBuilder\Admin\AdminBar::init();
  if(class_exists('SidcraftPageBuilder\\Widgets\\TemplateWidget'))add_action('widgets_init',['SidcraftPageBuilder\\Widgets\\TemplateWidget','register']);
  if(class_exists('SidcraftPageBuilder\\Document\\Revisions'))\SidcraftPageBuilder\Document\Revisions::init();
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
  if(function_exists('sidcraft_page_builder_native_editor_launcher')) sidcraft_page_builder_native_editor_launcher();
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
  if(class_exists('SidcraftPageBuilder\\Settings\\GlobalSettings')) \SidcraftPageBuilder\Settings\GlobalSettings::init();
  if(class_exists('SidcraftPageBuilder\\Settings\\AdminSettings')) \SidcraftPageBuilder\Settings\AdminSettings::init();
  if(class_exists('SidcraftPageBuilder\\Settings\\Roles')) \SidcraftPageBuilder\Settings\Roles::init();
  if(class_exists('SidcraftPageBuilder\\Settings\\UnitsManager')) \SidcraftPageBuilder\Settings\UnitsManager::init();
  if(class_exists('SidcraftPageBuilder\\Settings\\KitSettings')) \SidcraftPageBuilder\Settings\KitSettings::init();
  if(class_exists('SidcraftPageBuilder\\Design\\Kit')) \SidcraftPageBuilder\Design\Kit::init();
 }
 public static function menu(){
  $cap=class_exists('SidcraftPageBuilder\\Settings\\Roles')?\SidcraftPageBuilder\Settings\Roles::CAP_EDIT:'edit_posts';
  add_menu_page(__('Sidcraft Page Builder', 'sidcraft-page-builder'),__('Sidcraft Page Builder', 'sidcraft-page-builder'),$cap,'sidcraft-page-builder',['SidcraftPageBuilder\Editor\Editor','screen'],'dashicons-layout',58);
 }
 public static function gutenberg_editor_notice(){
  // Keep the native WordPress block editor completely untouched. Sidcraft Page Builder only adds a small PHP notice/button; it does not enqueue editor assets here.
  $screen=get_current_screen();
  if(!$screen || !Documents::supports($screen->post_type) || !in_array($screen->base,['post','post-new'],true) || !current_user_can(Documents::edit_cap($screen->post_type))) return;
  if(class_exists('SidcraftPageBuilder\\Settings\\Roles')&&!\SidcraftPageBuilder\Settings\Roles::can_edit()) return;
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
  $url=$post_id ? admin_url('admin.php?page=sidcraft-page-builder&post_id='.$post_id) : admin_url('admin.php?page=sidcraft-page-builder&post_type='.rawurlencode($screen->post_type));
  echo '<div class="notice notice-info" style="display:flex;align-items:center;gap:14px;padding:10px 12px;"><strong>'.esc_html__('Sidcraft Page Builder', 'sidcraft-page-builder').'</strong><span>'.esc_html__('You can edit this content with the visual builder.', 'sidcraft-page-builder').'</span><a class="button button-primary" href="'.esc_url($url).'">'.esc_html__('Edit with Sidcraft Page Builder', 'sidcraft-page-builder').'</a></div>';
 }
 public static function register_template_cpt(){
  if(class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates')){\SidcraftPageBuilder\Templates\SavedTemplates::register();return;}
  register_post_type('sidsyn_template',['label'=>__('Sidcraft Page Builder Templates', 'sidcraft-page-builder'),'public'=>false,'show_ui'=>false,'supports'=>['title']]);
 }
 public static function register_component_cpt(){register_post_type('sidsyn_component',['label'=>__('Sidcraft Page Builder Components', 'sidcraft-page-builder'),'public'=>false,'show_ui'=>false,'supports'=>['title']]);}
 public static function register_global_class_cpt(){register_post_type('sidsyn_global_class',['label'=>__('Sidcraft Page Builder Global Classes', 'sidcraft-page-builder'),'public'=>false,'show_ui'=>false,'supports'=>['title']]);}
 public static function compatibility_hooks(){
  if(!class_exists('SidcraftPageBuilder\\Design\\Performance'))return;
  if(class_exists('\\SidcraftPageBuilder\\Admin\\AdminContext')&&!\SidcraftPageBuilder\Admin\AdminContext::allows_background())return;
  $manifest=\SidcraftPageBuilder\Design\Performance::manifest();
  $stored=function_exists('get_option')?get_option('sidcraft_page_builder_asset_manifest'):false;
  if(is_array($stored)&&isset($stored['version'])&&isset($manifest['version'])&&(string)$stored['version']===(string)$manifest['version'])return;
  update_option('sidcraft_page_builder_asset_manifest',$manifest,false);
 }
 public static function performance_hooks(){ if(function_exists('wp_script_add_data')) wp_script_add_data('sidcraft-page-builder-frontend','strategy','defer'); }
 public static function defer_frontend($tag,$handle,$src){ unset($handle,$src); return $tag; }
 public static function row_action($a,$p){
  if(!Documents::supports($p->post_type)||!current_user_can('edit_post',$p->ID))return $a;
  if(class_exists('SidcraftPageBuilder\\Settings\\Roles')&&!\SidcraftPageBuilder\Settings\Roles::can_edit())return $a;
  $a['sidcraft-page-builder']='<a href="'.esc_url(admin_url('admin.php?page=sidcraft-page-builder&post_id='.$p->ID)).'">'.esc_html__('Edit with Sidcraft Page Builder', 'sidcraft-page-builder').'</a>';
  return $a;
 }
 public static function activate(){
  if(class_exists('SidcraftPageBuilder\\Upgrade\\Upgrades'))\SidcraftPageBuilder\Upgrade\Upgrades::on_activate();
  else update_option('sidcraft_page_builder_version', SIDCRAFT_PAGE_BUILDER_VERSION, false);
  if(class_exists('SidcraftPageBuilder\\Settings\\Roles'))\SidcraftPageBuilder\Settings\Roles::sync();
  flush_rewrite_rules();
 } public static function deactivate(){
  if(class_exists('SidcraftPageBuilder\\Upgrade\\Upgrades'))\SidcraftPageBuilder\Upgrade\Upgrades::on_deactivate();
  flush_rewrite_rules();
 } public static function register_units(){ $r=UnitRegistry::instance();$unit_file=SIDCRAFT_PAGE_BUILDER_PATH.'includes/units/class-unit.php';if(is_readable($unit_file)) require_once $unit_file;$files=['container','inner_section','grid','heading','text','image','button','divider','spacer','icon','icon_list','image_box','progress','counter','alert','html','embed','shortcode','video','accordion','toggle','tabs','nested_tabs','nested_accordion','nested_toggle','social','gallery','carousel','star_rating','testimonial','menu_anchor','site_nav','read_more','soundcloud','audio','google_maps','sidebar','wordpress','link_in_bio','rating','icon_box','text_path','code','price_table','flip_box','login','collection_loop','template','component','form','tinymce_text_editor'];$classes=['Container','InnerSection','Grid','Heading','Text','Image','Button','Divider','Spacer','Icon','IconList','ImageBox','Progress','Counter','Alert','Html','Embed','Shortcode','Video','Accordion','Toggle','Tabs','NestedTabs','NestedAccordion','NestedToggle','Social','Gallery','Carousel','StarRating','Testimonial','MenuAnchor','SiteNav','ReadMore','SoundCloud','Audio','GoogleMaps','Sidebar','WordPressWidget','LinkInBio','Rating','IconBox','TextPath','Code','PriceTable','FlipBox','Login','CollectionLoop','Template','Component','Form','TinyMCETextEditor'];foreach($files as $i=>$f){$fq='SidcraftPageBuilder\\Units\\'.$classes[$i];$type=($f==='wordpress')?'wordpress_widget':$f;$r->register_lazy($type,SIDCRAFT_PAGE_BUILDER_PATH.'includes/units/class-'.$f.'.php',$fq);}
  // Extension points: control types first (units may use them), then add-on units.
  // Require the file directly - do not rely on the autoloader - so a missing/outdated
  // deploy cannot fatal with "Class Controls not found" / "undefined method boot()".
  $controls_file=SIDCRAFT_PAGE_BUILDER_PATH.'includes/controls/class-controls.php';
  if(is_readable($controls_file)) require_once $controls_file;
  if(class_exists('\SidcraftPageBuilder\Controls\Controls',false))\SidcraftPageBuilder\Controls\Controls::instance()->boot();
  $groups_file=SIDCRAFT_PAGE_BUILDER_PATH.'includes/controls/class-groups.php';
  if(is_readable($groups_file)) require_once $groups_file;
  if(class_exists('\SidcraftPageBuilder\Controls\Groups',false))\SidcraftPageBuilder\Controls\Groups::init();
  $code_file=SIDCRAFT_PAGE_BUILDER_PATH.'includes/controls/class-code.php';
  if(is_readable($code_file)) require_once $code_file;
  if(class_exists('\SidcraftPageBuilder\Controls\Code',false))\SidcraftPageBuilder\Controls\Code::init();
  $query_file=SIDCRAFT_PAGE_BUILDER_PATH.'includes/query/class-query.php';
  if(is_readable($query_file)) require_once $query_file;
  $tags_dir=SIDCRAFT_PAGE_BUILDER_PATH.'includes/dynamic/';
  foreach(array('tag','tags','resolver','builtin') as $f){ $file=$tags_dir.'class-'.$f.'.php'; if(is_readable($file)) require_once $file; }
  if(class_exists('\SidcraftPageBuilder\Dynamic\Tags',false)&&class_exists('\SidcraftPageBuilder\Dynamic\Tag',false))\SidcraftPageBuilder\Dynamic\Tags::ready();
  if(method_exists($r,'boot'))$r->boot();
  if(function_exists('sidcraft_builder_pro_register_units')) sidcraft_builder_pro_register_units();
  $anchor_file=SIDCRAFT_PAGE_BUILDER_PATH.'includes/units/class-menu_anchor.php';
  if(is_readable($anchor_file)) require_once $anchor_file;
  if(class_exists('\SidcraftPageBuilder\Units\MenuAnchor',false)&&method_exists('\SidcraftPageBuilder\Units\MenuAnchor','boot')) \SidcraftPageBuilder\Units\MenuAnchor::boot();
  $nav_file=SIDCRAFT_PAGE_BUILDER_PATH.'includes/units/class-site_nav.php';
  if(is_readable($nav_file)) require_once $nav_file;
  if(class_exists('\SidcraftPageBuilder\Units\SiteNav',false)&&method_exists('\SidcraftPageBuilder\Units\SiteNav','boot')) \SidcraftPageBuilder\Units\SiteNav::boot();
 }
 public static function frontend_assets(){if(is_singular()){} }
 public static function frontend_head(){
  if(function_exists('is_singular')&&!is_singular())return;
  $id=function_exists('get_the_ID')?absint(get_the_ID()):0;
  if(!$id||!class_exists('\\SidcraftPageBuilder\\Document\\DocumentManager')||!DocumentManager::has($id))return;
  self::frontend_global_css();
 }
 public static function frontend_form_endpoint(){ if(!function_exists('wp_add_inline_script'))return; $js='window.sidcraftPageBuilderFormEndpoint='.wp_json_encode(esc_url_raw(rest_url('sidcraft-page-builder/v1/form'))).';'; if(function_exists('wp_script_is')&&!wp_script_is('sidcraft-page-builder-frontend','registered')&&function_exists('wp_register_script')) wp_register_script('sidcraft-page-builder-frontend',false,array(),defined('SIDCRAFT_PAGE_BUILDER_VERSION')?SIDCRAFT_PAGE_BUILDER_VERSION:null,true); wp_enqueue_script('sidcraft-page-builder-frontend'); wp_add_inline_script('sidcraft-page-builder-frontend',$js,'before'); }
 public static function frontend_global_css(){
  if(class_exists('\\SidcraftPageBuilder\\Design\\CssPrint')){
   \SidcraftPageBuilder\Design\CssPrint::print_head_fallback();
   return;
  }
  if(!is_singular())return;$css=\SidcraftPageBuilder\Design\Variables::css();if(class_exists('\\SidcraftPageBuilder\\Design\\ThemeStyle'))$css.=\SidcraftPageBuilder\Design\ThemeStyle::css();if(class_exists('\\SidcraftPageBuilder\\Settings\\KitSettings'))$css.=\SidcraftPageBuilder\Settings\KitSettings::css();$css.=\SidcraftPageBuilder\Design\GlobalClasses::css().\SidcraftPageBuilder\Design\Interactions::css();if($css&&function_exists('wp_add_inline_style')){wp_register_style('sidcraft-page-builder-global',false,array('sidcraft-page-builder-frontend'),defined('SIDCRAFT_PAGE_BUILDER_VERSION')?SIDCRAFT_PAGE_BUILDER_VERSION:null);wp_enqueue_style('sidcraft-page-builder-frontend');wp_enqueue_style('sidcraft-page-builder-global');wp_add_inline_style('sidcraft-page-builder-global',wp_strip_all_tags($css));}
 }
}
