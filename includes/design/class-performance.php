<?php
namespace SidcraftPageBuilder\Design;
if(!defined('ABSPATH')) exit;
class Performance {
 const MANIFEST='sidcraft_page_builder_asset_manifest';
 public static function manifest(){return ['version'=>SIDCRAFT_PAGE_BUILDER_VERSION,'editor'=>SIDCRAFT_PAGE_BUILDER_URL.'assets/js/editor.js','frontend'=>SIDCRAFT_PAGE_BUILDER_URL.'assets/js/frontend.js','frontend_css'=>SIDCRAFT_PAGE_BUILDER_URL.'assets/css/frontend.css'];}
 public static function invalidate($post_id){
  delete_post_meta(absint($post_id),'_sidsyn_css_cache');
  update_post_meta(absint($post_id),'_sidsyn_asset_version',SIDCRAFT_PAGE_BUILDER_VERSION.'-'.time());
  if(class_exists(CssPrint::class))CssPrint::invalidate_post($post_id);
  if(class_exists(Optimize::class))Optimize::invalidate_post($post_id);
 }
 public static function version($post_id){return get_post_meta(absint($post_id),'_sidsyn_asset_version',true)?:SIDCRAFT_PAGE_BUILDER_VERSION;}
 public static function minify_css($css){$css=preg_replace('/\/\*.*?\*\//s','',$css);$css=preg_replace('/\s+/',' ',$css);return trim($css);}
}
