<?php
namespace SidcraftSyntex\Units; if(!defined('ABSPATH')) exit;
/**
 * Nested Accordion: each repeater item is a slot that can hold any child unit.
 * Only one panel is open at a time. The text-only Accordion widget is kept for legacy documents.
 */
class NestedAccordion extends Unit {
 public function type(){return 'nested_accordion';}
 public function title(){return __('Nested Accordion', 'sidcraft-syntex');}
 public function icon(){return "\u{2630}";}
 public function category(){return 'basic';}
 public function keywords(){return ['accordion','nested','collapse','faq','panel','slot'];}
 public function scripts($s=[]){return $this->frontend_scripts();}
 public function supports_children(){return true;}
 public function slot_source(){return 'items';}
 protected function single_open(){return true;}
 protected function root_class(){return 'lb-accordion lb-nested-accordion';}
 public function defaults(){return [
  'items'=>[
   ['_id'=>'acc1','title'=>'Accordion Item 1'],
   ['_id'=>'acc2','title'=>'Accordion Item 2'],
  ],
  'title_tag'=>'div','icon'=>'chevron-down','active_icon'=>'chevron-up','icon_position'=>'right','first_open'=>true,'faq_schema'=>false,
  'title_color'=>'','active_color'=>'','title_background'=>'','content_color'=>'','content_background'=>'','icon_color'=>'','icon_active_color'=>'','border_color'=>'#d8dde3','border_width'=>1,'title_padding'=>'','content_padding'=>'','icon_space'=>10,'space_between'=>0,
 ];}
 public function controls(){
  $acc=__('Accordion', 'sidcraft-syntex'); $title=__('Title', 'sidcraft-syntex'); $content=__('Content', 'sidcraft-syntex'); $icon=__('Icon', 'sidcraft-syntex'); $border=__('Border', 'sidcraft-syntex');
  return [
   'items'=>$this->ctrl('repeater',__('Items', 'sidcraft-syntex'),'content',$acc,[
    'title_field'=>'{{title}}','prevent_empty'=>true,
    'fields'=>[
     'title'=>$this->field('text',__('Title', 'sidcraft-syntex')),
    ],
   ]),
   'title_tag'=>$this->ctrl('select',__('Title HTML Tag', 'sidcraft-syntex'),'content',$acc,['options'=>self::opt_title_tags()]),
   'icon'=>$this->ctrl('icon',__('Icon', 'sidcraft-syntex'),'content',$acc),
   'active_icon'=>$this->ctrl('icon',__('Active Icon', 'sidcraft-syntex'),'content',$acc),
   'icon_position'=>$this->ctrl('select',__('Icon Position', 'sidcraft-syntex'),'content',$acc,['options'=>['left'=>__('Left', 'sidcraft-syntex'),'right'=>__('Right', 'sidcraft-syntex')]]),
   'first_open'=>$this->ctrl('switch',__('First Item Opened', 'sidcraft-syntex'),'content',$acc),
   'faq_schema'=>$this->ctrl('switch',__('FAQ Schema', 'sidcraft-syntex'),'content',$acc),
   'title_color'=>$this->ctrl('color',__('Color', 'sidcraft-syntex'),'style',$title),
   'active_color'=>$this->ctrl('color',__('Active Color', 'sidcraft-syntex'),'style',$title),
   'title_background'=>$this->ctrl('color',__('Background', 'sidcraft-syntex'),'style',$title),
   'title_padding'=>$this->ctrl('text',__('Padding', 'sidcraft-syntex'),'style',$title),
   'content_color'=>$this->ctrl('color',__('Color', 'sidcraft-syntex'),'style',$content),
   'content_background'=>$this->ctrl('color',__('Background', 'sidcraft-syntex'),'style',$content),
   'content_padding'=>$this->ctrl('text',__('Padding', 'sidcraft-syntex'),'style',$content),
   'icon_color'=>$this->ctrl('color',__('Color', 'sidcraft-syntex'),'style',$icon),
   'icon_active_color'=>$this->ctrl('color',__('Active Color', 'sidcraft-syntex'),'style',$icon),
   'icon_space'=>$this->ctrl('number',__('Spacing', 'sidcraft-syntex'),'style',$icon),
   'border_color'=>$this->ctrl('color',__('Color', 'sidcraft-syntex'),'style',$border),
   'border_width'=>$this->ctrl('number',__('Width', 'sidcraft-syntex'),'style',$border),
   'space_between'=>$this->ctrl('number',__('Space Between', 'sidcraft-syntex'),'style',$border),
  ];
 }
 public function render($s,$children=''){
  $slots=$this->slots($s);
  $html=is_array($children)?$children:[];
  $tag=$this->tag($s['title_tag']??'div',$this->title_tags(),'div');
  $uid='lb'.substr(md5(wp_json_encode($slots).(string)($s['css_id']??'').wp_rand()),0,8);
  $vars=$this->style_attr([
   '--lb-acc-title-color'=>$s['title_color']??'','--lb-acc-active-color'=>$s['active_color']??'','--lb-acc-title-bg'=>$s['title_background']??'',
   '--lb-acc-content-color'=>$s['content_color']??'','--lb-acc-content-bg'=>$s['content_background']??'','--lb-acc-icon-color'=>$s['icon_color']??'','--lb-acc-icon-active-color'=>$s['icon_active_color']??'',
   '--lb-acc-border-color'=>$s['border_color']??'','--lb-acc-border-width'=>$this->unit($s['border_width']??''),'--lb-acc-title-padding'=>sanitize_text_field((string)($s['title_padding']??'')),'--lb-acc-content-padding'=>sanitize_text_field((string)($s['content_padding']??'')),
   '--lb-acc-icon-space'=>$this->unit($s['icon_space']??''),'--lb-acc-gap'=>$this->unit($s['space_between']??''),
  ]);
  $pos=($s['icon_position']??'right')==='left'?'left':'right';
  $out='<div class="'.$this->cls($s).' '.$this->root_class().' lb-collapse lb-collapse-icon-'.$pos.'" data-lb-collapse="'.($this->single_open()?'single':'multi').'"'.$vars.'>';
  $faq=[];
  foreach($slots as $i=>$slot){
   $title=$slot['title']!==''?$slot['title']:sprintf(/* translators: %d panel index */__('Item %d', 'sidcraft-syntex'),$i+1);
   $body=$html[$slot['id']]??'';
   $open=$i===0&&!empty($s['first_open']);
   $tid=$uid.'-t'.$i; $cid=$uid.'-c'.$i;
   $icon='<span class="lb-collapse-icon" aria-hidden="true"><span class="lb-collapse-icon-closed">'.\SidcraftSyntex\Utils\Icons::svg($s['icon']??'chevron-down').'</span><span class="lb-collapse-icon-opened">'.\SidcraftSyntex\Utils\Icons::svg($s['active_icon']??'chevron-up').'</span></span>';
   $out.='<div class="lb-collapse-item'.($open?' is-open':'').'">';
   $out.='<'.$tag.' class="lb-collapse-title" id="'.esc_attr($tid).'" role="button" tabindex="0" aria-expanded="'.($open?'true':'false').'" aria-controls="'.esc_attr($cid).'">'.($pos==='left'?$icon:'').'<span class="lb-collapse-heading">'.wp_kses_post($title).'</span>'.($pos==='right'?$icon:'').'</'.$tag.'>';
   $out.='<div class="lb-collapse-content lb-slot-panel" id="'.esc_attr($cid).'" data-lb-slot="'.esc_attr($slot['id']).'" role="region" aria-labelledby="'.esc_attr($tid).'"'.($open?'':' hidden').'>'.$body.'</div>';
   $out.='</div>';
   $faq[]=['@type'=>'Question','name'=>wp_strip_all_tags($title),'acceptedAnswer'=>['@type'=>'Answer','text'=>wp_strip_all_tags($body)]];
  }
  $out.='</div>';
  if(!empty($s['faq_schema'])&&$faq)$out.='<script type="application/ld+json">'.wp_json_encode(['@context'=>'https://schema.org','@type'=>'FAQPage','mainEntity'=>$faq]).'</script>';
  return $out;
 }
}
