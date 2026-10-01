<?php
namespace SidcraftPageBuilder\Units; if(!defined('ABSPATH')) exit;
/**
 * Text Path: words drawn along a wave, arc, circle or straight line.
 * Style covers the same typography, colour and stroke choices a visual builder puts on Style.
 */
class TextPath extends Unit {
 public function type(){return 'text_path';}
 public function title(){return __('Text Path', 'sidcraft-page-builder');}
 public function icon(){return "\u{25CC}";}
 public function keywords(){return ['text path','svg','curve','wave','marquee'];}
 public function defaults(){
  return [
   'text'=>'Sidcraft Page Builder','link'=>'','link_target'=>'_self','path'=>'wave','show_path'=>false,'speed'=>20,
   'align'=>'center','color'=>'#222222','hover_color'=>'','font_family'=>'','font_size'=>'42',
   'font_weight'=>'600','font_style'=>'','text_transform'=>'','text_decoration'=>'','line_height'=>'',
   'letter_spacing'=>'','word_spacing'=>'','stroke_width'=>'','stroke_color'=>'#222222',
   'path_color'=>'#c5cad1','path_width'=>1,'size'=>160,
  ];
 }
 public function controls(){
  $content=__('Text Path', 'sidcraft-page-builder');
  $text=__('Text', 'sidcraft-page-builder');
  $path=__('Path', 'sidcraft-page-builder');
  $svg='{{WRAPPER}} .lb-text-path';
  $label=$svg.' text';
  return [
   'text'=>$this->ctrl('textarea',__('Text', 'sidcraft-page-builder'),'content',$content,['dynamic'=>true]),
   'link'=>$this->ctrl('url',__('Link', 'sidcraft-page-builder'),'content',$content,['dynamic'=>true]),
   'link_target'=>$this->ctrl('select',__('Link Target', 'sidcraft-page-builder'),'content',$content,['options'=>self::opt_target(),'condition'=>['link!'=>'']]),
   'path'=>$this->ctrl('select',__('Path Type', 'sidcraft-page-builder'),'content',$content,['options'=>['wave'=>__('Wave', 'sidcraft-page-builder'),'arc'=>__('Arc', 'sidcraft-page-builder'),'circle'=>__('Circle', 'sidcraft-page-builder'),'line'=>__('Line', 'sidcraft-page-builder')]]),
   'show_path'=>$this->ctrl('switch',__('Show Path', 'sidcraft-page-builder'),'content',$content),
   'speed'=>$this->ctrl('slider',__('Animation Speed', 'sidcraft-page-builder'),'content',$content,['units'=>[],'range'=>['min'=>5,'max'=>60,'step'=>1],'default'=>20,'selectors'=>[$svg=>'--lb-speed: {{SIZE}}s;']]),
   'align'=>$this->ctrl('choose',__('Alignment', 'sidcraft-page-builder'),'style',$text,['options'=>self::opt_lcr(),'selectors'=>[$svg=>'text-align: {{VALUE}};']]),
   'color'=>$this->ctrl('color',__('Text Color', 'sidcraft-page-builder'),'style',$text,['selectors'=>[$label=>'fill: {{VALUE}}; color: {{VALUE}};']]),
   'hover_color'=>$this->ctrl('color',__('Hover Color', 'sidcraft-page-builder'),'style',$text,['selectors'=>[$svg.':hover text'=>'fill: {{VALUE}}; color: {{VALUE}};']]),
   'font_family'=>$this->ctrl('font',__('Font Family', 'sidcraft-page-builder'),'style',$text,['selectors'=>[$label=>'font-family: {{VALUE}};']]),
   'font_size'=>$this->ctrl('slider',__('Size', 'sidcraft-page-builder'),'style',$text,['responsive'=>true,'units'=>['px','em','rem'],'range'=>['min'=>8,'max'=>200],'selectors'=>[$label=>'font-size: {{SIZE}}{{UNIT}};']]),
   'font_weight'=>$this->ctrl('select',__('Weight', 'sidcraft-page-builder'),'style',$text,['options'=>self::opt_weight(),'selectors'=>[$label=>'font-weight: {{VALUE}};']]),
   'font_style'=>$this->ctrl('select',__('Style', 'sidcraft-page-builder'),'style',$text,['options'=>[''=>__('Default', 'sidcraft-page-builder'),'normal'=>__('Normal', 'sidcraft-page-builder'),'italic'=>__('Italic', 'sidcraft-page-builder'),'oblique'=>__('Oblique', 'sidcraft-page-builder')],'selectors'=>[$label=>'font-style: {{VALUE}};']]),
   'text_transform'=>$this->ctrl('select',__('Transform', 'sidcraft-page-builder'),'style',$text,['options'=>[''=>__('Default', 'sidcraft-page-builder'),'none'=>__('None', 'sidcraft-page-builder'),'uppercase'=>__('Uppercase', 'sidcraft-page-builder'),'lowercase'=>__('Lowercase', 'sidcraft-page-builder'),'capitalize'=>__('Capitalize', 'sidcraft-page-builder')],'selectors'=>[$label=>'text-transform: {{VALUE}};']]),
   'text_decoration'=>$this->ctrl('select',__('Decoration', 'sidcraft-page-builder'),'style',$text,['options'=>[''=>__('Default', 'sidcraft-page-builder'),'none'=>__('None', 'sidcraft-page-builder'),'underline'=>__('Underline', 'sidcraft-page-builder'),'overline'=>__('Overline', 'sidcraft-page-builder'),'line-through'=>__('Line Through', 'sidcraft-page-builder')],'selectors'=>[$label=>'text-decoration: {{VALUE}};']]),
   'line_height'=>$this->ctrl('slider',__('Line Height', 'sidcraft-page-builder'),'style',$text,['responsive'=>true,'units'=>[],'range'=>['min'=>0.6,'max'=>3,'step'=>0.05],'selectors'=>[$label=>'line-height: {{SIZE}};']]),
   'letter_spacing'=>$this->ctrl('slider',__('Letter Spacing', 'sidcraft-page-builder'),'style',$text,['responsive'=>true,'units'=>['px','em'],'range'=>['min'=>-5,'max'=>40,'step'=>0.1],'selectors'=>[$label=>'letter-spacing: {{SIZE}}{{UNIT}};']]),
   'word_spacing'=>$this->ctrl('slider',__('Word Spacing', 'sidcraft-page-builder'),'style',$text,['units'=>['px','em'],'range'=>['min'=>-10,'max'=>80],'selectors'=>[$label=>'word-spacing: {{SIZE}}{{UNIT}};']]),
   'stroke_width'=>$this->ctrl('slider',__('Stroke Width', 'sidcraft-page-builder'),'style',__('Stroke', 'sidcraft-page-builder'),['units'=>['px'],'range'=>['min'=>0,'max'=>20],'selectors'=>[$label=>'-webkit-text-stroke-width: {{SIZE}}{{UNIT}}; stroke-width: {{SIZE}}{{UNIT}};']]),
   'stroke_color'=>$this->ctrl('color',__('Stroke Color', 'sidcraft-page-builder'),'style',__('Stroke', 'sidcraft-page-builder'),['selectors'=>[$label=>'-webkit-text-stroke-color: {{VALUE}}; stroke: {{VALUE}};']]),
   'size'=>$this->ctrl('slider',__('Height', 'sidcraft-page-builder'),'style',$path,['units'=>['px'],'range'=>['min'=>40,'max'=>400],'selectors'=>[$svg.' svg'=>'height: {{SIZE}}{{UNIT}};']]),
   'path_color'=>$this->ctrl('color',__('Path Color', 'sidcraft-page-builder'),'style',$path,['condition'=>['show_path'=>'1'],'selectors'=>[$svg.' .lb-text-path-guide'=>'stroke: {{VALUE}};']]),
   'path_width'=>$this->ctrl('slider',__('Path Width', 'sidcraft-page-builder'),'style',$path,['units'=>['px'],'range'=>['min'=>0,'max'=>20],'condition'=>['show_path'=>'1'],'selectors'=>[$svg.' .lb-text-path-guide'=>'stroke-width: {{SIZE}}{{UNIT}};']]),
  ];
 }
 public function render($s,$children=''){
  unset($children);
  $text=esc_html($s['text']??'Sidcraft Page Builder');
  $kind=in_array($s['path']??'wave',['wave','arc','circle','line'],true)?$s['path']:'wave';
  $paths=['wave'=>'M 20 80 Q 140 16 260 80 T 500 80 T 740 80 T 980 80','arc'=>'M 36 112 Q 500 8 964 112','circle'=>'M 500 46 A 150 32 0 1 1 499 46','line'=>'M 20 96 H 980'];
  $id=function_exists('wp_unique_id')?wp_unique_id('lb-tp-'):'lb-tp-'.substr(md5(uniqid('',true)),0,8);
  $speed=max(5,absint($s['speed']??20));
  $guide=!empty($s['show_path'])?'':' style="stroke:none"';
  $svg='<svg viewBox="0 0 1000 160" overflow="visible" role="img" aria-label="'.$text.'"><path id="'.esc_attr($id).'" class="lb-text-path-guide" d="'.esc_attr($paths[$kind]).'" fill="none"'.$guide.'></path><text visibility="hidden"><textPath href="#'.esc_attr($id).'" startOffset="0">'.$text.'</textPath></text></svg>';
  if(!empty($s['link'])){
   $t=($s['link_target']??'_self')==='_blank'?' target="_blank" rel="noopener"':'';
   $svg='<a class="lb-text-path-link" href="'.esc_attr(self::link_href($s['link'])).'"'.$t.'>'.$svg.'</a>';
  }
  return '<div class="lb-text-path lb-text-path-'.$kind.'" data-lb-speed="'.$speed.'" style="--lb-speed:'.$speed.'s">'.$svg.'</div>';
 }
}
