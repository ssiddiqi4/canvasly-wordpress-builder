<?php
namespace SidcraftSyntex\Units; if(!defined('ABSPATH')) exit;
/** Text Editor: rich text with drop cap, multi-column flow, paragraph spacing and link colours. */
class Text extends Unit {
 public function type(){return 'text';} public function title(){return __('Text Editor', 'sidcraft-syntex');} public function icon(){return 'T';} public function category(){return 'basic';}
 public function keywords(){return ['text','paragraph','editor','content','drop cap','columns'];}
 public function defaults(){return ['text'=>'Start writing your content here.','font_size'=>16,'font_family'=>'','font_style'=>'','text_transform'=>'','text_decoration'=>'','line_height'=>'1.6','letter_spacing'=>0,'color'=>'','hover_color'=>'','align'=>'left','weight'=>'400','drop_cap'=>false,'drop_cap_view'=>'default','drop_cap_color'=>'','drop_cap_secondary_color'=>'','drop_cap_size'=>'','drop_cap_space'=>'','drop_cap_radius'=>'','drop_cap_border_width'=>'','text_columns'=>'1','column_gap'=>'','paragraph_spacing'=>'','link_color'=>'','link_hover_color'=>'','text_shadow'=>'','hover_text_shadow'=>''];}
 public function controls(){
  $content=__('Text Editor', 'sidcraft-syntex'); $typo=__('Typography', 'sidcraft-syntex'); $space=__('Spacing', 'sidcraft-syntex'); $links=__('Links', 'sidcraft-syntex'); $hover=__('Hover', 'sidcraft-syntex'); $drop=__('Drop Cap', 'sidcraft-syntex');
  $box='{{WRAPPER}} .lb-text';
  $cols=['1'=>'1','2'=>'2','3'=>'3','4'=>'4','5'=>'5','6'=>'6','7'=>'7','8'=>'8','9'=>'9','10'=>'10'];
  return [
   'text'=>$this->ctrl('wysiwyg',__('Text', 'sidcraft-syntex'),'content',$content,['dynamic'=>true]),
   'drop_cap'=>$this->ctrl('switch',__('Drop Cap', 'sidcraft-syntex'),'content',$content),
   'drop_cap_view'=>$this->ctrl('select',__('View', 'sidcraft-syntex'),'content',$content,['options'=>['default'=>__('Default', 'sidcraft-syntex'),'stacked'=>__('Stacked', 'sidcraft-syntex'),'framed'=>__('Framed', 'sidcraft-syntex')],'condition'=>['drop_cap'=>true]]),
   'text_columns'=>$this->ctrl('select',__('Columns', 'sidcraft-syntex'),'content',$content,['options'=>$cols]),
   'align'=>$this->ctrl('choose',__('Alignment', 'sidcraft-syntex'),'style',$typo,['responsive'=>true,'options'=>self::opt_align(),'selectors'=>['{{WRAPPER}}'=>'text-align: {{VALUE}};',$box=>'text-align: {{VALUE}};']]),
   'color'=>$this->ctrl('color',__('Text Color', 'sidcraft-syntex'),'style',$typo,['selectors'=>[$box=>'color: {{VALUE}};']]),
   'font_family'=>$this->ctrl('font',__('Font Family', 'sidcraft-syntex'),'style',$typo,['selectors'=>[$box=>'font-family: {{VALUE}};']]),
   'font_size'=>$this->ctrl('slider',__('Size', 'sidcraft-syntex'),'style',$typo,['responsive'=>true,'units'=>['px','em','rem'],'range'=>['min'=>6,'max'=>200],'selectors'=>[$box=>'font-size: {{SIZE}}{{UNIT}};']]),
   'weight'=>$this->ctrl('select',__('Weight', 'sidcraft-syntex'),'style',$typo,['options'=>self::opt_weight(),'selectors'=>[$box=>'font-weight: {{VALUE}};']]),
   'font_style'=>$this->ctrl('select',__('Style', 'sidcraft-syntex'),'style',$typo,['options'=>[''=>__('Default', 'sidcraft-syntex'),'normal'=>__('Normal', 'sidcraft-syntex'),'italic'=>__('Italic', 'sidcraft-syntex'),'oblique'=>__('Oblique', 'sidcraft-syntex')],'selectors'=>[$box=>'font-style: {{VALUE}};']]),
   'text_transform'=>$this->ctrl('select',__('Transform', 'sidcraft-syntex'),'style',$typo,['options'=>[''=>__('Default', 'sidcraft-syntex'),'none'=>__('None', 'sidcraft-syntex'),'uppercase'=>__('Uppercase', 'sidcraft-syntex'),'lowercase'=>__('Lowercase', 'sidcraft-syntex'),'capitalize'=>__('Capitalize', 'sidcraft-syntex')],'selectors'=>[$box=>'text-transform: {{VALUE}};']]),
   'text_decoration'=>$this->ctrl('select',__('Decoration', 'sidcraft-syntex'),'style',$typo,['options'=>[''=>__('Default', 'sidcraft-syntex'),'none'=>__('None', 'sidcraft-syntex'),'underline'=>__('Underline', 'sidcraft-syntex'),'overline'=>__('Overline', 'sidcraft-syntex'),'line-through'=>__('Line Through', 'sidcraft-syntex')],'selectors'=>[$box=>'text-decoration: {{VALUE}};']]),
   'line_height'=>$this->ctrl('slider',__('Line Height', 'sidcraft-syntex'),'style',$typo,['responsive'=>true,'units'=>[],'range'=>['min'=>0.6,'max'=>3,'step'=>0.05],'selectors'=>[$box=>'line-height: {{SIZE}};']]),
   'letter_spacing'=>$this->ctrl('slider',__('Letter Spacing', 'sidcraft-syntex'),'style',$typo,['responsive'=>true,'units'=>['px','em'],'range'=>['min'=>-5,'max'=>20,'step'=>0.1],'selectors'=>[$box=>'letter-spacing: {{SIZE}}{{UNIT}};']]),
   'text_shadow'=>$this->ctrl('text_shadow',__('Text Shadow', 'sidcraft-syntex'),'style',$typo,['selectors'=>[$box=>'text-shadow: {{VALUE}};']]),
   'paragraph_spacing'=>$this->ctrl('slider',__('Paragraph Spacing', 'sidcraft-syntex'),'style',$space,['responsive'=>true,'units'=>['px','em','rem'],'range'=>['min'=>0,'max'=>80],'selectors'=>['{{WRAPPER}}'=>'--lb-paragraph-spacing: {{SIZE}}{{UNIT}};']]),
   'column_gap'=>$this->ctrl('slider',__('Column Gap', 'sidcraft-syntex'),'style',$space,['responsive'=>true,'units'=>['px','em','rem','%'],'range'=>['min'=>0,'max'=>80],'condition'=>['text_columns!'=>'1'],'selectors'=>['{{WRAPPER}}'=>'--lb-text-column-gap: {{SIZE}}{{UNIT}};']]),
   'link_color'=>$this->ctrl('color',__('Link Color', 'sidcraft-syntex'),'style',$links,['selectors'=>['{{WRAPPER}}'=>'--lb-link-color: {{VALUE}};',$box.' a:not(:hover):not(:focus)'=>'color: {{VALUE}};']]),
   'link_hover_color'=>$this->ctrl('color',__('Link Hover Color', 'sidcraft-syntex'),'style',$links,['selectors'=>['{{WRAPPER}}'=>'--lb-link-hover: {{VALUE}};',$box.' a:hover,'.$box.' a:focus'=>'color: {{VALUE}};']]),
   'hover_color'=>$this->ctrl('color',__('Text Color', 'sidcraft-syntex'),'style',$hover,['selectors'=>['{{WRAPPER}}'=>'--lb-text-hover: {{VALUE}};',$box.':hover'=>'color: {{VALUE}};']]),
   'hover_text_shadow'=>$this->ctrl('text_shadow',__('Text Shadow', 'sidcraft-syntex'),'style',$hover,['selectors'=>[$box.':hover'=>'text-shadow: {{VALUE}};']]),
   'drop_cap_color'=>$this->ctrl('color',__('Primary Color', 'sidcraft-syntex'),'style',$drop,['condition'=>['drop_cap'=>true],'selectors'=>['{{WRAPPER}}'=>'--lb-drop-cap-color: {{VALUE}};']]),
   'drop_cap_secondary_color'=>$this->ctrl('color',__('Secondary Color', 'sidcraft-syntex'),'style',$drop,['condition'=>['drop_cap'=>true,'drop_cap_view'=>['stacked','framed']],'selectors'=>['{{WRAPPER}}'=>'--lb-drop-cap-secondary: {{VALUE}};']]),
   'drop_cap_size'=>$this->ctrl('slider',__('Size', 'sidcraft-syntex'),'style',$drop,['responsive'=>true,'units'=>['px','em','rem'],'range'=>['min'=>16,'max'=>200],'condition'=>['drop_cap'=>true],'selectors'=>['{{WRAPPER}}'=>'--lb-drop-cap-size: {{SIZE}}{{UNIT}};']]),
   'drop_cap_space'=>$this->ctrl('slider',__('Spacing', 'sidcraft-syntex'),'style',$drop,['responsive'=>true,'units'=>['px','em'],'range'=>['min'=>0,'max'=>60],'condition'=>['drop_cap'=>true],'selectors'=>['{{WRAPPER}}'=>'--lb-drop-cap-space: {{SIZE}}{{UNIT}};']]),
   'drop_cap_radius'=>$this->ctrl('slider',__('Radius', 'sidcraft-syntex'),'style',$drop,['units'=>['px','%'],'range'=>['min'=>0,'max'=>80],'condition'=>['drop_cap'=>true,'drop_cap_view'=>['stacked','framed']],'selectors'=>['{{WRAPPER}}'=>'--lb-drop-cap-radius: {{SIZE}}{{UNIT}};']]),
   'drop_cap_border_width'=>$this->ctrl('slider',__('Border Width', 'sidcraft-syntex'),'style',$drop,['units'=>['px'],'range'=>['min'=>0,'max'=>20],'condition'=>['drop_cap'=>true,'drop_cap_view'=>'framed'],'selectors'=>['{{WRAPPER}}'=>'--lb-drop-cap-border: {{SIZE}}{{UNIT}};']]),
  ];
 }
 public function render($s,$children=''){
  $cols=max(1,min(10,absint($this->scalar($s['text_columns']??1,1))));
  $view=in_array($s['drop_cap_view']??'default',['default','stacked','framed'],true)?$s['drop_cap_view']:'default';
  $vars=$this->style_attr(['--lb-text-columns'=>$cols>1?$cols:'','--lb-text-column-gap'=>$this->unit($s['column_gap']??''),'--lb-paragraph-spacing'=>$this->unit($s['paragraph_spacing']??''),'--lb-link-color'=>$s['link_color']??'','--lb-link-hover'=>$s['link_hover_color']??'','--lb-text-hover'=>$s['hover_color']??'','--lb-drop-cap-color'=>$s['drop_cap_color']??'','--lb-drop-cap-secondary'=>$s['drop_cap_secondary_color']??'','--lb-drop-cap-size'=>$this->unit($s['drop_cap_size']??''),'--lb-drop-cap-space'=>$this->unit($s['drop_cap_space']??''),'--lb-drop-cap-radius'=>$this->unit($s['drop_cap_radius']??''),'--lb-drop-cap-border'=>$this->unit($s['drop_cap_border_width']??'')]);
  $classes=$this->cls($s).' lb-text'.($cols>1?' lb-text-columns':'').(!empty($s['drop_cap'])?' lb-text-drop-cap lb-drop-cap-'.$view:'');
  return '<div class="'.$classes.'"'.$vars.' data-inline="text">'.wp_kses_post($s['text']??'').'</div>';
 }
}
