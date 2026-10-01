<?php
namespace SidcraftPageBuilder\Units; if(!defined('ABSPATH')) exit;
class Image extends Unit {
 public function type(){return 'image';} public function title(){return __('Image', 'sidcraft-page-builder');} public function icon(){return "\u{25A7}";} public function category(){return 'media';}
 public function keywords(){return ['image','photo','picture','lightbox','caption','responsive','media','srcset','alt'];}
 public function scripts($s=[]){
  $s=is_array($s)?$s:[];
  if(($s['link_to']??'')==='file'||($s['link']??'')==='lightbox'||!empty($s['lightbox']))return $this->frontend_scripts();
  return [];
 }
 public function defaults(){return ['image_id'=>0,'image_url'=>'','image_size'=>'full','alt'=>'','link_to'=>'none','link'=>'','link_target'=>'_self','lightbox'=>false,'caption'=>'','caption_type'=>'none','alignment'=>'left','align_self'=>'start','width'=>'100%','height'=>'','object_fit'=>'cover','object_position'=>'center','hover_animation'=>'','border_width'=>[],'border_style'=>'','border_color'=>'','border_radius'=>[],'radius'=>0,'shadow'=>[],'hover_shadow'=>[],'hover_border_color'=>'','opacity'=>1,'filter'=>'','hover_filter'=>'','image_hover_opacity'=>'','hover_transition'=>'','caption_align'=>'center','caption_color'=>'','caption_spacing'=>'','caption_size'=>'','margin'=>[],'padding'=>[],'position'=>'','z_index'=>0,'css_id'=>'','css_class'=>'','global_class'=>'','custom_css'=>'','loading'=>'lazy','decoding'=>'async','fetchpriority'=>'auto'];}
 public function controls(){
  $img=__('Image', 'sidcraft-page-builder'); $sizes=['thumbnail'=>'Thumbnail','medium'=>'Medium','medium_large'=>'Medium Large','large'=>'Large','1536x1536'=>"1536\u{D7}1536",'2048x2048'=>"2048\u{D7}2048",'full'=>'Full'];
  $len=['%','px','vw','em','rem'];
  $hover=__('Hover', 'sidcraft-page-builder'); $border=__('Border', 'sidcraft-page-builder'); $cap=__('Caption', 'sidcraft-page-builder');
  $pic='{{WRAPPER}} .lb-image, {{WRAPPER}} .lb-image-preview';
  $el='{{WRAPPER}} .lb-image-img';
  return [
   'image_id'=>$this->ctrl('media',__('Choose Image', 'sidcraft-page-builder'),'content',$img,['dynamic'=>true]),
   'image_url'=>$this->ctrl('url',__('Image URL', 'sidcraft-page-builder'),'content',$img,['hidden'=>true,'dynamic'=>true]),
   'image_size'=>$this->ctrl('select',__('Image Size', 'sidcraft-page-builder'),'content',$img,['options'=>$sizes]),
   'link_to'=>$this->ctrl('select',__('Link', 'sidcraft-page-builder'),'content',$img,['options'=>['none'=>__('None', 'sidcraft-page-builder'),'file'=>__('Media File', 'sidcraft-page-builder'),'custom'=>__('Custom URL', 'sidcraft-page-builder')]]),
   'link'=>$this->ctrl('url',__('Custom URL', 'sidcraft-page-builder'),'content',$img,['condition'=>['link_to'=>'custom'],'dynamic'=>true]),
   'link_target'=>$this->ctrl('select',__('Link Target', 'sidcraft-page-builder'),'content',$img,['options'=>self::opt_target(),'condition'=>['link_to'=>'custom']]),
   'lightbox'=>$this->ctrl('switch',__('Lightbox', 'sidcraft-page-builder'),'content',$img),
   'caption_type'=>$this->ctrl('select',__('Caption', 'sidcraft-page-builder'),'content',$img,['options'=>['none'=>__('None', 'sidcraft-page-builder'),'custom'=>__('Custom', 'sidcraft-page-builder'),'attachment'=>__('Attachment', 'sidcraft-page-builder')]]),
   'caption'=>$this->ctrl('text',__('Caption Text', 'sidcraft-page-builder'),'content',$img,['condition'=>['caption_type'=>'custom'],'dynamic'=>true]),
   'alt'=>$this->ctrl('text',__('Alt Text', 'sidcraft-page-builder'),'content',$img,['dynamic'=>true]),
   'loading'=>$this->ctrl('select',__('Lazy Load', 'sidcraft-page-builder'),'content',$img,['options'=>['lazy'=>__('Lazy', 'sidcraft-page-builder'),'eager'=>__('Eager', 'sidcraft-page-builder'),'auto'=>__('Auto', 'sidcraft-page-builder')]]),
   'decoding'=>$this->ctrl('select',__('Decoding', 'sidcraft-page-builder'),'content',$img,['options'=>['async'=>__('Async', 'sidcraft-page-builder'),'sync'=>__('Sync', 'sidcraft-page-builder'),'auto'=>__('Auto', 'sidcraft-page-builder')]]),
   'fetchpriority'=>$this->ctrl('select',__('Fetch Priority', 'sidcraft-page-builder'),'content',$img,['options'=>['auto'=>__('Auto', 'sidcraft-page-builder'),'high'=>__('High', 'sidcraft-page-builder'),'low'=>__('Low', 'sidcraft-page-builder')]]),
   'alignment'=>$this->ctrl('choose',__('Alignment', 'sidcraft-page-builder'),'style',$img,['responsive'=>true,'options'=>self::opt_lcr(),'map'=>['left'=>'flex-start','center'=>'center','right'=>'flex-end'],'selectors'=>['{{WRAPPER}}'=>'align-items: {{VALUE}};text-align: {{RAW}};--lb-media-items: {{VALUE}};']]),
   'align_self'=>$this->ctrl('select',__('Vertical Align', 'sidcraft-page-builder'),'style',$img,['options'=>['start'=>__('Start', 'sidcraft-page-builder'),'center'=>__('Center', 'sidcraft-page-builder'),'end'=>__('End', 'sidcraft-page-builder'),'stretch'=>__('Stretch', 'sidcraft-page-builder')]]),
   'width'=>$this->ctrl('slider',__('Width', 'sidcraft-page-builder'),'style',$img,['responsive'=>true,'units'=>$len,'range'=>['min'=>0,'max'=>1000],'selectors'=>['{{WRAPPER}}'=>'--lb-img-w: {{VALUE}};',$pic=>'width: {{VALUE}};max-width: 100%;']]),
   'max_width'=>$this->ctrl('slider',__('Max Width', 'sidcraft-page-builder'),'style',$img,['responsive'=>true,'units'=>['px','%','vw','em','rem'],'range'=>['min'=>0,'max'=>2000],'selectors'=>['{{WRAPPER}}'=>'--lb-img-max-w: {{VALUE}};',$pic=>'max-width: {{VALUE}};']]),
   'height'=>$this->ctrl('slider',__('Height', 'sidcraft-page-builder'),'style',$img,['responsive'=>true,'units'=>['px','%','vh','em','rem','auto'],'range'=>['min'=>0,'max'=>2000],'selectors'=>['{{WRAPPER}}'=>'--lb-img-h: {{VALUE}};',$el=>'height: {{VALUE}};']]),
   'object_fit'=>$this->ctrl('select',__('Object Fit', 'sidcraft-page-builder'),'style',$img,['options'=>['cover'=>__('Cover', 'sidcraft-page-builder'),'contain'=>__('Contain', 'sidcraft-page-builder'),'fill'=>__('Fill', 'sidcraft-page-builder'),'none'=>__('None', 'sidcraft-page-builder'),'scale-down'=>__('Scale Down', 'sidcraft-page-builder')],'selectors'=>['{{WRAPPER}}'=>'--lb-object-fit: {{VALUE}};',$el=>'object-fit: {{VALUE}};']]),
   'object_position'=>$this->ctrl('select',__('Object Position', 'sidcraft-page-builder'),'style',$img,['options'=>['center'=>__('Center', 'sidcraft-page-builder'),'top'=>__('Top', 'sidcraft-page-builder'),'right'=>__('Right', 'sidcraft-page-builder'),'bottom'=>__('Bottom', 'sidcraft-page-builder'),'left'=>__('Left', 'sidcraft-page-builder'),'top left'=>__('Top Left', 'sidcraft-page-builder'),'top right'=>__('Top Right', 'sidcraft-page-builder'),'bottom left'=>__('Bottom Left', 'sidcraft-page-builder'),'bottom right'=>__('Bottom Right', 'sidcraft-page-builder')],'selectors'=>['{{WRAPPER}}'=>'--lb-object-position: {{VALUE}};',$el=>'object-position: {{VALUE}};']]),
   'opacity'=>$this->ctrl('slider',__('Opacity', 'sidcraft-page-builder'),'style',$img,['units'=>[],'range'=>['min'=>0,'max'=>1,'step'=>0.05],'selectors'=>[$el=>'opacity: {{SIZE}};']]),
   'filter'=>$this->ctrl('css_filter',__('CSS Filter', 'sidcraft-page-builder'),'style',$img,['selectors'=>[$el=>'filter: {{VALUE}};']]),
   'image_hover_opacity'=>$this->ctrl('slider',__('Opacity', 'sidcraft-page-builder'),'style',$hover,['units'=>[],'range'=>['min'=>0,'max'=>1,'step'=>0.05],'selectors'=>['{{WRAPPER}}:hover .lb-image-img'=>'opacity: {{SIZE}};']]),
   'hover_filter'=>$this->ctrl('css_filter',__('CSS Filter', 'sidcraft-page-builder'),'style',$hover,['selectors'=>['{{WRAPPER}}:hover .lb-image-img'=>'filter: {{VALUE}};']]),
   'hover_border_color'=>$this->ctrl('color',__('Border Color', 'sidcraft-page-builder'),'style',$hover,['condition'=>['border_style!'=>''],'selectors'=>['{{WRAPPER}}:hover .lb-image, {{WRAPPER}}:hover .lb-image-img'=>'border-color: {{VALUE}};']]),
   'hover_shadow'=>$this->ctrl('box_shadow',__('Shadow', 'sidcraft-page-builder'),'style',$hover,['selectors'=>['{{WRAPPER}}:hover .lb-image'=>'box-shadow: {{VALUE}};']]),
   'hover_animation'=>$this->ctrl('select',__('Hover Animation', 'sidcraft-page-builder'),'style',$hover,['options'=>self::opt_hover()]),
   'hover_transition'=>$this->ctrl('slider',__('Transition Duration', 'sidcraft-page-builder'),'style',$hover,['units'=>['s','ms'],'range'=>['min'=>0,'max'=>3,'step'=>0.05],'selectors'=>[$el=>'transition-duration: {{SIZE}}{{UNIT}};']]),
   'border_style'=>$this->ctrl('select',__('Border Style', 'sidcraft-page-builder'),'style',$border,['options'=>[''=>__('None', 'sidcraft-page-builder'),'solid'=>__('Solid', 'sidcraft-page-builder'),'dashed'=>__('Dashed', 'sidcraft-page-builder'),'dotted'=>__('Dotted', 'sidcraft-page-builder'),'double'=>__('Double', 'sidcraft-page-builder')],'selectors'=>[$pic.', '.$el=>'border-style: {{VALUE}};']]),
   'border_width'=>$this->ctrl('dimensions',__('Border Width', 'sidcraft-page-builder'),'style',$border,['condition'=>['border_style!'=>''],'selectors'=>[$pic.', '.$el=>'border-width: {{VALUE}};']]),
   'border_color'=>$this->ctrl('color',__('Border Color', 'sidcraft-page-builder'),'style',$border,['condition'=>['border_style!'=>''],'selectors'=>[$pic.', '.$el=>'border-color: {{VALUE}};']]),
   'border_radius'=>$this->ctrl('dimensions',__('Radius', 'sidcraft-page-builder'),'style',$border,['selectors'=>[$pic.', '.$el=>'border-radius: {{VALUE}};']]),
   'shadow'=>$this->ctrl('box_shadow',__('Shadow', 'sidcraft-page-builder'),'style',$border,['selectors'=>['{{WRAPPER}} .lb-image'=>'box-shadow: {{VALUE}};']]),
   'caption_align'=>$this->ctrl('choose',__('Alignment', 'sidcraft-page-builder'),'style',$cap,['responsive'=>true,'options'=>self::opt_lcr(),'condition'=>['caption_type!'=>'none'],'selectors'=>['{{WRAPPER}} .lb-image-caption'=>'text-align: {{VALUE}};']]),
   'caption_color'=>$this->ctrl('color',__('Color', 'sidcraft-page-builder'),'style',$cap,['condition'=>['caption_type!'=>'none'],'selectors'=>['{{WRAPPER}} .lb-image-caption'=>'color: {{VALUE}};']]),
   'caption_size'=>$this->ctrl('slider',__('Size', 'sidcraft-page-builder'),'style',$cap,['responsive'=>true,'units'=>['px','em','rem'],'range'=>['min'=>8,'max'=>48],'condition'=>['caption_type!'=>'none'],'selectors'=>['{{WRAPPER}} .lb-image-caption'=>'font-size: {{SIZE}}{{UNIT}};']]),
   'caption_spacing'=>$this->ctrl('slider',__('Spacing', 'sidcraft-page-builder'),'style',$cap,['responsive'=>true,'units'=>['px','em'],'range'=>['min'=>0,'max'=>60],'condition'=>['caption_type!'=>'none'],'selectors'=>['{{WRAPPER}} .lb-image-caption'=>'margin-top: {{SIZE}}{{UNIT}};']]),
  ];
 }
 public function render($s,$children=''){
  $id=absint($s['image_id']??0); $size=sanitize_key($s['image_size']??'full');$url=esc_url($s['image_url']??'');
  if($id){$src=wp_get_attachment_image_src($id,$size?:'full');if($src)$url=esc_url($src[0]);}
  if(!$url)return '<div class="'.$this->cls($s).' lb-image-placeholder">'.esc_html__('Choose an image', 'sidcraft-page-builder').'</div>';
  $alt=$s['alt']??'';if($alt===''&&$id)$alt=get_post_meta($id,'_wp_attachment_image_alt',true);
  $attrs=' alt="'.esc_attr($alt).'" loading="'.esc_attr($s['loading']??'lazy').'" decoding="'.esc_attr($s['decoding']??'async').'"';if(($s['fetchpriority']??'auto')!=='auto')$attrs.=' fetchpriority="'.esc_attr($s['fetchpriority']).'"';
  if($id){$srcset=wp_get_attachment_image_srcset($id,$size?:'full');$sizes=wp_get_attachment_image_sizes($id,$size?:'full');if($srcset)$attrs.=' srcset="'.esc_attr($srcset).'"';if($sizes)$attrs.=' sizes="'.esc_attr($sizes).'"';}
  $img='<img class="lb-image-img" src="'.$url.'"'.$attrs.'>';
  $link_to=$s['link_to']??'';
  if($link_to===''&&!empty($s['lightbox']))$link_to='file';
  if($link_to===''&&!empty($s['link']))$link_to='custom';
  if($link_to==='file'||!empty($s['lightbox'])){
   $attrs_lb=' data-lb-lightbox="1" aria-label="Open image in lightbox"';
   if(class_exists('\\SidcraftPageBuilder\\Settings\\KitSettings'))$attrs_lb=\SidcraftPageBuilder\Settings\KitSettings::lightbox_data_attrs($id,$alt,$s['caption']??'',$id?get_the_title($id):'').$attrs_lb;
   $img='<a class="lb-image-lightbox" href="'.$url.'"'.$attrs_lb.'>'.$img.'</a>';
  }
  elseif($link_to==='custom'&&!empty($s['link']))$img='<a href="'.esc_attr(self::link_href($s['link'])).'" target="'.esc_attr($s['link_target']??'_self').'"'.(($s['link_target']??'')==='_blank'?' rel="noopener"':'').'>'.$img.'</a>';
  $cap='';if(($s['caption_type']??'none')!=='none'){$text=$s['caption']??'';if($text===''&&$id)$text=wp_get_attachment_caption($id)?:'';if($text!=='')$cap='<figcaption class="lb-image-caption">'.esc_html($text).'</figcaption>';}
  $self=in_array($s['align_self']??'start',['start','center','end','stretch'],true)?$s['align_self']:'start';
  return '<figure class="'.$this->cls($s).' lb-image'.$this->hover_class($s).'" style="justify-self:stretch;align-self:'.esc_attr($self).';max-width:100%;min-width:0;overflow:hidden;box-sizing:border-box;"'.$this->attrs($s).'>'.$img.$cap.'</figure>';
 }
 public function style_css($id,$s){
  $sel='#lb-node-'.$id;
  return $sel.'{display:flex;flex-direction:column;max-width:100%;min-width:0;overflow:hidden;box-sizing:border-box;}'.$sel.' .lb-image-img{width:100%;max-width:100%;display:block;}';
 }
}
