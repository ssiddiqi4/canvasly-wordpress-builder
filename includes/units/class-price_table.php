<?php
namespace SidcraftPageBuilder\Units; if(!defined('ABSPATH')) exit;
class PriceTable extends Unit {
 public function type(){return 'price_table';} public function title(){return __('Price Table', 'sidcraft-page-builder');} public function icon(){return '$';} public function category(){return 'basic';}
 public function uses_button(){return true;}
 public function keywords(){return ['price','pricing','table','plan','features'];}
 public function defaults(){return [
  'title'=>'Professional','price'=>'49','period'=>'/month',
  'features'=>[
   ['_id'=>'pf1','text'=>'Feature one','icon'=>''],
   ['_id'=>'pf2','text'=>'Feature two','icon'=>''],
   ['_id'=>'pf3','text'=>'Feature three','icon'=>''],
  ],
  'button'=>'Get Started','url'=>'#',
  'align'=>'center',
  'button_background'=>'#222222','button_text_color'=>'#ffffff',
 ];}
 public function controls(){
  $plan=__('Price Table', 'sidcraft-page-builder');
  $header=__('Header', 'sidcraft-page-builder');
  $pricing=__('Pricing', 'sidcraft-page-builder');
  $features=__('Features', 'sidcraft-page-builder');
  $button=__('Button', 'sidcraft-page-builder');
  $hover=__('Button Hover', 'sidcraft-page-builder');
  $box=__('Box', 'sidcraft-page-builder');
  $root='{{WRAPPER}} .lb-price-table';
  $title=$root.' h3';
  $amount=$root.' .lb-price strong';
  $period=$root.' .lb-price span';
  $list=$root.' li';
  $icon=$root.' .lb-price-feature-icon';
  $btn=$root.'>a';
  return [
   'title'=>$this->ctrl('text',__('Title', 'sidcraft-page-builder'),'content',$plan),
   'price'=>$this->ctrl('text',__('Price', 'sidcraft-page-builder'),'content',$plan),
   'period'=>$this->ctrl('text',__('Period', 'sidcraft-page-builder'),'content',$plan),
   'features'=>$this->ctrl('repeater',__('Features', 'sidcraft-page-builder'),'content',$plan,[
    'title_field'=>'{{text}}',
    'fields'=>[
     'text'=>$this->field('text',__('Text', 'sidcraft-page-builder')),
     'icon'=>$this->field('icon',__('Icon', 'sidcraft-page-builder')),
    ],
   ]),
   'button'=>$this->ctrl('text',__('Button Text', 'sidcraft-page-builder'),'content',$plan),
   'url'=>$this->ctrl('url',__('Button Link', 'sidcraft-page-builder'),'content',$plan),
   'align'=>$this->ctrl('choose',__('Alignment', 'sidcraft-page-builder'),'style',$box,['options'=>self::opt_align(),'selectors'=>[$root=>'text-align: {{VALUE}};']]),
   'table_background'=>$this->ctrl('color',__('Background', 'sidcraft-page-builder'),'style',$box,['selectors'=>[$root=>'background: {{VALUE}};']]),
   'title_color'=>$this->ctrl('color',__('Title Color', 'sidcraft-page-builder'),'style',$header,['selectors'=>[$title=>'color: {{VALUE}};']]),
   'title_typography'=>$this->ctrl('typography',__('Title Typography', 'sidcraft-page-builder'),'style',$header,['selectors'=>[$title=>'{{VALUE}}']]),
   'price_color'=>$this->ctrl('color',__('Price Color', 'sidcraft-page-builder'),'style',$pricing,['selectors'=>[$amount=>'color: {{VALUE}};']]),
   'price_typography'=>$this->ctrl('typography',__('Price Typography', 'sidcraft-page-builder'),'style',$pricing,['selectors'=>[$amount=>'{{VALUE}}']]),
   'period_color'=>$this->ctrl('color',__('Period Color', 'sidcraft-page-builder'),'style',$pricing,['selectors'=>[$period=>'color: {{VALUE}};']]),
   'period_typography'=>$this->ctrl('typography',__('Period Typography', 'sidcraft-page-builder'),'style',$pricing,['selectors'=>[$period=>'{{VALUE}}']]),
   'feature_color'=>$this->ctrl('color',__('Text Color', 'sidcraft-page-builder'),'style',$features,['selectors'=>[$list=>'color: {{VALUE}};']]),
   'feature_typography'=>$this->ctrl('typography',__('Typography', 'sidcraft-page-builder'),'style',$features,['selectors'=>[$list=>'{{VALUE}}']]),
   'feature_icon_color'=>$this->ctrl('color',__('Icon Color', 'sidcraft-page-builder'),'style',$features,['selectors'=>[$icon=>'color: {{VALUE}};']]),
   'button_background'=>$this->ctrl('color',__('Background', 'sidcraft-page-builder'),'style',$button,['default'=>'#222222','selectors'=>[$btn=>'background: {{VALUE}};',$root=>'--lb-price-btn: {{VALUE}};']]),
   'button_text_color'=>$this->ctrl('color',__('Text Color', 'sidcraft-page-builder'),'style',$button,['default'=>'#ffffff','selectors'=>[$btn=>'color: {{VALUE}};',$root=>'--lb-price-btn-text: {{VALUE}};']]),
   'button_typography'=>$this->ctrl('typography',__('Typography', 'sidcraft-page-builder'),'style',$button,['selectors'=>[$btn=>'{{VALUE}}']]),
   'button_padding'=>$this->ctrl('dimensions',__('Padding', 'sidcraft-page-builder'),'style',$button,['selectors'=>[$btn=>'padding: {{VALUE}};']]),
   'button_border_radius'=>$this->ctrl('slider',__('Border Radius', 'sidcraft-page-builder'),'style',$button,['units'=>['px','%'],'range'=>['min'=>0,'max'=>80],'selectors'=>[$btn=>'border-radius: {{SIZE}}{{UNIT}};']]),
   'button_hover_background'=>$this->ctrl('color',__('Background', 'sidcraft-page-builder'),'style',$hover,['selectors'=>[$btn.':hover'=>'background: {{VALUE}};',$root=>'--lb-price-btn-hover: {{VALUE}};']]),
   'button_hover_color'=>$this->ctrl('color',__('Text Color', 'sidcraft-page-builder'),'style',$hover,['selectors'=>[$btn.':hover'=>'color: {{VALUE}};',$root=>'--lb-price-btn-hover-text: {{VALUE}};']]),
  ];
 }
 public function render($s,$children=''){
  $items='';
  foreach($this->repeater_items($s['features']??'',['text','icon']) as $row){
   $text=trim((string)($row['text']??$row[0]??'')); if($text==='')continue;
   $icon=trim((string)($row['icon']??$row[1]??''));
   $glyph=$icon!==''?'<span class="lb-price-feature-icon" aria-hidden="true">'.\SidcraftPageBuilder\Utils\Icons::svg($icon).'</span>':'';
   $items.='<li>'.$glyph.esc_html($text).'</li>';
  }
  $paint=function($v,$fallback){
   $v=trim((string)$v);
   if($v!==''&&preg_match('/^(#[0-9a-f]{3,8}|rgba?\([^)]{1,80}\)|hsla?\([^)]{1,80}\)|var\(--[a-z0-9_-]+\))$/i',$v))return $v;
   return $fallback;
  };
  $bg=$paint($s['button_background']??'','#222222');
  $fg=$paint($s['button_text_color']??'','#ffffff');
  $style='--lb-price-btn:'.esc_attr($bg).';--lb-price-btn-text:'.esc_attr($fg).';';
  return '<div class="'.$this->cls($s).' lb-price-table" style="'.$style.'"><h3>'.esc_html($s['title']??'').'</h3><div class="lb-price"><strong>'.esc_html($s['price']??'').'</strong><span>'.esc_html($s['period']??'').'</span></div><ul>'.$items.'</ul><a href="'.esc_attr(self::link_href($s['url']??'#')).'" style="background:'.esc_attr($bg).';color:'.esc_attr($fg).';">'.esc_html($s['button']??'').'</a></div>';
 }
}
