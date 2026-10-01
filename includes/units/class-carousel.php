<?php
namespace SidcraftPageBuilder\Units; if(!defined('ABSPATH')) exit;
/**
 * Image Carousel: repeater of slides (image, caption, link). Legacy comma-separated
 * `ids` plus `custom_urls` lines are migrated on load.
 */
class Carousel extends Unit {
 public function type(){return 'carousel';} public function title(){return __('Image Carousel', 'sidcraft-page-builder');} public function icon(){return "\u{29C9}";} public function category(){return 'media';}
 public function keywords(){return ['carousel','slider','slideshow','images','gallery'];}
 public function scripts($s=[]){return $this->frontend_scripts();}
 public function defaults(){return ['slides'=>[],'ids'=>'','image_size'=>'large','slides_to_show'=>1,'slides_to_scroll'=>1,'image_stretch'=>false,'navigation'=>'both','link'=>'none','custom_urls'=>'','lightbox'=>true,'caption'=>'none','lazyload'=>true,'autoplay'=>true,'pause_on_hover'=>true,'pause_on_interaction'=>true,'interval'=>5000,'loop'=>true,'effect'=>'slide','speed'=>500,'slide_direction'=>'ltr','height'=>'','image_spacing'=>10,'image_radius'=>'','arrows_size'=>'','arrows_color'=>'','dots_size'=>'','dots_color'=>'','caption_align'=>'center','caption_color'=>''];}
 public function controls(){
  $car=__('Image Carousel', 'sidcraft-page-builder'); $images=__('Images', 'sidcraft-page-builder'); $arrows=__('Arrows', 'sidcraft-page-builder'); $dots=__('Dots', 'sidcraft-page-builder'); $cap=__('Caption', 'sidcraft-page-builder');
  return [
   'slides'=>$this->ctrl('repeater',__('Slides', 'sidcraft-page-builder'),'content',$car,[
    'title_field'=>'{{caption}}',
    'fields'=>[
     'image_id'=>$this->field('media',__('Image', 'sidcraft-page-builder'),['media_types'=>['image','video'],'description'=>__('Choose an image or a video from the Media Library.', 'sidcraft-page-builder')]),
     'image_url'=>$this->field('url',__('Image URL', 'sidcraft-page-builder'),['hidden'=>true]),
     'caption'=>$this->field('text',__('Caption', 'sidcraft-page-builder')),
     'alt'=>$this->field('text',__('Alt Text', 'sidcraft-page-builder')),
     'link'=>$this->field('url',__('Link', 'sidcraft-page-builder')),
    ],
   ]),
   'ids'=>$this->ctrl('gallery',__('Images', 'sidcraft-page-builder'),'content',$car,['hidden'=>true]),
   'custom_urls'=>$this->ctrl('textarea',__('Custom URLs', 'sidcraft-page-builder'),'content',$car,['hidden'=>true]),
   'image_size'=>$this->ctrl('select',__('Image Size', 'sidcraft-page-builder'),'content',$car,['options'=>['thumbnail'=>__('Thumbnail', 'sidcraft-page-builder'),'medium'=>__('Medium', 'sidcraft-page-builder'),'medium_large'=>__('Medium Large', 'sidcraft-page-builder'),'large'=>__('Large', 'sidcraft-page-builder'),'full'=>__('Full', 'sidcraft-page-builder')]]),
   'slides_to_show'=>$this->ctrl('number',__('Slides to Show', 'sidcraft-page-builder'),'content',$car,['range'=>['min'=>1,'max'=>10]]),
   'slides_to_scroll'=>$this->ctrl('number',__('Slides to Scroll', 'sidcraft-page-builder'),'content',$car,['range'=>['min'=>1,'max'=>10]]),
   'image_stretch'=>$this->ctrl('switch',__('Image Stretch', 'sidcraft-page-builder'),'content',$car),
   'navigation'=>$this->ctrl('select',__('Navigation', 'sidcraft-page-builder'),'content',$car,['options'=>['both'=>__('Arrows and Dots', 'sidcraft-page-builder'),'arrows'=>__('Arrows', 'sidcraft-page-builder'),'dots'=>__('Dots', 'sidcraft-page-builder'),'none'=>__('None', 'sidcraft-page-builder')]]),
   'link'=>$this->ctrl('select',__('Link', 'sidcraft-page-builder'),'content',$car,['options'=>['none'=>__('None', 'sidcraft-page-builder'),'file'=>__('Media File', 'sidcraft-page-builder'),'custom'=>__('Custom URL', 'sidcraft-page-builder')]]),
   'lightbox'=>$this->ctrl('switch',__('Lightbox', 'sidcraft-page-builder'),'content',$car,['condition'=>['link'=>'file']]),
   'caption'=>$this->ctrl('select',__('Caption', 'sidcraft-page-builder'),'content',$car,['options'=>['none'=>__('None', 'sidcraft-page-builder'),'title'=>__('Title', 'sidcraft-page-builder'),'caption'=>__('Caption', 'sidcraft-page-builder'),'description'=>__('Description', 'sidcraft-page-builder')]]),
   'lazyload'=>$this->ctrl('switch',__('Lazy Load', 'sidcraft-page-builder'),'content',$car),
   'autoplay'=>$this->ctrl('switch',__('Autoplay', 'sidcraft-page-builder'),'content',$car),
   'pause_on_hover'=>$this->ctrl('switch',__('Pause on Hover', 'sidcraft-page-builder'),'content',$car),
   'pause_on_interaction'=>$this->ctrl('switch',__('Pause on Interaction', 'sidcraft-page-builder'),'content',$car),
   'interval'=>$this->ctrl('number',__('Autoplay Speed', 'sidcraft-page-builder'),'content',$car,['range'=>['min'=>500,'max'=>15000,'step'=>100]]),
   'loop'=>$this->ctrl('switch',__('Infinite Loop', 'sidcraft-page-builder'),'content',$car),
   'effect'=>$this->ctrl('select',__('Effect', 'sidcraft-page-builder'),'content',$car,['options'=>['slide'=>__('Slide', 'sidcraft-page-builder'),'fade'=>__('Fade', 'sidcraft-page-builder')]]),
   'speed'=>$this->ctrl('number',__('Animation Speed', 'sidcraft-page-builder'),'content',$car,['range'=>['min'=>100,'max'=>3000,'step'=>50]]),
   'slide_direction'=>$this->ctrl('select',__('Direction', 'sidcraft-page-builder'),'content',$car,['options'=>['ltr'=>__('Left to Right', 'sidcraft-page-builder'),'rtl'=>__('Right to Left', 'sidcraft-page-builder')]]),
   'height'=>$this->ctrl('text',__('Height', 'sidcraft-page-builder'),'style',$images),
   'image_spacing'=>$this->ctrl('number',__('Spacing', 'sidcraft-page-builder'),'style',$images),
   'image_radius'=>$this->ctrl('number',__('Border Radius', 'sidcraft-page-builder'),'style',$images),
   'arrows_size'=>$this->ctrl('number',__('Size', 'sidcraft-page-builder'),'style',$arrows),
   'arrows_color'=>$this->ctrl('color',__('Color', 'sidcraft-page-builder'),'style',$arrows),
   'dots_size'=>$this->ctrl('number',__('Size', 'sidcraft-page-builder'),'style',$dots),
   'dots_color'=>$this->ctrl('color',__('Color', 'sidcraft-page-builder'),'style',$dots),
   'caption_align'=>$this->ctrl('select',__('Alignment', 'sidcraft-page-builder'),'style',$cap,['options'=>self::opt_lcr()]),
   'caption_color'=>$this->ctrl('color',__('Color', 'sidcraft-page-builder'),'style',$cap),
  ];
 }
 public static function caption_text($id,$mode){
  if($mode==='title')return get_the_title($id);
  if($mode==='caption')return (string)wp_get_attachment_caption($id);
  if($mode==='description')return (string)get_post_field('post_content',$id);
  return '';
 }
 protected function slides($s){
  $items=$this->repeater_items($s['slides']??[],[]);
  if($items)return $items;
  $ids=array_values(array_filter(array_map('absint',preg_split('/[,\s]+/',(string)($s['ids']??'')))));
  $custom=array_map('trim',preg_split('/\r?\n/',(string)($s['custom_urls']??'')));
  $out=[];
  foreach($ids as $i=>$id)$out[]=['image_id'=>$id,'link'=>$custom[$i]??'','caption'=>'','alt'=>''];
  return $out;
 }
 public function render($s,$children=''){
  $slides=$this->slides($s);
  if(!$slides)return '<div class="'.$this->cls($s).' lb-carousel-placeholder">'.esc_html__('Choose images for the carousel', 'sidcraft-page-builder').'</div>';
  $show=max(1,min(10,absint($s['slides_to_show']??1)));$scroll=max(1,min($show,absint($s['slides_to_scroll']??1)));
  $nav=in_array($s['navigation']??'both',['both','arrows','dots','none'],true)?$s['navigation']:'both';
  $linkRaw=is_string($s['link']??null)?$s['link']:'none';
  if(preg_match('~^https?://(none|file|custom)/?$~i',$linkRaw,$lm))$linkRaw=strtolower($lm[1]); // repair values saved as "http://none" by older builds
  $linkMode=in_array($linkRaw,['none','file','custom'],true)?$linkRaw:'none';
  $effect=($s['effect']??'slide')==='fade'&&$show===1?'fade':'slide';
  $dir=($s['slide_direction']??'ltr')==='rtl'?'rtl':'ltr';
  $capMode=in_array($s['caption']??'none',['none','title','caption','description'],true)?$s['caption']:'none';
  $capAlign=in_array($s['caption_align']??'center',['left','center','right'],true)?$s['caption_align']:'center';
  $size=sanitize_key($s['image_size']??'large');
  $height=$this->scalar($s['height']??'');
  $vars=$this->style_attr(['--lb-carousel-show'=>$show,'--lb-carousel-spacing'=>$this->unit($s['image_spacing']??''),'--lb-carousel-radius'=>$this->unit($s['image_radius']??''),'--lb-carousel-height'=>$height!==''?$this->unit($height):'','--lb-carousel-speed'=>max(0,absint($s['speed']??500)).'ms','--lb-carousel-arrow-size'=>$this->unit($s['arrows_size']??''),'--lb-carousel-arrow-color'=>$s['arrows_color']??'','--lb-carousel-dot-size'=>$this->unit($s['dots_size']??''),'--lb-carousel-dot-color'=>$s['dots_color']??'','--lb-carousel-caption-color'=>$s['caption_color']??'']);
  $data=' data-lb-carousel data-show="'.$show.'" data-scroll="'.$scroll.'" data-effect="'.$effect.'" data-direction="'.$dir.'" data-autoplay="'.(!empty($s['autoplay'])?'1':'0').'" data-interval="'.max(500,absint($s['interval']??5000)).'" data-loop="'.(!empty($s['loop'])?'1':'0').'" data-arrows="'.(in_array($nav,['both','arrows'],true)?'1':'0').'" data-dots="'.(in_array($nav,['both','dots'],true)?'1':'0').'" data-pause-hover="'.(!empty($s['pause_on_hover'])?'1':'0').'" data-pause-interaction="'.(!empty($s['pause_on_interaction'])?'1':'0').'" data-lightbox="'.(!empty($s['lightbox'])&&$linkMode==='file'?'1':'0').'"';
  $classes=$this->cls($s).' lb-carousel lb-carousel-effect-'.$effect.($effect==='fade'?' lb-carousel-fade':'').' lb-carousel-'.$dir.(!empty($s['image_stretch'])?' lb-carousel-stretch':'').' lb-carousel-caption-'.$capAlign;
  $out='';
  $anyCap=false;
  $total=count($slides);
  foreach($slides as $i=>$slide){
   $id=absint($slide['image_id']??0);
   $video=$id&&function_exists('wp_attachment_is')&&wp_attachment_is('video',$id);
   $url=$video?(string)(wp_get_attachment_url($id)?:($slide['image_url']??'')):$this->media_url($id,$slide['image_url']??'',$size?:'large');
   if(!$url&&!empty($slide['image_url'])&&preg_match('/\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i',(string)$slide['image_url'])){$video=true;$url=(string)$slide['image_url'];}
   if(!$url)continue;
   $alt=(string)($slide['alt']??''); if($alt===''&&$id)$alt=(string)get_post_meta($id,'_wp_attachment_image_alt',true);
   $cap=trim((string)($slide['caption']??''));
   if($cap===''&&$capMode!=='none'&&$id)$cap=self::caption_text($id,$capMode);
   $img=$video?'<video class="lb-carousel-video" src="'.esc_url($url).'" controls playsinline'.(!empty($s['lazyload'])?' preload="metadata"':'').'></video>':'<img src="'.esc_url($url).'" alt="'.esc_attr($alt).'"'.(!empty($s['lazyload'])?' loading="lazy"':'').'>';
   $href='';
   if($linkMode==='file'&&$id)$href=wp_get_attachment_image_url($id,'full')?:$url;
   elseif($linkMode==='custom')$href=(string)($slide['link']??'');
   elseif($linkMode==='none'&&!empty($slide['link']))$href=(string)$slide['link'];
   if($href){
    $lb='';
    if($linkMode==='file'&&!empty($s['lightbox'])){
     $lb=' data-lb-lightbox="1"';
     if(class_exists('\\SidcraftPageBuilder\\Settings\\KitSettings'))$lb.=\SidcraftPageBuilder\Settings\KitSettings::lightbox_data_attrs($id,$alt,$cap,$id?get_the_title($id):'');
    }
    $img='<a class="lb-carousel-link" href="'.esc_url($href).'"'.$lb.'>'.$img.'</a>';
   }
   if($cap!=='')$anyCap=true;
   $out.='<figure class="lb-carousel-slide'.($effect==='fade'&&$out===''?' is-active':'').'" role="group" aria-roledescription="slide" aria-label="'.esc_attr(sprintf(/* translators: 1: slide number, 2: total slides */__('%1$d of %2$d', 'sidcraft-page-builder'),$i+1,$total)).'">'.$img.($cap!==''?'<figcaption class="lb-carousel-caption">'.esc_html($cap).'</figcaption>':'').'</figure>';
  }
  if($out==='')return '<div class="'.$this->cls($s).' lb-carousel-placeholder">'.esc_html__('Choose images for the carousel', 'sidcraft-page-builder').'</div>';
  if($anyCap)$classes.=' lb-carousel-has-caption';
  return '<div class="'.esc_attr($classes).'" dir="'.$dir.'" aria-roledescription="carousel"'.$data.$vars.'><div class="lb-carousel-track">'.$out.'</div></div>';
 }
}
