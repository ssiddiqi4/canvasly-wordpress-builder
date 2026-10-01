<?php
namespace SidcraftSyntex\Units; if(!defined('ABSPATH')) exit;
/** Heading: h1-h6 title with size presets, typography, hover colour/shadow and an optional link. */
class Heading extends Unit {
 public function type(){return 'heading';} public function title(){return __('Heading', 'sidcraft-syntex');} public function icon(){return 'H';} public function category(){return 'basic';}
 public function keywords(){return ['heading','title','h1','h2','h3','headline'];}
 public static function presets(){return ['default','small','medium','large','xl','xxl'];}
 public function defaults(){return ['text'=>__('Your Heading', 'sidcraft-syntex'),'tag'=>'h2','size_preset'=>'default','size'=>36,'weight'=>'600','color'=>'#222222','hover_color'=>'','font_family'=>'','font_style'=>'','text_transform'=>'','text_decoration'=>'','line_height'=>'1.2','letter_spacing'=>0,'align'=>'left','link'=>'','link_target'=>'_self','text_shadow'=>'','hover_text_shadow'=>'','mix_blend_mode'=>''];}
 public function controls(){
  $title=__('Title', 'sidcraft-syntex'); $typo=__('Typography', 'sidcraft-syntex'); $hover=__('Hover', 'sidcraft-syntex');
  $h='{{WRAPPER}} .lb-heading';
  return [
   'text'=>$this->ctrl('wysiwyg',__('Title', 'sidcraft-syntex'),'content',$title,['dynamic'=>true]),
   'tag'=>$this->ctrl('select',__('HTML Tag', 'sidcraft-syntex'),'content',$title,['options'=>self::opt_title_tags()]),
   'link'=>$this->ctrl('url',__('Link', 'sidcraft-syntex'),'content',$title,['dynamic'=>true]),
   'link_target'=>$this->ctrl('select',__('Link Target', 'sidcraft-syntex'),'content',$title,['options'=>self::opt_target(),'condition'=>['link!'=>'']]),
   'size_preset'=>$this->ctrl('select',__('Size', 'sidcraft-syntex'),'content',$title,['options'=>['default'=>__('Default', 'sidcraft-syntex'),'small'=>__('Small', 'sidcraft-syntex'),'medium'=>__('Medium', 'sidcraft-syntex'),'large'=>__('Large', 'sidcraft-syntex'),'xl'=>__('XL', 'sidcraft-syntex'),'xxl'=>__('XXL', 'sidcraft-syntex')]]),
   'align'=>$this->ctrl('choose',__('Alignment', 'sidcraft-syntex'),'style',$typo,['responsive'=>true,'options'=>self::opt_align(),'selectors'=>['{{WRAPPER}}'=>'text-align: {{VALUE}};']]),
   'color'=>$this->ctrl('color',__('Text Color', 'sidcraft-syntex'),'style',$typo,['selectors'=>[$h=>'color: {{VALUE}};',$h.' .lb-heading-link'=>'color: {{VALUE}};']]),
   'font_family'=>$this->ctrl('font',__('Font Family', 'sidcraft-syntex'),'style',$typo,['selectors'=>[$h=>'font-family: {{VALUE}};']]),
   'size'=>$this->ctrl('slider',__('Size', 'sidcraft-syntex'),'style',$typo,['responsive'=>true,'units'=>['px','em','rem'],'range'=>['min'=>8,'max'=>200],'condition'=>['size_preset'=>'default'],'selectors'=>[$h=>'font-size: {{SIZE}}{{UNIT}};']]),
   'weight'=>$this->ctrl('select',__('Weight', 'sidcraft-syntex'),'style',$typo,['options'=>self::opt_weight(),'selectors'=>[$h=>'font-weight: {{VALUE}};']]),
   'font_style'=>$this->ctrl('select',__('Style', 'sidcraft-syntex'),'style',$typo,['options'=>[''=>__('Default', 'sidcraft-syntex'),'normal'=>__('Normal', 'sidcraft-syntex'),'italic'=>__('Italic', 'sidcraft-syntex'),'oblique'=>__('Oblique', 'sidcraft-syntex')],'selectors'=>[$h=>'font-style: {{VALUE}};']]),
   'text_transform'=>$this->ctrl('select',__('Transform', 'sidcraft-syntex'),'style',$typo,['options'=>[''=>__('Default', 'sidcraft-syntex'),'none'=>__('None', 'sidcraft-syntex'),'uppercase'=>__('Uppercase', 'sidcraft-syntex'),'lowercase'=>__('Lowercase', 'sidcraft-syntex'),'capitalize'=>__('Capitalize', 'sidcraft-syntex')],'selectors'=>[$h=>'text-transform: {{VALUE}};']]),
   'text_decoration'=>$this->ctrl('select',__('Decoration', 'sidcraft-syntex'),'style',$typo,['options'=>[''=>__('Default', 'sidcraft-syntex'),'none'=>__('None', 'sidcraft-syntex'),'underline'=>__('Underline', 'sidcraft-syntex'),'overline'=>__('Overline', 'sidcraft-syntex'),'line-through'=>__('Line Through', 'sidcraft-syntex')],'selectors'=>[$h=>'text-decoration: {{VALUE}};']]),
   'line_height'=>$this->ctrl('slider',__('Line Height', 'sidcraft-syntex'),'style',$typo,['responsive'=>true,'units'=>[],'range'=>['min'=>0.6,'max'=>3,'step'=>0.05],'selectors'=>[$h=>'line-height: {{SIZE}};']]),
   'letter_spacing'=>$this->ctrl('slider',__('Letter Spacing', 'sidcraft-syntex'),'style',$typo,['responsive'=>true,'units'=>['px','em'],'range'=>['min'=>-5,'max'=>20,'step'=>0.1],'selectors'=>[$h=>'letter-spacing: {{SIZE}}{{UNIT}};']]),
   'text_shadow'=>$this->ctrl('text_shadow',__('Text Shadow', 'sidcraft-syntex'),'style',$typo,['selectors'=>[$h=>'text-shadow: {{VALUE}};']]),
   'mix_blend_mode'=>$this->ctrl('select',__('Blend Mode', 'sidcraft-syntex'),'style',$typo,['options'=>[''=>__('Normal', 'sidcraft-syntex'),'multiply'=>__('Multiply', 'sidcraft-syntex'),'screen'=>__('Screen', 'sidcraft-syntex'),'overlay'=>__('Overlay', 'sidcraft-syntex'),'darken'=>__('Darken', 'sidcraft-syntex'),'lighten'=>__('Lighten', 'sidcraft-syntex'),'color-dodge'=>__('Color Dodge', 'sidcraft-syntex'),'color-burn'=>__('Color Burn', 'sidcraft-syntex'),'difference'=>__('Difference', 'sidcraft-syntex')],'selectors'=>[$h=>'mix-blend-mode: {{VALUE}};']]),
   'hover_color'=>$this->ctrl('color',__('Text Color', 'sidcraft-syntex'),'style',$hover,['selectors'=>['{{WRAPPER}}'=>'--lb-heading-hover: {{VALUE}};',$h.':hover'=>'color: {{VALUE}};',$h.':hover .lb-heading-link'=>'color: {{VALUE}};']]),
   'hover_text_shadow'=>$this->ctrl('text_shadow',__('Text Shadow', 'sidcraft-syntex'),'style',$hover,['selectors'=>[$h.':hover'=>'text-shadow: {{VALUE}};']]),
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
