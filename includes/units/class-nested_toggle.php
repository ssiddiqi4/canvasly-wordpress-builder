<?php
namespace SidcraftSyntex\Units; if(!defined('ABSPATH')) exit;
/** Nested Toggle: Nested Accordion where every panel can be opened independently. */
class NestedToggle extends NestedAccordion {
 public function type(){return 'nested_toggle';}
 public function title(){return __('Nested Toggle', 'sidcraft-syntex');}
 public function icon(){return "\u{229E}";}
 public function category(){return 'basic';}
 public function keywords(){return ['toggle','nested','collapse','expand','panel','slot'];}
 protected function single_open(){return false;}
 protected function root_class(){return 'lb-toggle lb-nested-toggle';}
 public function defaults(){
  $d=parent::defaults();
  $d['items']=[
   ['_id'=>'tog1','title'=>'Toggle Item 1'],
   ['_id'=>'tog2','title'=>'Toggle Item 2'],
  ];
  $d['icon']='plus'; $d['active_icon']='minus'; $d['space_between']=10; $d['first_open']=false;
  return $d;
 }
}
