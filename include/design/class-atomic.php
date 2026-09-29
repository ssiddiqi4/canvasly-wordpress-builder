<?php
namespace CanvaslyLite\Design;
if(!defined('ABSPATH')) exit;
class Atomic {
 /** XEditor catalog (the former "Atomic" catalog). Keys are real, registered unit types. */
 public static function types(){if(class_exists('\\CanvaslyLite\\XEditor\\XEditorEngine')){$o=[];foreach(\CanvaslyLite\XEditor\XEditorEngine::menu() as $r)$o[$r['type']]=$r['title'];return $o;}return ['container'=>'Container','grid'=>'Grid','heading'=>'Heading','text'=>'Paragraph','image'=>'Image','button'=>'Button','icon'=>'Icon','spacer'=>'Spacer','divider'=>'Divider','video'=>'Video','icon_box'=>'Icon Box','image_box'=>'Image Box'];}
 public static function is($type){return isset(self::types()[sanitize_key($type)]);}
 public static function normalize($node){$n=(array)$node;$n['type']=sanitize_key($n['type']??'xe_div_block');if($n['type']==='div_block')$n['type']='xe_div_block';if($n['type']==='flexbox')$n['type']='xe_flexbox';$n['settings']=is_array($n['settings']??null)?$n['settings']:[];$n['styles']=is_array($n['styles']??null)?$n['styles']:[];$n['interactions']=is_array($n['interactions']??null)?$n['interactions']:[];$n['editor_settings']=is_array($n['editor_settings']??null)?$n['editor_settings']:[];$n['atomic']=self::is($n['type']);if(isset($n['children']))$n['children']=array_map([self::class,'normalize'],(array)$n['children']);return $n;}
 public static function migrate_document($doc){$d=(array)$doc;$d['atomic']=true;$d['atomic_version']='2.0';$walk=function(&$nodes)use(&$walk){foreach($nodes as &$n){$n=self::normalize($n);if(!empty($n['children']))$walk($n['children']);}};$root=$d['root']??[];$walk($root);$d['root']=$root;return $d;}
 public static function css_first_defaults(){return ['class_mode'=>'inherit','style_source'=>'class-first','variable_mode'=>'tokens'];}
}
