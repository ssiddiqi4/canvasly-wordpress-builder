<?php
namespace SidcraftPageBuilder\Units; if(!defined('ABSPATH')) exit;
/**
 * Icon List: repeater of text / icon / url with a traditional (stacked) or inline layout.
 * Legacy "Text|icon|url" rows are migrated on load.
 */
class IconList extends Unit {
 public function type(){return 'icon_list';} public function title(){return __('Icon List', 'sidcraft-page-builder');} public function icon(){return "\u{2630}";} public function category(){return 'basic';}
 public function keywords(){return ['icon list','list','bullets','features','checklist'];}
 public function defaults(){return [
  'items'=>[
   ['_id'=>'il1','text'=>'List Item #1','icon'=>'','url'=>''],
   ['_id'=>'il2','text'=>'List Item #2','icon'=>'','url'=>''],
   ['_id'=>'il3','text'=>'List Item #3','icon'=>'','url'=>''],
  ],
  'icon'=>'check','list_layout'=>'traditional','link_target'=>'_self','space_between'=>8,'icon_align'=>'left','divider'=>false,'divider_style'=>'solid','divider_weight'=>1,'divider_color'=>'#dddddd','divider_width'=>'100%','icon_size'=>16,'icon_color'=>'#222222','icon_hover_color'=>'','text_color'=>'','text_hover_color'=>'','text_indent'=>8,
 ];}
 public function controls(){
  $list=__('Icon List', 'sidcraft-page-builder'); $style=__('List', 'sidcraft-page-builder'); $div=__('Divider', 'sidcraft-page-builder');
  return [
   'items'=>$this->ctrl('repeater',__('Items', 'sidcraft-page-builder'),'content',$list,[
    'title_field'=>'{{text}}','prevent_empty'=>true,
    'fields'=>[
     'text'=>$this->field('wysiwyg',__('Text', 'sidcraft-page-builder'),['dynamic'=>true]),
     'icon'=>$this->field('icon',__('Icon', 'sidcraft-page-builder')),
     'url'=>$this->field('url',__('Link', 'sidcraft-page-builder'),['dynamic'=>true]),
    ],
   ]),
   'icon'=>$this->ctrl('icon',__('Default Icon', 'sidcraft-page-builder'),'content',$list),
   'list_layout'=>$this->ctrl('select',__('Layout', 'sidcraft-page-builder'),'content',$list,['options'=>['traditional'=>__('Traditional', 'sidcraft-page-builder'),'inline'=>__('Inline', 'sidcraft-page-builder')]]),
   'link_target'=>$this->ctrl('select',__('Link Target', 'sidcraft-page-builder'),'content',$list,['options'=>self::opt_target()]),
   'icon_align'=>$this->ctrl('select',__('Alignment', 'sidcraft-page-builder'),'content',$list,['options'=>self::opt_lcr()]),
   'divider'=>$this->ctrl('switch',__('Divider', 'sidcraft-page-builder'),'content',$list),
   'space_between'=>$this->ctrl('number',__('Space Between', 'sidcraft-page-builder'),'style',$style),
   'icon_size'=>$this->ctrl('number',__('Icon Size', 'sidcraft-page-builder'),'style',$style),
   'icon_color'=>$this->ctrl('color',__('Icon Color', 'sidcraft-page-builder'),'style',$style),
   'icon_hover_color'=>$this->ctrl('color',__('Icon Hover', 'sidcraft-page-builder'),'style',$style),
   'text_color'=>$this->ctrl('color',__('Text Color', 'sidcraft-page-builder'),'style',$style,['selectors'=>['{{WRAPPER}} .lb-icon-list-text,{{WRAPPER}} .lb-icon-list-item>a'=>'color: {{VALUE}};']]),
   'text_hover_color'=>$this->ctrl('color',__('Text Hover', 'sidcraft-page-builder'),'style',$style,['selectors'=>['{{WRAPPER}} .lb-icon-list-item:hover .lb-icon-list-text,{{WRAPPER}} .lb-icon-list-item>a:hover'=>'color: {{VALUE}};']]),
   'text_indent'=>$this->ctrl('number',__('Text Indent', 'sidcraft-page-builder'),'style',$style),
   'divider_style'=>$this->ctrl('select',__('Style', 'sidcraft-page-builder'),'style',$div,['options'=>['solid'=>__('Solid', 'sidcraft-page-builder'),'double'=>__('Double', 'sidcraft-page-builder'),'dotted'=>__('Dotted', 'sidcraft-page-builder'),'dashed'=>__('Dashed', 'sidcraft-page-builder')],'condition'=>['divider'=>true]]),
   'divider_weight'=>$this->ctrl('number',__('Weight', 'sidcraft-page-builder'),'style',$div,['condition'=>['divider'=>true]]),
   'divider_color'=>$this->ctrl('color',__('Color', 'sidcraft-page-builder'),'style',$div,['condition'=>['divider'=>true]]),
   'divider_width'=>$this->ctrl('text',__('Width', 'sidcraft-page-builder'),'style',$div,['condition'=>['divider'=>true]]),
  ];
 }
 public function render($s,$children=''){
  $layout=($s['list_layout']??'traditional')==='inline'?'inline':'traditional';
  $align=in_array($s['icon_align']??'left',['left','center','right'],true)?$s['icon_align']:'left';
  $dstyle=in_array($s['divider_style']??'solid',['solid','double','dotted','dashed'],true)?$s['divider_style']:'solid';
  $vars=$this->style_attr(['--lb-list-gap'=>$this->unit($s['space_between']??''),'--lb-list-icon-size'=>$this->unit($s['icon_size']??''),'--lb-list-icon-color'=>$s['icon_color']??($s['color']??''),'--lb-list-icon-hover'=>$s['icon_hover_color']??'','--lb-list-text-color'=>$s['text_color']??'','--lb-list-text-hover'=>$s['text_hover_color']??'','--lb-list-indent'=>$this->unit($s['text_indent']??''),'--lb-list-divider-style'=>$dstyle,'--lb-list-divider-weight'=>$this->unit($s['divider_weight']??''),'--lb-list-divider-color'=>$s['divider_color']??'','--lb-list-divider-width'=>sanitize_text_field((string)($s['divider_width']??''))]);
  $t=($s['link_target']??'_self')==='_blank'?' target="_blank" rel="noopener"':'';
  $out='<ul class="'.$this->cls($s).' lb-icon-list lb-icon-list-'.$layout.' lb-icon-list-align-'.$align.(!empty($s['divider'])?' lb-icon-list-divided':'').'"'.$vars.'>';
  foreach($this->repeater_items($s['items']??'',['text','icon','url']) as $row){
   $text=(string)($row['text']??$row[0]??''); $icon=trim((string)($row['icon']??$row[1]??''))!==''?(string)($row['icon']??$row[1]):($s['icon']??'check'); $url=(string)($row['url']??$row[2]??'');
   $inner='<span class="lb-icon-list-icon" aria-hidden="true">'.\SidcraftPageBuilder\Utils\Icons::svg($icon).'</span><span class="lb-icon-list-text">'.wp_kses_post($text).'</span>';
   $out.='<li class="lb-icon-list-item">'.($url!==''?'<a href="'.esc_attr(self::link_href($url)).'"'.$t.'>'.$inner.'</a>':$inner).'</li>';
  }
  return $out.'</ul>';
 }
}
