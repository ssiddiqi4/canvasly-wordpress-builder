<?php
namespace SidcraftPageBuilder\Design;
if(!defined('ABSPATH')) exit;
class GlobalClasses {
 const KEY='sidcraft_page_builder_global_classes';
 public static function all(){
  $raw=get_option(self::KEY,[]); if(!is_array($raw))return [];
  $out=[];
  foreach($raw as $name=>$data){$name=sanitize_title($name);if(!$name)continue;$out[$name]=self::normalize($data);}
  return $out;
 }
 public static function get($name){$all=self::all();$name=sanitize_title($name);return $all[$name]??null;}
 private static function normalize($data){
  if(is_string($data)) return ['base'=>self::clean($data),'hover'=>'','focus'=>'','active'=>'','focus_visible'=>'','extends'=>[],'description'=>''];
  $d=is_array($data)?$data:[];
  $out=['base'=>self::clean($d['base']??($d['css']??'')),'hover'=>self::clean($d['hover']??''),'focus'=>self::clean($d['focus']??''),'active'=>self::clean($d['active']??''),'focus_visible'=>self::clean($d['focus_visible']??''),'extends'=>[],'description'=>sanitize_text_field($d['description']??'')];
  foreach((array)($d['extends']??[]) as $x){$x=sanitize_title($x);if($x)$out['extends'][]=$x;}
  $out['extends']=array_values(array_unique($out['extends']));
  return $out;
 }
 // Global classes held raw CSS, which WordPress.org does not allow plugins to store. Saving is
 // disabled and nothing is printed; XEditor classes (structured properties) replace them.
 public static function save($name,$css,$extends=[],$description=''){
  return new \WP_Error('sidsyn_global_classes_removed',__('Global classes with custom CSS are no longer supported. Use XEditor classes instead.', 'sidcraft-page-builder'),['status'=>410]);
 }
 public static function delete($name){if(!current_user_can('sidcraft_page_builder_design'))return false;$all=self::all();unset($all[sanitize_title($name)]);foreach($all as $n=>$d){$d=self::normalize($d);$d['extends']=array_values(array_diff($d['extends'],[sanitize_title($name)]));$all[$n]=$d;}update_option(self::KEY,$all,false);return true;}
 private static function clean($css){$css=is_array($css)?'':(string)$css;return preg_replace('/<[^>]*>|expression\s*\(|javascript\s*:/i','',wp_strip_all_tags($css));}
 private static function would_cycle($name,$parents,$all,$seen=[]){
  $name=sanitize_title($name);if(isset($seen[$name]))return true;$seen[$name]=true;
  foreach((array)$parents as $p){$p=sanitize_title($p);if(!$p)continue;if($p===$name)return true;$d=$all[$p]??null;if($d&&self::would_cycle($p,(array)($d['extends']??[]),$all,$seen))return true;}
  return false;
 }
 private static function inherited($name,&$seen=[]){$all=self::all();$name=sanitize_title($name);if(isset($seen[$name]))return [];$seen[$name]=true;$d=$all[$name]??null;if(!$d)return [];$out=[];foreach((array)$d['extends'] as $parent){foreach(self::inherited($parent,$seen) as $k=>$v)$out[$k]=($out[$k]??'').$v;}$out[$name]=$d;return $out;}
 public static function css(){return '';}
 public static function usage($doc){$u=[];$walk=function($nodes)use(&$walk,&$u){foreach((array)$nodes as $n){$s=(array)($n['settings']??[]);foreach(preg_split('/[\s,]+/',trim((string)($s['global_class']??''))) as $c)if($c)$u[sanitize_title($c)]=($u[sanitize_title($c)]??0)+1;if(!empty($n['children']))$walk($n['children']);}};$walk($doc['root']??[]);return $u;}
 public static function resolve_classes($names){$all=self::all();$seen=[];$out=[];$walk=function($name)use(&$walk,&$all,&$seen,&$out){$name=sanitize_title($name);if(!$name||isset($seen[$name]))return;$seen[$name]=true;if(!isset($all[$name]))return;foreach((array)$all[$name]['extends'] as $p)$walk($p);$out[]=$name;};foreach((array)$names as $n)$walk($n);return $out;}
}
