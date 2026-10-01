<?php
namespace SidcraftPageBuilder\Units; if(!defined('ABSPATH')) exit;
/** Button: link button with size presets, alignment, icon before/after the label, icon spacing, colours, border and hover animation. */
class Button extends Unit {
 public function type(){return 'button';} public function title(){return __('Button', 'sidcraft-page-builder');} public function icon(){return 'B';} public function category(){return 'basic';}
 public function uses_button(){return true;}
 public function keywords(){return ['button','link','cta','call to action'];}
 public static function sizes(){return ['xs','small','medium','large','xl'];}
 public function defaults(){return ['text'=>__('Click Here', 'sidcraft-page-builder'),'url'=>'#','target'=>'_self','button_type'=>'default','size'=>'medium','align'=>'left','background'=>'#222222','text_color'=>'#ffffff','hover_background'=>'','hover_text_color'=>'','hover_border_color'=>'','padding'=>'12px 22px','radius'=>6,'border_color'=>'','border_width'=>0,'border_style'=>'solid','shadow'=>[],'hover_shadow'=>[],'typography'=>[],'icon'=>'','icon_placement'=>'before','icon_spacing'=>8,'icon_size'=>'','hover_animation'=>'','button_id'=>''];}
 public function controls(){
  $btn=__('Button', 'sidcraft-page-builder'); $style=__('Button', 'sidcraft-page-builder'); $hover=__('Hover', 'sidcraft-page-builder');
  $a='{{WRAPPER}} .lb-button';
  return [
   'text'=>$this->ctrl('wysiwyg',__('Text', 'sidcraft-page-builder'),'content',$btn,['dynamic'=>true]),
   'url'=>$this->ctrl('url',__('Link', 'sidcraft-page-builder'),'content',$btn,['dynamic'=>true]),
   'target'=>$this->ctrl('select',__('Open In', 'sidcraft-page-builder'),'content',$btn,['options'=>self::opt_target()]),
   'button_type'=>$this->ctrl('select',__('Type', 'sidcraft-page-builder'),'content',$btn,['options'=>['default'=>__('Default', 'sidcraft-page-builder'),'info'=>__('Info', 'sidcraft-page-builder'),'success'=>__('Success', 'sidcraft-page-builder'),'warning'=>__('Warning', 'sidcraft-page-builder'),'danger'=>__('Danger', 'sidcraft-page-builder')]]),
   'size'=>$this->ctrl('select',__('Size', 'sidcraft-page-builder'),'content',$btn,['options'=>['xs'=>__('Extra Small', 'sidcraft-page-builder'),'small'=>__('Small', 'sidcraft-page-builder'),'medium'=>__('Medium', 'sidcraft-page-builder'),'large'=>__('Large', 'sidcraft-page-builder'),'xl'=>__('Extra Large', 'sidcraft-page-builder')]]),
   'icon'=>$this->ctrl('icon',__('Icon', 'sidcraft-page-builder'),'content',$btn),
   'icon_placement'=>$this->ctrl('select',__('Icon Position', 'sidcraft-page-builder'),'content',$btn,['options'=>['before'=>__('Before', 'sidcraft-page-builder'),'after'=>__('After', 'sidcraft-page-builder')],'condition'=>['icon!'=>'']]),
   'button_id'=>$this->ctrl('text',__('Button ID', 'sidcraft-page-builder'),'content',$btn),
   'align'=>$this->ctrl('choose',__('Alignment', 'sidcraft-page-builder'),'style',$style,['responsive'=>true,'options'=>self::opt_align(),'map'=>['left'=>'flex-start','center'=>'center','right'=>'flex-end','justify'=>'stretch'],'selectors'=>['{{WRAPPER}} .lb-button-wrap'=>'justify-content: {{VALUE}};','{{WRAPPER}}'=>'--lb-button-align: {{RAW}};']]),
   'typography'=>$this->ctrl('typography',__('Typography', 'sidcraft-page-builder'),'style',$style,['selectors'=>[$a=>'{{VALUE}}']]),
   'background'=>$this->ctrl('color',__('Background Color', 'sidcraft-page-builder'),'style',$style,['selectors'=>[$a=>'background: {{VALUE}};']]),
   'text_color'=>$this->ctrl('color',__('Text Color', 'sidcraft-page-builder'),'style',$style,['selectors'=>[$a=>'color: {{VALUE}};']]),
   'icon_spacing'=>$this->ctrl('slider',__('Icon Spacing', 'sidcraft-page-builder'),'style',$style,['responsive'=>true,'units'=>['px','em'],'range'=>['min'=>0,'max'=>60],'condition'=>['icon!'=>''],'selectors'=>[$a=>'--lb-button-icon-gap: {{SIZE}}{{UNIT}};']]),
   'icon_size'=>$this->ctrl('slider',__('Icon Size', 'sidcraft-page-builder'),'style',$style,['responsive'=>true,'units'=>['px','em'],'range'=>['min'=>8,'max'=>80],'condition'=>['icon!'=>''],'selectors'=>['{{WRAPPER}} .lb-button-icon'=>'font-size: {{SIZE}}{{UNIT}};']]),
   'padding'=>$this->ctrl('dimensions',__('Padding', 'sidcraft-page-builder'),'style',$style,['selectors'=>[$a=>'padding: {{VALUE}};']]),
   'radius'=>$this->ctrl('slider',__('Border Radius', 'sidcraft-page-builder'),'style',$style,['responsive'=>true,'units'=>['px','%','em'],'range'=>['min'=>0,'max'=>80],'selectors'=>[$a=>'border-radius: {{SIZE}}{{UNIT}};']]),
   'border_width'=>$this->ctrl('slider',__('Border Width', 'sidcraft-page-builder'),'style',$style,['units'=>['px'],'range'=>['min'=>0,'max'=>20],'selectors'=>[$a=>'border-width: {{SIZE}}{{UNIT}};']]),
   'border_style'=>$this->ctrl('select',__('Border Style', 'sidcraft-page-builder'),'style',$style,['options'=>[''=>__('None', 'sidcraft-page-builder'),'solid'=>__('Solid', 'sidcraft-page-builder'),'dashed'=>__('Dashed', 'sidcraft-page-builder'),'dotted'=>__('Dotted', 'sidcraft-page-builder'),'double'=>__('Double', 'sidcraft-page-builder')],'selectors'=>[$a=>'border-style: {{VALUE}};']]),
   'border_color'=>$this->ctrl('color',__('Border Color', 'sidcraft-page-builder'),'style',$style,['selectors'=>[$a=>'border-color: {{VALUE}};']]),
   'shadow'=>$this->ctrl('box_shadow',__('Shadow', 'sidcraft-page-builder'),'style',$style,['selectors'=>[$a=>'box-shadow: {{VALUE}};']]),
   'hover_background'=>$this->ctrl('color',__('Background Color', 'sidcraft-page-builder'),'style',$hover,['selectors'=>[$a.':hover'=>'background: {{VALUE}};','{{WRAPPER}}'=>'--lb-button-hover-bg: {{VALUE}};']]),
   'hover_text_color'=>$this->ctrl('color',__('Text Color', 'sidcraft-page-builder'),'style',$hover,['selectors'=>[$a.':hover'=>'color: {{VALUE}};','{{WRAPPER}}'=>'--lb-button-hover-color: {{VALUE}};']]),
   'hover_border_color'=>$this->ctrl('color',__('Border Color', 'sidcraft-page-builder'),'style',$hover,['selectors'=>[$a.':hover'=>'border-color: {{VALUE}};','{{WRAPPER}}'=>'--lb-button-hover-border: {{VALUE}};']]),
   'hover_shadow'=>$this->ctrl('box_shadow',__('Shadow', 'sidcraft-page-builder'),'style',$hover,['selectors'=>[$a.':hover'=>'box-shadow: {{VALUE}};']]),
   'hover_animation'=>$this->ctrl('select',__('Hover Animation', 'sidcraft-page-builder'),'style',$hover,['options'=>self::opt_hover()]),
  ];
 }
 public function render($s,$children=''){
  $size=in_array($s['size']??'medium',self::sizes(),true)?$s['size']:'medium';
  $align=$this->scalar($s['align']??'left','left');
  $align=in_array($align,['left','center','right','justify'],true)?$align:'left';
  $placement=($s['icon_placement']??'before')==='after'?'after':'before';
  $icon=!empty($s['icon'])?'<span class="lb-button-icon lb-button-icon-'.$placement.'" aria-hidden="true">'.\SidcraftPageBuilder\Utils\Icons::svg($s['icon']).'</span>':'';
  $label='<span class="lb-button-text" data-inline="text">'.wp_kses_post($s['text']??__('Click Here', 'sidcraft-page-builder')).'</span>';
  $t=($s['target']??'_self')==='_blank'?' target="_blank" rel="noopener"':'';
  $id=!empty($s['button_id'])?' id="'.esc_attr(sanitize_html_class($s['button_id'])).'"':'';
  $type=in_array($s['button_type']??'default',['default','info','success','warning','danger'],true)?$s['button_type']:'default';
  $a='<a class="'.$this->cls($s).' lb-button lb-button-'.sanitize_html_class($size).' lb-button-type-'.sanitize_html_class($type).($icon?' lb-button-has-icon':'').$this->hover_class($s).'"'.$id.' href="'.esc_attr(self::link_href($s['url']??'#')).'"'.$t.'>'.($placement==='before'?$icon.$label:$label.$icon).'</a>';
  return '<div class="lb-button-wrap lb-button-align-'.$align.'">'.$a.'</div>';
 }
}
