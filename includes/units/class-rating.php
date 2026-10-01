<?php
namespace SidcraftPageBuilder\Units;
if(!defined('ABSPATH')) exit;
class Rating extends Unit {
 public function type(){return 'rating';} public function title(){return __('Rating', 'sidcraft-page-builder');} public function icon(){return "\u{2606}";} public function category(){return 'content';}
 public function defaults(){return ['rating'=>4.5,'max'=>5,'label'=>'','icon'=>"\u{2605}",'empty_icon'=>"\u{2606}",'color'=>'#f4b400','size'=>22,'css_class'=>''];}
 public function controls(){return ['rating'=>'number','max'=>'number','label'=>'text','icon'=>'text','empty_icon'=>'text','color'=>'color','size'=>'number','css_class'=>'text'];}
 public function render($s,$children=''){ $max=max(1,min(10,absint($s['max']??5)));$r=max(0,min($max,floatval($s['rating']??0)));$full=(int)floor($r);$half=($r-$full)>=.5;$stars=str_repeat((string)($s['icon']??"\u{2605}"),$full).($half?"\u{BD}":'').str_repeat((string)($s['empty_icon']??"\u{2606}"),max(0,$max-$full-($half?1:0)));return '<div class="'.$this->cls($s).' lb-rating" style="font-size:'.absint($s['size']??22).'px;color:'.esc_attr($s['color']??'#f4b400').';" role="img" aria-label="'.esc_attr(sprintf('Rating %.1f out of %d',$r,$max)).'">'.esc_html($stars).(!empty($s['label'])?' <span>'.esc_html($s['label']).'</span>':'').'</div>'; }
}
