<?php
namespace SidcraftPageBuilder\Units; if(!defined('ABSPATH')) exit;
/** Testimonial: one or more quotes (repeater) with author image, name, role and optional link. */
class Testimonial extends Unit {
 public function type(){return 'testimonial';} public function title(){return __('Testimonial', 'sidcraft-page-builder');} public function icon(){return "\u{275D}";} public function category(){return 'basic';}
 public function keywords(){return ['testimonial','quote','review','customer','feedback'];}
 public function defaults(){return [
  'items'=>[[
   '_id'=>'tm1','quote'=>'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.','author'=>'John Doe','role'=>'Designer','image_id'=>0,'image_url'=>'','link'=>'','link_target'=>'_self',
  ]],
  'image_size'=>'thumbnail','image_position'=>'aside','align'=>'center','name_tag'=>'div','quote_color'=>'','name_color'=>'','role_color'=>'','image_width'=>'','image_radius'=>'',
 ];}
 public function controls(){
  $tm='Testimonial'; $content=__('Content', 'sidcraft-page-builder'); $image=__('Image', 'sidcraft-page-builder'); $name=__('Name', 'sidcraft-page-builder'); $role=__('Title', 'sidcraft-page-builder');
  return [
   'items'=>$this->ctrl('repeater',__('Testimonials', 'sidcraft-page-builder'),'content',$tm,[
    'title_field'=>'{{author}}','prevent_empty'=>true,
    'fields'=>[
     'quote'=>$this->field('wysiwyg',__('Content', 'sidcraft-page-builder')),
     'image_id'=>$this->field('media',__('Image', 'sidcraft-page-builder')),
     'image_url'=>$this->field('url',__('Image URL', 'sidcraft-page-builder'),['hidden'=>true]),
     'author'=>$this->field('text',__('Name', 'sidcraft-page-builder')),
     'role'=>$this->field('text',__('Title', 'sidcraft-page-builder')),
     'link'=>$this->field('url',__('Link', 'sidcraft-page-builder')),
     'link_target'=>$this->field('select',__('Link Target', 'sidcraft-page-builder'),['options'=>self::opt_target(),'condition'=>['link!'=>'']]),
    ],
   ]),
   'image_size'=>$this->ctrl('select',__('Image Size', 'sidcraft-page-builder'),'content',$tm,['options'=>['thumbnail'=>__('Thumbnail', 'sidcraft-page-builder'),'medium'=>__('Medium', 'sidcraft-page-builder'),'large'=>__('Large', 'sidcraft-page-builder'),'full'=>__('Full', 'sidcraft-page-builder')]]),
   'image_position'=>$this->ctrl('select',__('Image Position', 'sidcraft-page-builder'),'content',$tm,['options'=>['aside'=>__('Aside', 'sidcraft-page-builder'),'top'=>__('Top', 'sidcraft-page-builder')]]),
   'align'=>$this->ctrl('select',__('Alignment', 'sidcraft-page-builder'),'content',$tm,['options'=>self::opt_lcr()]),
   'name_tag'=>$this->ctrl('select',__('Name HTML Tag', 'sidcraft-page-builder'),'content',$tm,['options'=>self::opt_title_tags()]),
   'quote_color'=>$this->ctrl('color',__('Text Color', 'sidcraft-page-builder'),'style',$content),
   'image_width'=>$this->ctrl('number',__('Size', 'sidcraft-page-builder'),'style',$image),
   'image_radius'=>$this->ctrl('number',__('Radius', 'sidcraft-page-builder'),'style',$image),
   'name_color'=>$this->ctrl('color',__('Color', 'sidcraft-page-builder'),'style',$name,['selectors'=>['{{WRAPPER}} .lb-testimonial-name,{{WRAPPER}} .lb-testimonial-name a'=>'color: {{VALUE}};']]),
   'role_color'=>$this->ctrl('color',__('Color', 'sidcraft-page-builder'),'style',$role),
  ];
 }
 protected function item_html($s,$item){
  $pos=($s['image_position']??'aside')==='top'?'top':'aside';
  $align=in_array($s['align']??'center',['left','center','right'],true)?$s['align']:'center';
  $tag=$this->tag($s['name_tag']??'div',$this->title_tags(),'div');
  $author=(string)($item['author']??''); $role=(string)($item['role']??''); $quote=(string)($item['quote']??'');
  $url=$this->media_url($item['image_id']??0,$item['image_url']??'',sanitize_key($s['image_size']??'thumbnail'));
  $link=!empty($item['link'])?esc_url($item['link']):''; $t=($item['link_target']??'_self')==='_blank'?' target="_blank" rel="noopener"':'';
  $wrap=function($html,$attrs='')use($link,$t){return $link?'<a href="'.$link.'"'.$t.$attrs.'>'.$html.'</a>':$html;};
  $img=$url?'<div class="lb-testimonial-image">'.$wrap('<img src="'.esc_url($url).'" alt="'.esc_attr($author).'" loading="lazy">',' tabindex="-1" aria-hidden="true"').'</div>':'';
  $name=$author!==''?'<'.$tag.' class="lb-testimonial-name">'.$wrap(esc_html($author)).'</'.$tag.'>':'';
  $roleHtml=$role!==''?'<div class="lb-testimonial-role">'.esc_html($role).'</div>':'';
  $out='<figure class="lb-testimonial lb-testimonial-image-'.$pos.' lb-testimonial-align-'.$align.'">';
  if($quote!=='')$out.='<blockquote class="lb-testimonial-quote">'.wp_kses_post($quote).'</blockquote>';
  $out.='<figcaption class="lb-testimonial-meta">'.$img.'<div class="lb-testimonial-details">'.$name.$roleHtml.'</div></figcaption>';
  return $out.'</figure>';
 }
 public function render($s,$children=''){
  $items=$this->repeater_items($s['items']??'',['quote','author','role']);
  if(!$items && (trim((string)($s['quote']??'').($s['author']??''))!=='')){
   $items=[['quote'=>$s['quote']??'','author'=>$s['author']??'','role'=>$s['role']??'','image_id'=>$s['image_id']??0,'image_url'=>$s['image_url']??'','link'=>$s['link']??'','link_target'=>$s['link_target']??'_self']];
  }
  $vars=$this->style_attr(['--lb-testimonial-quote-color'=>$s['quote_color']??'','--lb-testimonial-name-color'=>$s['name_color']??'','--lb-testimonial-role-color'=>$s['role_color']??'','--lb-testimonial-image-width'=>$this->unit($s['image_width']??''),'--lb-testimonial-image-radius'=>$this->unit($s['image_radius']??'')]);
  if(count($items)<=1){
   $html=$items?$this->item_html($s,$items[0]):'<figure class="lb-testimonial"></figure>';
   return '<div class="'.$this->cls($s).'"'.$vars.'>'.$html.'</div>';
  }
  $out='<div class="'.$this->cls($s).' lb-testimonial-list"'.$vars.'>';
  foreach($items as $item)$out.=$this->item_html($s,$item);
  return $out.'</div>';
 }
}
