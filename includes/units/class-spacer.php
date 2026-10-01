<?php
namespace SidcraftSyntex\Units; if(!defined('ABSPATH')) exit;
class Spacer extends Unit {
 public function type(){return 'spacer';} public function title(){return __('Spacer', 'sidcraft-syntex');} public function icon(){return "\u{2195}";} public function category(){return 'basic';}
 public function defaults(){return ['height'=>40];} public function controls(){return ['height'=>'number'];}
 public function render($s,$children=''){ return '<div class="lb-spacer" style="height:'.max(0,floatval($s['height']??40)).'px"></div>'; }
}
