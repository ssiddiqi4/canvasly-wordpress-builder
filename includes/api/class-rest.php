<?php
namespace SidcraftPageBuilder\API;
use SidcraftPageBuilder\Document\DocumentManager;
use SidcraftPageBuilder\Design\GlobalClasses;
use SidcraftPageBuilder\Design\Variables;
use SidcraftPageBuilder\Design\ThemeStyle;
use SidcraftPageBuilder\Design\Components;
use SidcraftPageBuilder\Design\Favorites;
use SidcraftPageBuilder\Design\SiteNavigation;
if(!defined('ABSPATH')) exit;
class Rest {
 /**
  * Send an explicit UTF-8 charset on every sidcraft-page-builder/v1 response. Rendered widget
  * HTML (loops, shortcode previews, theme chrome) travels inside these JSON bodies.
  * @param mixed            $response
  * @param \WP_REST_Server  $server
  * @param \WP_REST_Request $request
  * @return mixed
  */
 public static function utf8_content_type($response,$server,$request){
  if($response instanceof \WP_REST_Response && $request instanceof \WP_REST_Request && strpos((string)$request->get_route(),'/sidcraft-page-builder/v1')===0){
   $response->header('Content-Type','application/json; charset=UTF-8');
  }
  return $response;
 }
 public static function register_routes(){
  register_rest_route('sidcraft-page-builder/v1','/document/(?P<id>\d+)/autosave',['methods'=>['GET','POST'],'callback'=>function($r){$id=absint($r['id']);if($r->get_method()==='POST'){$d=$r->get_json_params();if(!self::is_document_payload($d))return self::invalid_document_error();return rest_ensure_response(['success'=>DocumentManager::autosave($id,$d)]);}return rest_ensure_response(DocumentManager::get_autosave($id)?:['document'=>null]);},'permission_callback'=>[__CLASS__,'can_edit']]);
  register_rest_route('sidcraft-page-builder/v1','/document/(?P<id>\d+)/export',['methods'=>'GET','callback'=>function($r){$id=absint($r['id']);return rest_ensure_response(DocumentManager::get($id));},'permission_callback'=>[__CLASS__,'can_edit']]);
  register_rest_route('sidcraft-page-builder/v1','/document/(?P<id>\d+)/import',['methods'=>'POST','callback'=>function($r){$id=absint($r['id']);$d=$r->get_json_params();if(!self::is_document_payload($d))return self::invalid_document_error();$saved=DocumentManager::save($id,$d);return is_wp_error($saved)?$saved:rest_ensure_response(['success'=>true,'document'=>$saved]);},'permission_callback'=>[__CLASS__,'can_edit']]);
  register_rest_route('sidcraft-page-builder/v1','/document/(?P<id>\d+)/status',['methods'=>'POST','callback'=>[__CLASS__,'set_status'],'permission_callback'=>[__CLASS__,'can_edit']]);
  register_rest_route('sidcraft-page-builder/v1','/document/(?P<id>\d+)',[
   ['methods'=>'GET','callback'=>[__CLASS__,'get_document'],'permission_callback'=>[__CLASS__,'can_edit']],
   ['methods'=>'POST','callback'=>[__CLASS__,'save_document'],'permission_callback'=>[__CLASS__,'can_edit']]
  ]);
  register_rest_route('sidcraft-page-builder/v1','/document/(?P<id>\d+)/revisions',['methods'=>'GET','callback'=>[__CLASS__,'get_revisions'],'permission_callback'=>[__CLASS__,'can_edit']]);
  register_rest_route('sidcraft-page-builder/v1','/document/(?P<id>\d+)/revisions/(?P<revision>\d+)',['methods'=>'GET','callback'=>[__CLASS__,'get_revision'],'permission_callback'=>[__CLASS__,'can_edit']]);
  register_rest_route('sidcraft-page-builder/v1','/document/(?P<id>\d+)/revisions/(?P<revision>\d+)/restore',['methods'=>'POST','callback'=>[__CLASS__,'restore_revision'],'permission_callback'=>[__CLASS__,'can_edit']]);
  register_rest_route('sidcraft-page-builder/v1','/templates',['methods'=>['GET','POST'],'callback'=>function($r){return $r->get_method()==='GET'?self::templates($r):self::save_template($r);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/templates/types',['methods'=>'GET','callback'=>function(){return class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates')?\SidcraftPageBuilder\Templates\SavedTemplates::rest_types():rest_ensure_response(['types'=>[],'categories'=>[]]);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/templates/picker',['methods'=>'GET','callback'=>function($r){return class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates')?\SidcraftPageBuilder\Templates\SavedTemplates::rest_picker($r):rest_ensure_response([]);},'permission_callback'=>[__CLASS__,'can_picker']]);
  register_rest_route('sidcraft-page-builder/v1','/templates/export',['methods'=>['GET','POST'],'callback'=>function($r){return class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates')?\SidcraftPageBuilder\Templates\SavedTemplates::rest_export_bulk($r):new \WP_Error('missing',__('Exporter is unavailable.', 'sidcraft-page-builder'),['status'=>500]);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/templates/import',['methods'=>'POST','callback'=>function($r){return class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates')?\SidcraftPageBuilder\Templates\SavedTemplates::rest_import($r):new \WP_Error('missing',__('Importer is unavailable.', 'sidcraft-page-builder'),['status'=>500]);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/templates/(?P<id>\d+)',['methods'=>'GET','callback'=>[__CLASS__,'get_template'],'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/templates/(?P<id>\d+)/export',['methods'=>'GET','callback'=>function($r){return class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates')?\SidcraftPageBuilder\Templates\SavedTemplates::rest_export($r):new \WP_Error('missing',__('Exporter is unavailable.', 'sidcraft-page-builder'),['status'=>500]);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/templates/(?P<id>\d+)/thumbnail',['methods'=>'POST','callback'=>function($r){return class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates')?\SidcraftPageBuilder\Templates\SavedTemplates::rest_thumbnail($r):new \WP_Error('missing',__('Thumbnails are unavailable.', 'sidcraft-page-builder'),['status'=>500]);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/templates/(?P<id>\d+)/duplicate',['methods'=>'POST','callback'=>function($r){if(class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates'))return \SidcraftPageBuilder\Templates\SavedTemplates::rest_duplicate($r);$id=absint($r['id']);$p=get_post($id);if(!$p||$p->post_type!=='sidsyn_template')return new \WP_Error('not_found',__('Template not found', 'sidcraft-page-builder'),['status'=>404]);$new=wp_insert_post(['post_type'=>'sidsyn_template','post_status'=>'publish','post_title'=>$p->post_title.' Copy']);$d=get_post_meta($id,'_sidsyn_template_data',true);update_post_meta($new,'_sidsyn_template_data',$d);update_post_meta($new,'_sidsyn_template_type',get_post_meta($id,'_sidsyn_template_type',true));return rest_ensure_response(['success'=>true,'id'=>$new]);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/templates/(?P<id>\d+)',['methods'=>'DELETE','callback'=>function($r){$id=absint($r['id']);return rest_ensure_response(['success'=>(bool)wp_delete_post($id,true)]);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/classes',['methods'=>['GET','POST'],'callback'=>function($r){return $r->get_method()==='GET'?rest_ensure_response([]):self::save_class($r);},'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/classes/(?P<name>[a-zA-Z0-9_-]+)',['methods'=>'DELETE','callback'=>[__CLASS__,'delete_class'],'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/global-settings',['methods'=>['GET','POST'],'callback'=>function($r){$g=\SidcraftPageBuilder\Settings\GlobalSettings::get();if($r->get_method()==='POST'){if(!current_user_can('manage_options'))return new \WP_Error('forbidden',__('Only administrators can change global settings', 'sidcraft-page-builder'),['status'=>403]);$d=$r->get_json_params();if(is_array($d['breakpoints']??null))$g=\SidcraftPageBuilder\Settings\GlobalSettings::save_breakpoints($d['breakpoints']);if(array_key_exists('post_types',$d))$g=\SidcraftPageBuilder\Settings\GlobalSettings::save_post_types($d['post_types']);if(array_key_exists('content_width',$d)){$g['content_width']=sanitize_text_field($d['content_width']??$g['content_width']);update_option(\SidcraftPageBuilder\Settings\GlobalSettings::KEY,$g,false);}if(array_key_exists('css_print_method',$d)&&class_exists('\\SidcraftPageBuilder\\Design\\CssPrint')){\SidcraftPageBuilder\Design\CssPrint::save_method($d['css_print_method']);}if(class_exists('\\SidcraftPageBuilder\\Design\\Fonts'))\SidcraftPageBuilder\Design\Fonts::save_from(is_array($d)?$d:[]);if(class_exists('\\SidcraftPageBuilder\\Design\\Optimize'))\SidcraftPageBuilder\Design\Optimize::save_from(is_array($d)?$d:[]);if(class_exists('\\SidcraftPageBuilder\\Settings\\AdminSettings')){\SidcraftPageBuilder\Settings\AdminSettings::save(is_array($d)?$d:[],true);}$g=\SidcraftPageBuilder\Settings\GlobalSettings::get();return rest_ensure_response($g);}return rest_ensure_response($g);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/variables/custom/(?P<group>[a-zA-Z0-9_-]+)/(?P<name>[a-zA-Z0-9_-]+)',['methods'=>'DELETE','callback'=>function($r){return rest_ensure_response(['success'=>\SidcraftPageBuilder\Design\Variables::delete_custom($r['group'],$r['name'])]);},'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/variables',['methods'=>['GET','POST'],'callback'=>function($r){if($r->get_method()==='POST'){ $d=$r->get_json_params(); $saved=Variables::save(is_array($d)?$d:[]); return rest_ensure_response($saved?:Variables::all()); } return rest_ensure_response(Variables::all());},'permission_callback'=>[__CLASS__,'can_edit']]);
  register_rest_route('sidcraft-page-builder/v1','/theme-style',['methods'=>['GET','POST'],'callback'=>function($r){if($r->get_method()==='POST'){ $d=$r->get_json_params(); $saved=class_exists(ThemeStyle::class)?ThemeStyle::save(is_array($d)?$d:[]):false; return rest_ensure_response($saved?:(class_exists(ThemeStyle::class)?ThemeStyle::all():[])); } return rest_ensure_response(class_exists(ThemeStyle::class)?ThemeStyle::all():[]);},'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/kit-settings',['methods'=>['GET','POST'],'callback'=>function($r){if($r->get_method()==='POST'){ $d=$r->get_json_params(); $saved=class_exists('\\SidcraftPageBuilder\\Settings\\KitSettings')?\SidcraftPageBuilder\Settings\KitSettings::save(is_array($d)?$d:[]):false; return rest_ensure_response($saved?:(class_exists('\\SidcraftPageBuilder\\Settings\\KitSettings')?\SidcraftPageBuilder\Settings\KitSettings::all():[])); } return rest_ensure_response(class_exists('\\SidcraftPageBuilder\\Settings\\KitSettings')?\SidcraftPageBuilder\Settings\KitSettings::all():[]);},'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/components',['methods'=>['GET','POST'],'callback'=>function($r){return $r->get_method()==='GET'?rest_ensure_response(Components::all()):self::save_component($r);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/components/(?P<id>\d+)',[['methods'=>'GET','callback'=>function($r){$c=Components::get(absint($r['id']));return $c?rest_ensure_response($c):new \WP_Error('not_found',__('Component not found', 'sidcraft-page-builder'),['status'=>404]);},'permission_callback'=>[__CLASS__,'can_templates']],['methods'=>'POST','callback'=>function($r){$c=Components::get(absint($r['id']));if(!$c)return new \WP_Error('not_found',__('Component not found', 'sidcraft-page-builder'),['status'=>404]);$d=(array)$r->get_json_params();$id=Components::save($d['title']??$c['title'],is_array($d['document']??null)?$d['document']:$c['document'],(array)($d['exposed']??$c['exposed']),absint($r['id']),$d['key']??($c['key']??''));return is_wp_error($id)?$id:rest_ensure_response(['success'=>true,'id'=>$id,'component'=>Components::get($id)]);},'permission_callback'=>[__CLASS__,'can_templates']],['methods'=>'DELETE','callback'=>function($r){return rest_ensure_response(['success'=>Components::delete(absint($r['id']))]);},'permission_callback'=>[__CLASS__,'can_templates']]]);
  register_rest_route('sidcraft-page-builder/v1','/components/(?P<id>\d+)/duplicate',['methods'=>'POST','callback'=>function($r){$id=Components::duplicate(absint($r['id']));return $id?rest_ensure_response(['success'=>true,'id'=>$id]):new \WP_Error('not_found',__('Component not found', 'sidcraft-page-builder'),['status'=>404]);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/favorites',['methods'=>['GET','POST'],'callback'=>function($r){return $r->get_method()==='GET'?rest_ensure_response(Favorites::all()):rest_ensure_response(Favorites::save((array)($r->get_json_params()['items']??[])));},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/preferences',['methods'=>['GET','POST'],'callback'=>[__CLASS__,'user_preferences'],'permission_callback'=>[__CLASS__,'can_preferences']]);
  register_rest_route('sidcraft-page-builder/v1','/pages',['methods'=>'POST','callback'=>function($r){$d=(array)$r->get_json_params();$title=sanitize_text_field($d['title']??'Sidcraft Page Builder Page');if($title==='')$title=__('Sidcraft Page Builder Page', 'sidcraft-page-builder');if(!current_user_can('edit_pages'))return new \WP_Error('forbidden',__('You cannot create pages.', 'sidcraft-page-builder'),['status'=>403]);$id=wp_insert_post(['post_type'=>'page','post_status'=>'draft','post_title'=>$title,'post_content'=>''],true);if(is_wp_error($id))return $id;if(!$id)return new \WP_Error('create_failed',__('WordPress could not create the page.', 'sidcraft-page-builder'),['status'=>500]);$empty=DocumentManager::empty();$saved=DocumentManager::save($id,$empty);if(is_wp_error($saved)){wp_delete_post($id,true);return $saved;}return rest_ensure_response(['success'=>true,'id'=>(int)$id,'title'=>get_the_title($id),'url'=>admin_url('admin.php?page=sidcraft-page-builder&post_id='.(int)$id)]);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/navigation',['methods'=>'GET','callback'=>function(){return rest_ensure_response(SiteNavigation::pages());},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/icons/custom',['methods'=>'POST','callback'=>function($r){$d=(array)$r->get_json_params();$x=\SidcraftPageBuilder\Design\IconLibrary::save($d['id']??'', $d['title']??'', $d['category']??'Custom', $d['svg']??'');return is_wp_error($x)?$x:rest_ensure_response($x);},'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/icons/custom/(?P<id>[a-zA-Z0-9_-]+)',['methods'=>'DELETE','callback'=>function($r){return rest_ensure_response(['success'=>\SidcraftPageBuilder\Design\IconLibrary::delete($r['id'])]);},'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/media',['methods'=>'GET','callback'=>function($r){return rest_ensure_response(\SidcraftPageBuilder\Design\Media::library($r->get_param('search')?:'',100));},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/media/(?P<id>\d+)',['methods'=>'GET','callback'=>function($r){$m=\SidcraftPageBuilder\Design\Media::attachment(absint($r['id']),$r->get_param('size')?:'full');return $m?rest_ensure_response($m):new \WP_Error('not_found',__('Media item not found', 'sidcraft-page-builder'),['status'=>404]);},'permission_callback'=>[__CLASS__,'can_templates']]);
  register_rest_route('sidcraft-page-builder/v1','/lock/(?P<id>\d+)',['methods'=>['GET','POST'],'callback'=>[__CLASS__,'post_lock'],'permission_callback'=>[__CLASS__,'can_edit']]);
  register_rest_route('sidcraft-page-builder/v1','/performance/(?P<id>\d+)',['methods'=>'GET','callback'=>function($r){$id=absint($r['id']);return rest_ensure_response(['manifest'=>\SidcraftPageBuilder\Design\Performance::manifest(),'version'=>\SidcraftPageBuilder\Design\Performance::version($id)]);},'permission_callback'=>[__CLASS__,'can_edit']]);
  register_rest_route('sidcraft-page-builder/v1','/design-system',['methods'=>'GET','callback'=>function(){return rest_ensure_response(\SidcraftPageBuilder\Design\DesignSystem::export());},'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/design-system/import',['methods'=>'POST','callback'=>function($r){$d=(array)$r->get_json_params();return rest_ensure_response(\SidcraftPageBuilder\Design\DesignSystem::import($d,$d['mode']??'merge'));},'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/design-system/export',['methods'=>'GET','callback'=>function(){return rest_ensure_response(\SidcraftPageBuilder\Design\DesignSystem::export());},'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/kit',['methods'=>'GET','callback'=>function(){return rest_ensure_response(\SidcraftPageBuilder\Design\Kit::summary());},'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/kit/export',['methods'=>['GET','POST'],'callback'=>[__CLASS__,'export_kit'],'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/kit/import',['methods'=>'POST','callback'=>[__CLASS__,'import_kit'],'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/kit/download/(?P<token>[a-zA-Z0-9]+)',['methods'=>'GET','callback'=>[__CLASS__,'download_kit'],'permission_callback'=>[__CLASS__,'can_design']]);
  register_rest_route('sidcraft-page-builder/v1','/form',['methods'=>'POST','callback'=>[__CLASS__,'submit_form'],'permission_callback'=>'__return_true']);
  register_rest_route('sidcraft-page-builder/v1','/dynamic/(?P<id>\d+)',['methods'=>'GET','callback'=>function($r){$id=absint($r['id']);return rest_ensure_response(['post_id'=>$id,'title'=>get_the_title($id),'content'=>apply_filters('the_content',get_post_field('post_content',$id)),'excerpt'=>get_the_excerpt($id),'featured_image'=>get_the_post_thumbnail_url($id,'full'),'author'=>get_the_author_meta('display_name',get_post_field('post_author',$id)),'date'=>get_post_field('post_date',$id),'url'=>get_permalink($id)]);},'permission_callback'=>[__CLASS__,'can_edit']]); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Core content filter so dynamic previews match the front end.
  register_rest_route('sidcraft-page-builder/v1','/dynamic-tags/preview',['methods'=>'POST','callback'=>[__CLASS__,'preview_dynamic_tag'],'permission_callback'=>[__CLASS__,'can_edit_preview']]);
  register_rest_route('sidcraft-page-builder/v1','/loop',['methods'=>'GET','callback'=>[__CLASS__,'loop_page'],'permission_callback'=>[__CLASS__,'can_loop_page'],'args'=>[
   'document'=>['required'=>true,'sanitize_callback'=>'absint'],
   'node'=>['required'=>true,'sanitize_callback'=>'sanitize_text_field'],
   'page'=>['required'=>false,'sanitize_callback'=>'absint'],
   'taxonomy'=>['required'=>false,'sanitize_callback'=>'sanitize_key'],
   'terms'=>['required'=>false,'sanitize_callback'=>'sanitize_text_field'],
  ]]);
  register_rest_route('sidcraft-page-builder/v1','/loop/preview',['methods'=>'POST','callback'=>[__CLASS__,'loop_preview'],'permission_callback'=>[__CLASS__,'can_edit_preview']]);
  register_rest_route('sidcraft-page-builder/v1','/shortcode/preview',['methods'=>'POST','callback'=>[__CLASS__,'preview_shortcode'],'permission_callback'=>[__CLASS__,'can_edit_preview']]);
  register_rest_route('sidcraft-page-builder/v1','/widget/preview',['methods'=>'POST','callback'=>[__CLASS__,'preview_widget'],'permission_callback'=>[__CLASS__,'can_edit_preview']]);
  /**
   * Fires after core routes are registered. Add-ons register their own routes here; the namespace
   * is passed so they can share it (e.g. `register_rest_route($ns,'/my-route',...)`).
   * @param string $namespace 'sidcraft-page-builder/v1'
   */
  do_action('sidcraft_page_builder_rest_register_routes','sidcraft-page-builder/v1');
 }
 public static function can_edit($req){
  if(class_exists('\\SidcraftPageBuilder\\Settings\\Roles')&&!\SidcraftPageBuilder\Settings\Roles::can_edit())return false;
  $id=absint($req['id']);if($id&&function_exists('get_post_type')&&get_post_type($id)==='sidsyn_template')return current_user_can('edit_post',$id)||current_user_can('edit_pages');if($id&&class_exists('\SidcraftPageBuilder\Document\Documents')&&!\SidcraftPageBuilder\Document\Documents::supports_post($id))return false;return current_user_can('edit_post',$id);
 }
 public static function post_lock($req){
  $id=absint($req['id']);
  if(!class_exists('\\SidcraftPageBuilder\\Design\\Collaboration'))return rest_ensure_response(['locked'=>false,'user'=>0,'name'=>'','time'=>0,'lock'=>'']);
  if($req->get_method()==='GET')return rest_ensure_response(\SidcraftPageBuilder\Design\Collaboration::status($id));
  $d=is_array($req->get_json_params())?$req->get_json_params():[];
  $takeover=!empty($d['takeover']);
  return rest_ensure_response(\SidcraftPageBuilder\Design\Collaboration::heartbeat($id,$takeover));
 }
 public static function can_edit_preview($req){
  if(class_exists('\\SidcraftPageBuilder\\Settings\\Roles')&&!\SidcraftPageBuilder\Settings\Roles::can_edit())return false;
  $d=is_array($req->get_json_params())?$req->get_json_params():[];
  $id=absint($d['post_id']??$req['id']??0);
  if($id){
   if(function_exists('get_post_type')&&get_post_type($id)==='sidsyn_template')return current_user_can('edit_post',$id)||current_user_can('edit_pages');
   if(class_exists('\SidcraftPageBuilder\Document\Documents')&&!\SidcraftPageBuilder\Document\Documents::supports_post($id))return false;
   return current_user_can('edit_post',$id);
  }
  return current_user_can('edit_posts')||current_user_can('edit_pages');
 }
 public static function preview_dynamic_tag($req){
  if(!class_exists('\\SidcraftPageBuilder\\Dynamic\\Tags')||!class_exists('\\SidcraftPageBuilder\\Dynamic\\Tag'))return rest_ensure_response(['value'=>'','url'=>'','preview'=>'']);
  $d=(array)$req->get_json_params();
  $post_id=absint($d['post_id']??0);
  $tag=sanitize_key($d['tag']??'');
  $extra=is_array($d['settings']??null)?$d['settings']:[];
  $binding=\SidcraftPageBuilder\Dynamic\Resolver::sanitize_binding(array_merge($extra,['tag'=>$tag]));
  if(!$binding)return rest_ensure_response(['value'=>'','url'=>'','preview'=>'']);
  $ctx=\SidcraftPageBuilder\Dynamic\Resolver::context($post_id,true);
  $obj=\SidcraftPageBuilder\Dynamic\Tags::ready()->get($binding['tag']);
  $raw=$obj?$obj->preview($binding,$ctx):'';
  $type=sanitize_key($d['control_type']??'text');
  $extracted=\SidcraftPageBuilder\Dynamic\Resolver::extract($raw,$type);
  $display=is_scalar($extracted['value'])?(string)$extracted['value']:($extracted['url']??'');
  if(trim((string)$display)===''&&($binding['fallback']??'')!=='')$display=(string)$binding['fallback'];
  $display=\SidcraftPageBuilder\Dynamic\Resolver::wrap($display,$binding);
  return rest_ensure_response(['value'=>is_scalar($extracted['value'])?$extracted['value']:'','url'=>$extracted['url'],'preview'=>\SidcraftPageBuilder\Dynamic\Resolver::preview_string($display!==''?$display:$raw)]);
 }
 public static function can_loop_page($req){
  $id=absint($req['document']??$req->get_param('document'));
  if(!$id)return false;
  $post=get_post($id);
  if(!$post)return false;
  if($post->post_status==='publish'&&function_exists('is_post_publicly_viewable')&&is_post_publicly_viewable($post))return true;
  if($post->post_status==='publish')return true;
  return current_user_can('edit_post',$id);
 }
 public static function loop_page($req){
  $id=absint($req['document']??$req->get_param('document'));
  $node_id=preg_replace('/[^a-zA-Z0-9_-]/','',(string)($req['node']??$req->get_param('node')));
  $page=max(1,absint($req['page']??$req->get_param('page')??1));
  $doc=DocumentManager::get($id);
  $node=\SidcraftPageBuilder\Units\CollectionLoop::find_node(is_array($doc['root']??null)?$doc['root']:[],$node_id);
  if(!$node||($node['type']??'')!=='collection_loop')return new \WP_Error('not_found',__('Collection Loop not found', 'sidcraft-page-builder'),['status'=>404]);
  $el=\SidcraftPageBuilder\Units\UnitRegistry::instance()->get('collection_loop');
  if(!$el||!method_exists($el,'render_collection'))return new \WP_Error('not_found',__('Collection Loop not found', 'sidcraft-page-builder'),['status'=>404]);
  $s=is_array($node['settings']??null)?$node['settings']:[];
  if(class_exists('\\SidcraftPageBuilder\\Query\\Query'))$s=\SidcraftPageBuilder\Query\Query::with_request_tax($s,$req['taxonomy']??$req->get_param('taxonomy'),$req['terms']??$req->get_param('terms'));
  $html=$el->render_collection($s,$node,$id,$page,true);
  $result=class_exists('\\SidcraftPageBuilder\\Query\\Query')?\SidcraftPageBuilder\Query\Query::run($s,$page,$id):['max_pages'=>1,'page'=>$page,'found'=>0];
  $limit=absint($s['page_limit']??0);
  $max=max(1,absint($result['max_pages']??1));
  if($limit>0)$max=min($max,$limit);
  return rest_ensure_response(['html'=>$html,'page'=>$page,'max_pages'=>$max,'found'=>absint($result['found']??0),'done'=>$page>=$max]);
 }
 public static function preview_shortcode($req){
  $d=is_array($req->get_json_params())?$req->get_json_params():[];
  $post_id=absint($d['post_id']??0);
  $code=isset($d['shortcode'])?$d['shortcode']:'';
  if(!class_exists('\\SidcraftPageBuilder\\Units\\Shortcode'))return rest_ensure_response(['html'=>'','css'=>'','links'=>[]]);
  return rest_ensure_response(\SidcraftPageBuilder\Units\Shortcode::preview($code,$post_id));
 }
 /** Sidebar and WordPress Widget markup for the editor canvas, rendered as on the page. */
 public static function preview_widget($req){
  $d=is_array($req->get_json_params())?$req->get_json_params():[];
  $type=sanitize_key($d['type']??'');
  $empty=['html'=>'','css'=>'','links'=>[]];
  $registry=class_exists('\\SidcraftPageBuilder\\Units\\UnitRegistry')?\SidcraftPageBuilder\Units\UnitRegistry::instance():null;
  $unit=($registry&&in_array($type,['sidebar','wordpress_widget'],true))?$registry->get($type):null;
  if(!$unit||!class_exists('\\SidcraftPageBuilder\\Units\\Shortcode'))return rest_ensure_response($empty);
  $s=is_array($d['settings']??null)?$d['settings']:[];
  $s=array_intersect_key($s,array_flip(['sidebar','widget','title','widget_options']));
  $s=array_map(function($v){return is_scalar($v)?(string)$v:'';},$s);
  $out=\SidcraftPageBuilder\Units\Shortcode::capture(function()use($unit,$s){
   return \SidcraftPageBuilder\Rendering\OutputEscape::render(function()use($unit,$s){return $unit->render($s);});
  },absint($d['post_id']??0));
  return rest_ensure_response($out);
 }
 public static function loop_preview($req){
  $d=is_array($req->get_json_params())?$req->get_json_params():[];
  $post_id=absint($d['post_id']??0);
  $s=is_array($d['settings']??null)?$d['settings']:[];
  $page=max(1,absint($d['page']??1));
  if(!class_exists('\\SidcraftPageBuilder\\Query\\Query'))return rest_ensure_response(['found'=>0,'titles'=>[],'kind'=>'posts']);
  $result=\SidcraftPageBuilder\Query\Query::run($s,$page,$post_id);
  $titles=[];
  foreach($result['items'] as $item){
   if(is_object($item)&&isset($item->post_title))$titles[]=(string)$item->post_title;
   elseif(is_object($item)&&isset($item->name))$titles[]=(string)$item->name;
  }
  return rest_ensure_response(['found'=>absint($result['found']),'max_pages'=>absint($result['max_pages']),'kind'=>$result['kind'],'titles'=>array_slice($titles,0,12)]);
 }
 public static function can_templates(){
  if(class_exists('\\SidcraftPageBuilder\\Settings\\Roles')&&!\SidcraftPageBuilder\Settings\Roles::can_edit())return false;
  return current_user_can('edit_pages');
 }
 public static function submit_form($r){
  if(class_exists('\\SidcraftPageBuilder\\Settings\\AdminSettings')){
   $check=\SidcraftPageBuilder\Settings\AdminSettings::verify_form_request($r);
   if(is_wp_error($check))return $check;
  }
  $d=(array)$r->get_params();
  unset($d['website'],$d['g-recaptcha-response'],$d['recaptcha_token'],$d['cf-turnstile-response']);
  $to=sanitize_email($d['_to']??get_option('admin_email'));
  $subject=sanitize_text_field($d['_subject']??__('Sidcraft Page Builder Form Submission', 'sidcraft-page-builder'));
  $skip=['_to','_subject','_success','_post_id','_unit_id'];
  $fields=[];
  $body='';
  foreach($d as $k=>$v){
   if(in_array($k,$skip,true))continue;
   $key=sanitize_key($k);
   $value=sanitize_textarea_field(is_array($v)?implode(', ',$v):$v);
   if($key!=='')$fields[$key]=$value;
   $body.=$key.': '.$value."\n";
  }
  $post_id=absint($d['_post_id']??0);
  $unit_id=preg_replace('/[^A-Za-z0-9_-]/','',(string)($d['_unit_id']??''));
  $result=[
   'success'=>false,
   'send_email'=>true,
   'to'=>$to,
   'subject'=>$subject,
   'body'=>$body,
   'message'=>'',
   'post_id'=>$post_id,
   'unit_id'=>$unit_id,
  ];
  /** Filter a form submission before the default email. Return send_email false to skip wp_mail. Lite does not store the visitor IP. @param array $result @param array $fields @param \WP_REST_Request $r */
  $filtered=apply_filters('sidcraft_page_builder_form_submission',$result,$fields,$r);
  if(!is_array($filtered))$filtered=$result;
  $send=!array_key_exists('send_email',$filtered)||!empty($filtered['send_email']);
  if($send){
   $mail_to=sanitize_email($filtered['to']??$to);
   $mail_subject=sanitize_text_field((string)($filtered['subject']??$subject));
   $mail_body=isset($filtered['body'])&&is_string($filtered['body'])?$filtered['body']:$body;
   $ok=$mail_to?wp_mail($mail_to,$mail_subject,$mail_body):false;
   $filtered['success']=(bool)$ok;
  }
  $ok=!empty($filtered['success']);
  $msg=!empty($d['_success'])?sanitize_text_field($d['_success']):'';
  if(!empty($filtered['message'])&&is_string($filtered['message']))$msg=sanitize_text_field($filtered['message']);
  if($msg==='')$msg=$ok?__('Thanks! Your message has been sent.', 'sidcraft-page-builder'):__('The form could not be sent.', 'sidcraft-page-builder');
  $out=['success'=>$ok,'message'=>$msg];
  if(!empty($filtered['redirect'])&&is_string($filtered['redirect'])){
   $redirect=esc_url_raw($filtered['redirect']);
   if($redirect!==''&&preg_match('#^https?://#i',$redirect))$out['redirect']=$redirect;
  }
  return rest_ensure_response($out);
 }
 public static function can_picker(){
  if(class_exists('\\SidcraftPageBuilder\\Settings\\Roles')&&!\SidcraftPageBuilder\Settings\Roles::can_edit())return false;
  return current_user_can('edit_posts')||current_user_can('edit_pages');
 }
 public static function can_design(){
  if(class_exists('\\SidcraftPageBuilder\\Settings\\Roles'))return \SidcraftPageBuilder\Settings\Roles::can_design();
  return current_user_can('sidcraft_page_builder_design');
 }
 public static function can_preferences(){
  if(!is_user_logged_in())return false;
  if(class_exists('\\SidcraftPageBuilder\\Settings\\Roles')&&!\SidcraftPageBuilder\Settings\Roles::can_edit())return false;
  return current_user_can('edit_posts')||current_user_can('edit_pages');
 }
 public static function user_preferences($req){
  if(!class_exists('\\SidcraftPageBuilder\\Settings\\UserPreferences'))return rest_ensure_response([]);
  if($req->get_method()==='POST'){
   $saved=\SidcraftPageBuilder\Settings\UserPreferences::save((array)$req->get_json_params());
   return is_wp_error($saved)?$saved:rest_ensure_response($saved);
  }
  return rest_ensure_response(\SidcraftPageBuilder\Settings\UserPreferences::get());
 }
 public static function get_document($req){
  $id=absint($req['id']);
  $doc=DocumentManager::for_editor($id);
  $response=rest_ensure_response($doc);
  if(is_object($response)&&method_exists($response,'header')){
   $updated=(string)get_post_meta($id,DocumentManager::UPDATED,true);
   $etag='"'.md5($id.'|'.$updated.'|'.DocumentManager::SCHEMA.'|'.md5(wp_json_encode($doc))).'"';
   $response->header('ETag',$etag);
   $response->header('Cache-Control','private, no-cache');
   $match='';
   if(isset($_SERVER['HTTP_IF_NONE_MATCH'])){
    $match=sanitize_text_field(wp_unslash($_SERVER['HTTP_IF_NONE_MATCH']));
   }
   if($match!==''&&trim($match)===$etag){
    $response->set_status(304);
   }
  }
  return $response;
 }
 public static function save_document($req){$id=absint($req['id']);$data=$req->get_json_params();if(!self::is_document_payload($data))return self::invalid_document_error();$result=DocumentManager::save($id,$data);if(is_wp_error($result))return $result;return rest_ensure_response(['success'=>true,'document'=>$result,'status'=>(string)get_post_status($id)]);}
 /**
  * A save body must be a decoded document object. A missing or unparseable
  * body (oversized request, proxy that dropped the payload) used to be saved
  * as an empty document, which wiped the page and made the editor fall back
  * to previewing the Elementor source again. Refuse it instead.
  *
  * @param mixed $data
  * @return bool
  */
 public static function is_document_payload($data){
  if(!is_array($data))return false;
  foreach(['root','header','footer','settings','version'] as $key){
   if(array_key_exists($key,$data))return true;
  }
  return false;
 }
 private static function invalid_document_error(){
  return new \WP_Error('invalid_document',__('The document could not be read from the request, so nothing was saved. Reload the editor and try again.', 'sidcraft-page-builder'),['status'=>400]);
 }
 /**
  * Statuses the editor may move a document to.
  *
  * @return string[]
  */
 public static function editable_statuses(){return ['publish','draft','pending','private'];}
 /**
  * Change the WordPress post status of a document from the editor
  * (Publish / Save Draft). Saved templates are always published and are
  * left alone.
  *
  * @param \WP_REST_Request $req
  * @return \WP_REST_Response|\WP_Error
  */
 public static function set_status($req){
  $id=absint($req['id']);
  $post=get_post($id);
  if(!$post)return new \WP_Error('not_found',__('Document not found.', 'sidcraft-page-builder'),['status'=>404]);
  $d=$req->get_json_params();
  $status=sanitize_key((string)((is_array($d)?($d['status']??''):'')));
  if(!in_array($status,self::editable_statuses(),true))return new \WP_Error('invalid_status',__('Unsupported post status.', 'sidcraft-page-builder'),['status'=>400]);
  $current=(string)($post->post_status??'');
  $type=(string)($post->post_type??'');
  if($type==='sidsyn_template'||$type==='revision')return rest_ensure_response(['success'=>true,'status'=>$current,'permalink'=>'','previewUrl'=>'','changed'=>false]);
  if(!current_user_can('edit_post',$id))return new \WP_Error('forbidden',__('You cannot edit this document.', 'sidcraft-page-builder'),['status'=>403]);
  if(in_array($status,['publish','private'],true)&&$current!==$status){
   $can=current_user_can('publish_post',$id);
   if(!$can){
    $obj=function_exists('get_post_type_object')?get_post_type_object($type):null;
    $cap=$obj&&isset($obj->cap->publish_posts)?(string)$obj->cap->publish_posts:($type==='page'?'publish_pages':'publish_posts');
    $can=current_user_can($cap);
   }
   if(!$can)return new \WP_Error('forbidden',__('You cannot publish this document.', 'sidcraft-page-builder'),['status'=>403]);
  }
  $changed=false;
  if($current!==$status){
   $args=['ID'=>$id,'post_status'=>$status];
   // Publishing a page that never had a slug (a draft created by the
   // editor or a converted copy) lets WordPress build one from the title.
   if($status==='publish'&&($post->post_name??'')===''&&($post->post_title??'')!=='')$args['post_name']=sanitize_title((string)$post->post_title);
   $result=wp_update_post($args,true);
   if(is_wp_error($result))return $result;
   if(!$result)return new \WP_Error('update_failed',__('WordPress could not update the page status.', 'sidcraft-page-builder'),['status'=>500]);
   $changed=true;
   if(class_exists('\\SidcraftPageBuilder\\Compatibility\\Cache'))\SidcraftPageBuilder\Compatibility\Cache::purge($id);
  }
  $final=(string)get_post_status($id);
  return rest_ensure_response([
   'success'=>true,
   'status'=>$final,
   'changed'=>$changed,
   'permalink'=>function_exists('get_permalink')?esc_url_raw((string)get_permalink($id)):'',
   'previewUrl'=>function_exists('get_preview_post_link')?esc_url_raw((string)get_preview_post_link($id)):'',
   'title'=>function_exists('get_the_title')?(string)get_the_title($id):'',
  ]);
 }
 public static function get_revisions($req){
  $items=DocumentManager::revisions(absint($req['id']));
  $out=[];
  foreach((array)$items as $i=>$r){
   if(!is_array($r))continue;
   $out[]=[
    'id'=>absint($r['id']??0),
    'index'=>$i,
    'time'=>sanitize_text_field((string)($r['time']??'')),
    'author'=>sanitize_text_field((string)($r['author']??'')),
    'autosave'=>!empty($r['autosave']),
    'label'=>sanitize_text_field((string)($r['label']??'')),
   ];
  }
  return rest_ensure_response($out);
 }
 public static function get_revision($req){
  $id=absint($req['id']);$rev=absint($req['revision']);
  if(class_exists('\\SidcraftPageBuilder\\Document\\Revisions')){
   $preview=\SidcraftPageBuilder\Document\Revisions::preview($id,$rev);
   if(is_wp_error($preview))return $preview;
   return rest_ensure_response($preview);
  }
  $items=DocumentManager::revisions($id);
  if(!isset($items[$rev]))return new \WP_Error('not_found',__('Revision not found.', 'sidcraft-page-builder'),['status'=>404]);
  return rest_ensure_response(['id'=>$rev,'time'=>sanitize_text_field((string)($items[$rev]['time']??'')),'document'=>$items[$rev]['document']??DocumentManager::empty()]);
 }
 public static function restore_revision($req){$result=DocumentManager::restore_revision(absint($req['id']),absint($req['revision']));if(is_wp_error($result))return $result;return rest_ensure_response(['success'=>true,'document'=>$result]);}
 public static function templates($req=null){ if(class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates'))return \SidcraftPageBuilder\Templates\SavedTemplates::rest_list($req); $q=new \WP_Query(['post_type'=>'sidsyn_template','post_status'=>'publish','posts_per_page'=>100,'orderby'=>'title','order'=>'ASC','no_found_rows'=>true,'update_post_term_cache'=>false,'lazy_load_term_meta'=>false]);$out=[];foreach($q->posts as $p){$d=get_post_meta($p->ID,'_sidsyn_template_data',true);$doc=class_exists('\\SidcraftPageBuilder\\Utils\\JsonCache')?\SidcraftPageBuilder\Utils\JsonCache::decode($d,[]):(is_string($d)?json_decode($d,true):$d);$out[]=['id'=>$p->ID,'title'=>$p->post_title,'type'=>get_post_meta($p->ID,'_sidsyn_template_type',true)?:'page','document'=>$doc];}return rest_ensure_response($out);}
 public static function save_template($req){if(class_exists('\\SidcraftPageBuilder\\Templates\\SavedTemplates'))return \SidcraftPageBuilder\Templates\SavedTemplates::rest_save($req);$d=$req->get_json_params();$title=sanitize_text_field($d['title']??'Template');$doc=is_array($d['document']??null)?$d['document']:[];$type=sanitize_key($d['type']??'page');if(!$title)return new \WP_Error('invalid',__('Template title required', 'sidcraft-page-builder'),['status'=>400]);$id=wp_insert_post(['post_type'=>'sidsyn_template','post_status'=>'publish','post_title'=>$title]);if(is_wp_error($id))return $id;update_post_meta($id,'_sidsyn_template_data',wp_slash(wp_json_encode($doc)));update_post_meta($id,'_sidsyn_template_type',$type);return rest_ensure_response(['success'=>true,'id'=>$id]);}
 public static function get_template($req){$id=absint($req['id']);if(get_post_type($id)!=='sidsyn_template')return new \WP_Error('not_found',__('Template not found', 'sidcraft-page-builder'),['status'=>404]);$d=get_post_meta($id,'_sidsyn_template_data',true);$d=class_exists('\\SidcraftPageBuilder\\Utils\\JsonCache')?\SidcraftPageBuilder\Utils\JsonCache::decode($d,[]):(is_string($d)?json_decode($d,true):$d);return rest_ensure_response(is_array($d)?$d:['version'=>'1.0','root'=>[]]);}
 public static function save_class($req){$d=$req->get_json_params();$r=GlobalClasses::save($d['name']??'', $d['css']??'');return is_wp_error($r)?$r:rest_ensure_response($r);}
 public static function delete_class($req){GlobalClasses::delete($req['name']);return rest_ensure_response(['success'=>true]);}
 public static function save_component($req){$d=$req->get_json_params();$id=Components::save($d['title']??'Component',is_array($d['document']??null)?$d['document']:[],(array)($d['exposed']??[]),absint($d['id']??0),$d['key']??'');return is_wp_error($id)?$id:rest_ensure_response(['success'=>true,'id'=>$id]);}
 public static function export_kit($req){
  $d=is_array($req->get_json_params())?$req->get_json_params():[];
  $ids=$req->get_param('content_ids');
  if(is_string($ids))$ids=preg_split('/[,\s]+/',$ids);
  if(!$ids)$ids=$d['content_ids']??[];
  $built=\SidcraftPageBuilder\Design\Kit::publish_export([
   'include_templates'=>$req->get_param('include_templates')!=='0'&&($d['include_templates']??true),
   'include_content'=>(bool)($req->get_param('include_content')||($d['include_content']??false)||$ids),
   'include_media'=>$req->get_param('include_media')!=='0'&&($d['include_media']??true),
   'content_ids'=>$ids,
  ]);
  return is_wp_error($built)?$built:rest_ensure_response($built);
 }
 public static function import_kit($req){
  $mode=sanitize_key((string)($req->get_param('mode')?:'merge'));
  $include_content=$req->get_param('include_content');
  $include_content=$include_content===null?true:!in_array((string)$include_content,['0','false',''],true);
  $files=$req->get_file_params();
  $file=$files['file']??($files['kit']??null);
  if(is_array($file)&&!empty($file['tmp_name'])){
   $r=\SidcraftPageBuilder\Design\Kit::import($file['tmp_name'],$mode,['include_content'=>$include_content]);
   return is_wp_error($r)?$r:rest_ensure_response($r);
  }
  $d=$req->get_json_params();
  if(!is_array($d))return new \WP_Error('invalid_kit',__('Upload a kit ZIP or send kit JSON.', 'sidcraft-page-builder'),['status'=>400]);
  $mode=sanitize_key((string)($d['mode']??$mode));
  $r=\SidcraftPageBuilder\Design\Kit::import($d,$mode,['include_content'=>array_key_exists('include_content',$d)?!empty($d['include_content']):$include_content]);
  return is_wp_error($r)?$r:rest_ensure_response($r);
 }
 public static function download_kit($req){
  $data=\SidcraftPageBuilder\Design\Kit::consume_export($req['token']??'');
  if(!$data)return new \WP_Error('not_found',__('That kit download has expired.', 'sidcraft-page-builder'),['status'=>404]);
  $token=preg_replace('/[^a-zA-Z0-9]/','',(string)($req['token']??''));
  if($token)delete_transient(\SidcraftPageBuilder\Design\Kit::TRANSIENT.$token);
  \SidcraftPageBuilder\Design\Kit::stream_file($data['path'],$data['filename']??'sidcraft-page-builder-kit.zip');
  if(!empty($data['path'])&&file_exists($data['path']))wp_delete_file($data['path']);
  exit;
 }
}
