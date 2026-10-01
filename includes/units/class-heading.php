<?php
namespace SidcraftPageBuilder\Units; if(!defined('ABSPATH')) exit;
/** Heading: h1-h6 title with size presets, typography, hover colour/shadow and an optional link. */
class Heading extends Unit {
 public function type(){return 'heading';} public function title(){return __('Heading', 'sidcraft-page-builder');} public function icon(){return 'H';} public function category(){return 'basic';}
 public function keywords(){return ['heading','title','h1','h2','h3','headline'];}
 public static function presets(){return ['default','small','medium','large','xl','xxl'];}
 public function defaults(){return ['text'=>__('Your Heading', 'sidcraft-page-builder'),'tag'=>'h2','size_preset'=>'default','size'=>36,'weight'=>'600','color'=>'#222222','hover_color'=>'','font_family'=>'','font_style'=>'','text_transform'=>'','text_decoration'=>'','line_height'=>'1.2','letter_spacing'=>0,'align'=>'left','link'=>'','link_target'=>'_self','text_shadow'=>'','hover_text_shadow'=>'','mix_blend_mode'=>''];}
 public function controls(){
  $title=__('Title', 'sidcraft-page-builder'); $typo=__('Typography', 'sidcraft-page-builder'); $hover=__('Hover', 'sidcraft-page-builder');
  $h='{{WRAPPER}} .lb-heading';
  return [
   'text'=>$this->ctrl('wysiwyg',__('Title', 'sidcraft-page-builder'),'content',$title,['dynamic'=>true]),
   'tag'=>$this->ctrl('select',__('HTML Tag', 'sidcraft-page-builder'),'content',$title,['options'=>self::opt_title_tags()]),
   'link'=>$this->ctrl('url',__('Link', 'sidcraft-page-builder'),'content',$title,['dynamic'=>true]),
   'link_target'=>$this->ctrl('select',__('Link Target', 'sidcraft-page-builder'),'content',$title,['options'=>self::opt_target(),'condition'=>['link!'=>'']]),
   'size_preset'=>$this->ctrl('select',__('Size', 'sidcraft-page-builder'),'content',$title,['options'=>['default'=>__('Default', 'sidcraft-page-builder'),'small'=>__('Small', 'sidcraft-page-builder'),'medium'=>__('Medium', 'sidcraft-page-builder'),'large'=>__('Large', 'sidcraft-page-builder'),'xl'=>__('XL', 'sidcraft-page-builder'),'xxl'=>__('XXL', 'sidcraft-page-builder')]]),
   'align'=>$this->ctrl('choose',__('Alignment', 'sidcraft-page-builder'),'style',$typo,['responsive'=>true,'options'=>self::opt_align(),'selectors'=>['{{WRAPPER}}'=>'text-align: {{VALUE}};']]),
   'color'=>$this->ctrl('color',__('Text Color', 'sidcraft-page-builder'),'style',$typo,['selectors'=>[$h=>'color: {{VALUE}};',$h.' .lb-heading-link'=>'color: {{VALUE}};']]),
   'font_family'=>$this->ctrl('font',__('Font Family', 'sidcraft-page-builder'),'style',$typo,['selectors'=>[$h=>'font-family: {{VALUE}};']]),
   'size'=>$this->ctrl('slider',__('Size', 'sidcraft-page-builder'),'style',$typo,['responsive'=>true,'units'=>['px','em','rem'],'range'=>['min'=>8,'max'=>200],'condition'=>['size_preset'=>'default'],'selectors'=>[$h=>'font-size: {{SIZE}}{{UNIT}};']]),
   'weight'=>$this->ctrl('select',__('Weight', 'sidcraft-page-builder'),'style',$typo,['options'=>self::opt_weight(),'selectors'=>[$h=>'font-weight: {{VALUE}};']]),
   'font_style'=>$this->ctrl('select',__('Style', 'sidcraft-page-builder'),'style',$typo,['options'=>[''=>__('Default', 'sidcraft-page-builder'),'normal'=>__('Normal', 'sidcraft-page-builder'),'italic'=>__('Italic', 'sidcraft-page-builder'),'oblique'=>__('Oblique', 'sidcraft-page-builder')],'selectors'=>[$h=>'font-style: {{VALUE}};']]),
   'text_transform'=>$this->ctrl('select',__('Transform', 'sidcraft-page-builder'),'style',$typo,['options'=>[''=>__('Default', 'sidcraft-page-builder'),'none'=>__('None', 'sidcraft-page-builder'),'uppercase'=>__('Uppercase', 'sidcraft-page-builder'),'lowercase'=>__('Lowercase', 'sidcraft-page-builder'),'capitalize'=>__('Capitalize', 'sidcraft-page-builder')],'selectors'=>[$h=>'text-transform: {{VALUE}};']]),
   'text_decoration'=>$this->ctrl('select',__('Decoration', 'sidcraft-page-builder'),'style',$typo,['options'=>[''=>__('Default', 'sidcraft-page-builder'),'none'=>__('None', 'sidcraft-page-builder'),'underline'=>__('Underline', 'sidcraft-page-builder'),'overline'=>__('Overline', 'sidcraft-page-builder'),'line-through'=>__('Line Through', 'sidcraft-page-builder')],'selectors'=>[$h=>'text-decoration: {{VALUE}};']]),
   'line_height'=>$this->ctrl('slider',__('Line Height', 'sidcraft-page-builder'),'style',$typo,['responsive'=>true,'units'=>[],'range'=>['min'=>0.6,'max'=>3,'step'=>0.05],'selectors'=>[$h=>'line-height: {{SIZE}};']]),
   'letter_spacing'=>$this->ctrl('slider',__('Letter Spacing', 'sidcraft-page-builder'),'style',$typo,['responsive'=>true,'units'=>['px','em'],'range'=>['min'=>-5,'max'=>20,'step'=>0.1],'selectors'=>[$h=>'letter-spacing: {{SIZE}}{{UNIT}};']]),
   'text_shadow'=>$this->ctrl('text_shadow',__('Text Shadow', 'sidcraft-page-builder'),'style',$typo,['selectors'=>[$h=>'text-shadow: {{VALUE}};']]),
   'mix_blend_mode'=>$this->ctrl('select',__('Blend Mode', 'sidcraft-page-builder'),'style',$typo,['options'=>[''=>__('Normal', 'sidcraft-page-builder'),'multiply'=>__('Multiply', 'sidcraft-page-builder'),'screen'=>__('Screen', 'sidcraft-page-builder'),'overlay'=>__('Overlay', 'sidcraft-page-builder'),'darken'=>__('Darken', 'sidcraft-page-builder'),'lighten'=>__('Lighten', 'sidcraft-page-builder'),'color-dodge'=>__('Color Dodge', 'sidcraft-page-builder'),'color-burn'=>__('Color Burn', 'sidcraft-page-builder'),'difference'=>__('Difference', 'sidcraft-page-builder')],'selectors'=>[$h=>'mix-blend-mode: {{VALUE}};']]),
   'hover_color'=>$this->ctrl('color',__('Text Color', 'sidcraft-page-builder'),'style',$hover,['selectors'=>['{{WRAPPER}}'=>'--lb-heading-hover: {{VALUE}};',$h.':hover'=>'color: {{VALUE}};',$h.':hover .lb-heading-link'=>'color: {{VALUE}};']]),
   'hover_text_shadow'=>$this->ctrl('text_shadow',__('Text Shadow', 'sidcraft-page-builder'),'style',$hover,['selectors'=>[$h.':hover'=>'text-shadow: {{VALUE}};']]),
  ];
 }
 public function render($s,$children=''){
  $tag=$this->tag($s['tag']??'h2',$this->title_tags(),'h2');
  $preset_raw=$s['size_preset']??'default';
  $preset=in_array($preset_raw,self::presets(),true)?$preset_raw:'default';
  $text=wp_kses_post($s['text']??'');
  if(!empty($s['link'])){$t=($s['link_target']??'_self')==='_blank'?' target="_blank" rel="noopener"':'';$text='<a class="lb-heading-link" href="'.esc_attr(self::link_href($s['link'])).'"'.$t.'>'.$text.'</a>';}
  return '<'.$tag.' class="'.$this->cls($s).' lb-heading lb-heading-size-'.$preset.'" data-inline="text">'.$text.'</'.$tag.'>';
 }
}
