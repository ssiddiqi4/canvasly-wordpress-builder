<?php
namespace SidcraftSyntex\Units; if(!defined('ABSPATH')) exit;
class GoogleMaps extends Unit { public function type(){return 'google_maps';} public function title(){return __('Google Maps', 'sidcraft-syntex');} public function icon(){return "\u{2316}";} public function defaults(){return ['address'=>'','zoom'=>14,'height'=>320];} public function controls(){return ['address'=>'text','zoom'=>'number','height'=>'number'];} public function render($s,$children=''){
  $q=rawurlencode($s['address']??'');
  if(!$q)return '<div class="lb-embed-placeholder">'.esc_html__('Add a map address', 'sidcraft-syntex').'</div>';
  $zoom=absint($s['zoom']??14);
  $src='https://www.google.com/maps?q='.$q.'&output=embed&z='.$zoom;
  if(class_exists('\\SidcraftSyntex\\Settings\\AdminSettings')&&\SidcraftSyntex\Settings\AdminSettings::maps_embed_enabled()){
   $src='https://www.google.com/maps/embed/v1/place?key='.rawurlencode(\SidcraftSyntex\Settings\AdminSettings::google_maps_api_key()).'&q='.$q.'&zoom='.$zoom;
  }
  return '<iframe class="lb-map" title="'.esc_attr__('Map', 'sidcraft-syntex').'" loading="lazy" height="'.absint($s['height']??320).'" src="'.$src.'" style="width:100%;border:0"></iframe>';
 }}
