<?php
namespace SidcraftPageBuilder\Units; if(!defined('ABSPATH')) exit;
/** Sidebar: renders any registered theme widget area, chosen from a list of the site's sidebars. */
class Sidebar extends Unit {
 public function type(){return 'sidebar';} public function title(){return __('Sidebar', 'sidcraft-page-builder');} public function icon(){return "\u{25A4}";} public function category(){return 'advanced';}
 public function keywords(){return ['sidebar','widget area','widgets','theme'];}
 public function defaults(){return ['sidebar'=>''];}
 public function controls(){return ['sidebar'=>'select'];}
 public function render($s,$children=''){
  $id=sanitize_key($s['sidebar']??''); if(!$id||!is_active_sidebar($id))return '<div class="'.$this->cls($s).' lb-embed-placeholder">'.esc_html__('Choose an active sidebar', 'sidcraft-page-builder').'</div>';
  ob_start(); dynamic_sidebar($id); $html=ob_get_clean();
  return '<aside class="'.$this->cls($s).' lb-sidebar">'.\SidcraftPageBuilder\Rendering\OutputEscape::raw($html).'</aside>';
 }
}
