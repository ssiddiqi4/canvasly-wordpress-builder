<?php
namespace SidcraftPageBuilder\Document;
use SidcraftPageBuilder\Units\UnitRegistry;
use SidcraftPageBuilder\Controls\Controls;
use SidcraftPageBuilder\Controls\Groups;
use SidcraftPageBuilder\Controls\Code;
use SidcraftPageBuilder\Utils\JsonCache;
use SidcraftPageBuilder\Utils\Style;
if(!defined('ABSPATH')) exit;
class DocumentManager {
 const META='_sidsyn_document_data', VERSION='_sidsyn_document_version', UPDATED='_sidsyn_document_updated', REVISIONS='_sidsyn_document_revisions', CSS_CACHE='_sidsyn_css_cache', AUTOSAVE='_sidsyn_autosave_data', SCHEMA='2.8';
 const PAGE_TEMPLATES=['default','full_width','canvas'];
 /** @var array<int,array> */
 private static $loaded=[];
 public static function empty(){return ['version'=>self::SCHEMA,'root'=>[],'header'=>[],'footer'=>[],'settings'=>[]];}
 /** Sanitize a document array the same way save() does, without writing it. Used by the layout-schema API. */
 public static function sanitize($data){return self::sanitize_tree(is_array($data)?$data:[]);}
 public static function flush_runtime($id=0){
  $id=absint($id);
  if($id){unset(self::$loaded[$id]);return;}
  self::$loaded=[];
 }
 /**
  * True when post `$id` stores Sidcraft Page Builder document meta (cheap; does not decode JSON).
  */
 public static function has($id){
  $id=absint($id);
  if(!$id)return false;
  if(isset(self::$loaded[$id])){$d=self::$loaded[$id];return !empty($d['root'])||!empty($d['header'])||!empty($d['footer']);}
  $raw=get_post_meta($id,self::META,true);
  if(!$raw && function_exists('get_post_type') && get_post_type($id)==='sidsyn_template'){
   $raw=get_post_meta($id,'_sidsyn_template_data',true);
  }
  return !empty($raw);
 }
 /**
  * Document shown in the editor.
  *
  * A page that was built in Elementor and has no Sidcraft Page Builder nodes yet - missing
  * meta, or an empty document left by a blank canvas - would otherwise open
  * under the theme header with nothing in the middle. Preview the conversion
  * without writing until the user saves.
  *
  * @param int $id
  * @return array
  */
 public static function for_editor($id){
  $id=absint($id);
  $doc=self::get($id);
  if(self::has_nodes($doc))return $doc;
  // An empty Sidcraft Page Builder document (the editor autosaved a blank canvas, or a
  // conversion was only previewed) must not hide a layout that can still be
  // read from the source builder. Preview it without writing.
  if(!class_exists('\\SidcraftPageBuilder\\Convert\\Converter'))return $doc;
  if(!\SidcraftPageBuilder\Convert\Converter::has_source($id))return $doc;
  $conv=new \SidcraftPageBuilder\Convert\Converter();
  $preview=$conv->convert_post($id,array('dry_run'=>true));
  if(is_wp_error($preview)||empty($preview['document'])||!is_array($preview['document']))return $doc;
  $next=$preview['document'];
  if(!self::has_nodes($next))return $doc;
  return $next;
 }
 private static function has_nodes($doc){
  if(!is_array($doc))return false;
  foreach(array('root','header','footer') as $part){
   if(!empty($doc[$part])&&is_array($doc[$part]))return true;
  }
  return false;
 }
 public static function get($id){
  $id=absint($id);
  if(!$id)return self::empty();
  if(isset(self::$loaded[$id]))return self::$loaded[$id];
  $raw=get_post_meta($id,self::META,true);
  if(!$raw && function_exists('get_post_type') && get_post_type($id)==='sidsyn_template'){
   $raw=get_post_meta($id,'_sidsyn_template_data',true);
  }
  if(!$raw)return self::$loaded[$id]=self::empty();
  $d=self::decode_stored($raw);
  return self::$loaded[$id]=is_array($d)?self::migrate($d):self::empty();
 }
 /**
  * Decode document JSON. A value WordPress stored after unslashing \" sequences
  * is repaired when that still yields an array; otherwise the caller treats it
  * as empty and the editor can preview the source layout again.
  *
  * @param mixed $raw
  * @return array|null
  */
 private static function decode_stored($raw){
  if(is_array($raw))return $raw;
  $d=class_exists(JsonCache::class)?JsonCache::decode($raw,null):(is_string($raw)?json_decode($raw,true):null);
  if(is_array($d))return $d;
  if(!is_string($raw)||$raw===''||!class_exists('\\SidcraftPageBuilder\\Compatibility\\Meta'))return null;
  $fixed=\SidcraftPageBuilder\Compatibility\Meta::repair_json($raw);
  if(!is_string($fixed)||$fixed===$raw)return null;
  $d=class_exists(JsonCache::class)?JsonCache::decode($fixed,null):json_decode($fixed,true);
  return is_array($d)?$d:null;
 }
 /**
  * Store a JSON string. update_post_meta() runs wp_unslash(), which turns
  * \" inside document JSON into a bare quote and makes the next read fail.
  * The editor then previews the Elementor source again, so units added after
  * import never reappear.
  *
  * @param int    $id
  * @param string $key
  * @param mixed  $value JSON string or array.
  * @return bool
  */
 public static function write_json_meta($id,$key,$value){
  if(is_array($value))$value=function_exists('wp_json_encode')?wp_json_encode($value):json_encode($value);
  if(class_exists('\\SidcraftPageBuilder\\Compatibility\\Meta'))return \SidcraftPageBuilder\Compatibility\Meta::write($id,$key,$value);
  if(is_string($value)&&function_exists('wp_slash'))$value=wp_slash($value);
  return (bool) update_post_meta($id,$key,$value);
 }
 public static function migrate($d){
  $v=(string)($d['version']??'1.0');
  if(version_compare($v,'2.1','<')){$d['settings']=is_array($d['settings']??null)?$d['settings']:[];$d['atomic']=!empty($d['atomic']);}
  if(version_compare($v,'2.2','<')){
   $root=is_array($d['root']??null)?$d['root']:[];
   self::walk_migrate_repeaters($root);
   $d['root']=$root;
  }
  if(version_compare($v,'2.3','<')){
   $d['settings']=is_array($d['settings']??null)?$d['settings']:[];
   $d['settings']['template']=self::normalize_page_template($d['settings']['template']??'default');
  }
  if(version_compare($v,'2.4','<')){
   $root=is_array($d['root']??null)?$d['root']:[];
   self::walk_migrate_breakpoints($root);
   $d['root']=$root;
  }
  // 2.5: optional `slot` on children of slot-aware units (nested tabs/accordion/toggle).
  // Legacy text-only widgets are unchanged; conversion is a user action in the editor.
  if(version_compare($v,'2.6','<')){
   $root=is_array($d['root']??null)?$d['root']:[];
   self::walk_migrate_groups($root);
   $d['root']=$root;
  }
  if(version_compare($v,'2.7','<')){
   $root=is_array($d['root']??null)?$d['root']:[];
   self::walk_migrate_dynamic($root);
   $d['root']=$root;
  }
  if(version_compare($v,'2.8','<')){
   $root=is_array($d['root']??null)?$d['root']:[];
   self::walk_migrate_interactions($root);
   $d['root']=$root;
  }
  $d['version']=self::SCHEMA;
  return $d;
 }
 /**
  * Write a migrated document back to post meta without a revision or capability check.
  * Used by background upgrades (Roadmap 7.4). Returns true when meta changed.
  *
  * @param int $id
  * @return bool
  */
 public static function persist_migrated($id){
  $id=absint($id);
  if(!$id)return false;
  $raw=get_post_meta($id,self::META,true);
  $pt=function_exists('get_post_type')?(string)get_post_type($id):'';
  if(!$raw && $pt==='sidsyn_template')$raw=get_post_meta($id,'_sidsyn_template_data',true);
  if(!$raw && $pt==='sidsyn_component')$raw=get_post_meta($id,'_sidsyn_component_data',true);
  if(!$raw)return false;
  $d=class_exists(JsonCache::class)?JsonCache::decode($raw,null):(is_array($raw)?$raw:json_decode((string)$raw,true));
  if(!is_array($d))return false;
  $from=(string)($d['version']??'1.0');
  $migrated=self::migrate($d);
  $to=(string)($migrated['version']??self::SCHEMA);
  $plugin=(string)get_post_meta($id,self::VERSION,true);
  $current=defined('SIDCRAFT_PAGE_BUILDER_VERSION')?SIDCRAFT_PAGE_BUILDER_VERSION:'';
  if($from===$to && $from===self::SCHEMA && $plugin===$current)return false;
  $json=function_exists('wp_json_encode')?wp_json_encode($migrated):json_encode($migrated);
  $keys=array(self::META);
  if($pt==='sidsyn_template')$keys[]='_sidsyn_template_data';
  if($pt==='sidsyn_component')$keys[]='_sidsyn_component_data';
  $keys=array_values(array_unique($keys));
  foreach($keys as $key){
   if(class_exists('\\SidcraftPageBuilder\\Compatibility\\Meta'))\SidcraftPageBuilder\Compatibility\Meta::write($id,$key,$json);
   else update_post_meta($id,$key,$json);
  }
  update_post_meta($id,self::VERSION,$current);
  if(function_exists('current_time'))update_post_meta($id,self::UPDATED,current_time('mysql'));
  delete_post_meta($id,self::CSS_CACHE);
  if(class_exists('\\SidcraftPageBuilder\\Design\\Performance'))\SidcraftPageBuilder\Design\Performance::invalidate($id);
  self::$loaded[$id]=$migrated;
  return true;
 }
 /** Normalize a document `template` setting to default | full_width | canvas. */
 public static function normalize_page_template($value){
  $t=sanitize_key((string)$value);
  return in_array($t,self::PAGE_TEMPLATES,true)?$t:'default';
 }
 /** Walk settings and keep only named breakpoint keys on responsive maps. */
 private static function walk_migrate_breakpoints(&$nodes){
  foreach($nodes as &$n){
   if(!is_array($n))continue;
   if(isset($n['settings'])&&is_array($n['settings'])){
    foreach($n['settings'] as $k=>$val){
     if(is_array($val)&&\SidcraftPageBuilder\Settings\Breakpoints::is_map($val))$n['settings'][$k]=\SidcraftPageBuilder\Settings\Breakpoints::migrate_map($val);
    }
   }
   if(!empty($n['children'])&&is_array($n['children']))self::walk_migrate_breakpoints($n['children']);
  }
  unset($n);
 }
 /** Walk settings and convert free-text transform/filter/shadow/transition/gradient fields. */
 private static function walk_migrate_groups(&$nodes){
  foreach($nodes as &$n){
   if(!is_array($n))continue;
   if(isset($n['settings'])&&is_array($n['settings'])&&class_exists(Groups::class))$n['settings']=Groups::migrate_settings($n['settings']);
   if(!empty($n['children'])&&is_array($n['children']))self::walk_migrate_groups($n['children']);
  }
  unset($n);
 }
 /** Fold legacy settings.interaction* into node.interactions[]. */
 private static function walk_migrate_interactions(&$nodes){
  if(class_exists('\\SidcraftPageBuilder\\Design\\Interactions'))\SidcraftPageBuilder\Design\Interactions::migrate_tree($nodes);
 }
 /** Walk settings and convert legacy dynamic_key maps into per-control `_dynamic` bindings. */
 private static function walk_migrate_dynamic(&$nodes){
  foreach($nodes as &$n){
   if(!is_array($n))continue;
   if(isset($n['settings'])&&is_array($n['settings'])&&class_exists('\\SidcraftPageBuilder\\Dynamic\\Resolver'))$n['settings']=\SidcraftPageBuilder\Dynamic\Resolver::migrate_settings($n['settings'],sanitize_key($n['type']??''));
   if(!empty($n['children'])&&is_array($n['children']))self::walk_migrate_dynamic($n['children']);
  }
  unset($n);
 }
 /** Walk a node list and convert legacy pipe-delimited repeater strings. */
 private static function walk_migrate_repeaters(&$nodes){
  foreach($nodes as &$n){
   if(!is_array($n))continue;
   $type=sanitize_key($n['type']??'');
   if(isset($n['settings'])&&is_array($n['settings']))$n['settings']=self::migrate_node_settings($type,$n['settings']);
   if(!empty($n['children'])&&is_array($n['children']))self::walk_migrate_repeaters($n['children']);
  }
  unset($n);
 }
 public static function save($id,$data){
  if(!current_user_can('edit_post',$id))return new \WP_Error('forbidden',__('You cannot edit this document.', 'sidcraft-page-builder'));
  if(class_exists(Revisions::class))Revisions::migrate_legacy($id);
  $data=is_array($data)?$data:[];
  /** Fires before a document is sanitized and saved. @param int $id @param array $data Raw incoming document. */
  do_action('sidcraft-page-builder/document/before_save',$id,$data);
  /** Filter the raw document before sanitization. Return an array. */
  $filtered=apply_filters('sidcraft-page-builder/document/save_data',$data,$id);
  if(is_array($filtered))$data=$filtered;
  $clean=self::sanitize_tree($data);
  $old=self::get($id);
  $json=wp_json_encode($clean);
  self::write_json_meta($id,self::META,$json);
  if(function_exists('get_post_type')&&get_post_type($id)==='sidsyn_template')self::write_json_meta($id,'_sidsyn_template_data',$json);
  update_post_meta($id,self::VERSION,SIDCRAFT_PAGE_BUILDER_VERSION);update_post_meta($id,self::UPDATED,current_time('mysql'));delete_post_meta($id,self::CSS_CACHE);delete_post_meta($id,self::AUTOSAVE);
  if(class_exists(Revisions::class)){Revisions::record($id,__('Saved', 'sidcraft-page-builder'));Revisions::delete_autosave($id);}
  elseif(!empty($old['root']))self::record_revision($id,$old);
  if(class_exists('SidcraftPageBuilder\Design\Performance'))\SidcraftPageBuilder\Design\Performance::invalidate($id);
  self::$loaded[$id]=$clean;
  /** Fires after a document has been saved. @param int $id @param array $clean Sanitized document. @param array $old Previous document. */
  do_action('sidcraft-page-builder/document/after_save',$id,$clean,$old);
  return $clean;
 }
 private static function sanitize_tree($data){$out=['version'=>self::SCHEMA,'root'=>[],'header'=>[],'footer'=>[],'settings'=>[]];$out['settings']=is_array($data['settings']??null)?self::sanitize_settings($data['settings']):[];foreach(['root','header','footer'] as $part){foreach((array)($data[$part]??[]) as $n){$x=self::sanitize_node($n);if($x)$out[$part][]=$x;}}if(class_exists(DevMode::class))$out=DevMode::sanitize_document($out);return $out;}
 private static function sanitize_settings($s){$o=[];foreach($s as $k=>$v){$k=sanitize_key($k);if(in_array($k,['title','body_class','page_width'],true))$o[$k]=sanitize_text_field((string)$v);elseif($k==='template')$o[$k]=self::normalize_page_template($v);elseif($k==='custom_css'){$c=\SidcraftPageBuilder\Design\CustomCssHooks::sanitize($v);if($c!=='')$o[$k]=$c;}elseif(is_bool($v)||is_numeric($v))$o[$k]=$v;}return $o;}
 private static function sanitize_node($n){if(!is_array($n))return null;$type=sanitize_key($n['type']??'');$e=UnitRegistry::instance()->get($type);if(!$e)return null;$id=preg_replace('/[^a-zA-Z0-9_-]/','',substr((string)($n['id']??''),0,40));if(!$id)$id='n_'.wp_generate_uuid4();$in=self::migrate_node_settings($type,is_array($n['settings']??null)?$n['settings']:[]);$safe=[];foreach($e->get_defaults() as $k=>$v)$safe[$k]=$v;$controls=$e->all_controls();foreach($in as $k=>$v){$k=sanitize_key($k);if($k==='_dynamic')continue;if(array_key_exists($k,$controls))$safe[$k]=self::sanitize_control($controls[$k],$v,$k,$in);} if(class_exists('\\SidcraftPageBuilder\\Dynamic\\Resolver')){$dyn=\SidcraftPageBuilder\Dynamic\Resolver::sanitize_map($in['_dynamic']??[],$controls);if($dyn)$safe['_dynamic']=$dyn;} $o=['id'=>$id,'type'=>$type,'atomic'=>!empty($n['atomic'])||\SidcraftPageBuilder\Design\Atomic::is($type),'settings'=>$safe,'styles'=>self::sanitize_style_map($n['styles']??[]),'interactions'=>self::sanitize_interactions($n['interactions']??[],$in),'editor_settings'=>self::sanitize_settings($n['editor_settings']??[])];if($type==='gallery'&&($safe['mode']??'')==='multiple'){$merged=[];foreach((array)($safe['collections']??[]) as $c){foreach(preg_split('/[,\s]+/',(string)($c['ids']??'')) as $one){$aid=absint($one);if($aid)$merged[]=$aid;}}if($merged)$safe['ids']=implode(',',array_values(array_unique($merged)));$o['settings']=$safe;}if($type==='carousel'&&!empty($safe['slides'])&&is_array($safe['slides'])){$ids=[];foreach($safe['slides'] as $slide){$aid=absint($slide['image_id']??0);if($aid)$ids[]=$aid;}if($ids)$safe['ids']=implode(',',$ids);$o['settings']=$safe;}if(isset($n['exposed'])&&is_array($n['exposed']))$o['exposed']=array_map('sanitize_key',$n['exposed']);if($e->supports_children()){$o['children']=[];$slotted=method_exists($e,'supports_slots')&&$e->supports_slots();foreach((array)($n['children']??[]) as $raw){if(!is_array($raw))continue;$slot=$raw['slot']??'';$c=self::sanitize_node($raw);if(!$c)continue;if($slotted){$slot=preg_replace('/[^a-zA-Z0-9_-]/','',substr((string)$slot,0,40));if($slot!=='')$c['slot']=$slot;}$o['children'][]=$c;}}return $o;}

 private static function sanitize_style_map($styles){$out=[];foreach((array)$styles as $state=>$vals){$state=sanitize_key($state);if(!in_array($state,['base','hover','focus','active','focus_visible'],true))continue;$out[$state]=[];foreach((array)$vals as $k=>$v){$k=sanitize_key($k);if(is_array($v))$out[$state][$k]=self::sanitize_control('text',$v);else $out[$state][$k]=self::sanitize_control('text',$v);}}return $out;}
 private static function sanitize_interactions($items,$settings=[]){
  if(class_exists('\\SidcraftPageBuilder\\Design\\Interactions')){
   return \SidcraftPageBuilder\Design\Interactions::sanitize(\SidcraftPageBuilder\Design\Interactions::merge_legacy($items,is_array($settings)?$settings:[]));
  }
  $out=[];foreach((array)$items as $item){if(!is_array($item))continue;$out[]=['id'=>sanitize_key($item['id']??''),'kind'=>sanitize_key($item['kind']??'entrance'),'trigger'=>sanitize_key($item['trigger']??'viewport'),'effect'=>sanitize_key($item['effect']??($item['action']??'fade')),'action'=>sanitize_key($item['action']??'fade'),'duration'=>max(0,min(30,floatval($item['duration']??.6))),'delay'=>max(0,min(30,floatval($item['delay']??0))),'easing'=>sanitize_text_field($item['easing']??'ease'),'iteration'=>max(1,min(20,intval($item['iteration']??1))),'repeat'=>!empty($item['repeat']),'threshold'=>max(0,min(1,floatval($item['threshold']??.15))),'exclude'=>[],'keyframes'=>[]];}return $out; // phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- Interaction breakpoint list, not a get_posts() arg.
 }
 /**
  * Sanitize one control value by control type. Types registered in Controls with a sanitizer
  * (add-on types, or core types an add-on overrides) are delegated first; the built-in branches
  * below handle the core types. Unknown types fall back to sanitize_text_field.
  */
 private static function sanitize_control($t,$v,$key='',array $settings=[]){
  $def=is_array($t)?$t:[];
  if(!is_string($t)){ $t=isset($def['type'])?(string)$def['type']:'text'; }
  // Responsive schema values keyed by breakpoint name - sanitize each with the same definition.
  if(!empty($def['responsive'])&&is_array($v)&&\SidcraftPageBuilder\Settings\Breakpoints::is_map($v)){
   $o=[];foreach(\SidcraftPageBuilder\Settings\Breakpoints::names() as $bp){if(array_key_exists($bp,$v))$o[$bp]=self::sanitize_control(array_merge($def,['responsive'=>false]),$v[$bp],$key,$settings);}return $o;
  }
  $controls=class_exists(Controls::class)?Controls::instance():null;
  if($controls&&$controls->has_sanitizer($t))return $controls->sanitize($t,$v,$key,$settings,is_array($def)?$def:[]);
  if(class_exists(Groups::class)&&Groups::handles($t))return Groups::sanitize_type($t,$v);
  if($t==='code'){
   if(class_exists(Code::class))return Code::sanitize($v,$key,$settings,is_array($def)?$def:[]);
   if($key==='html')return wp_kses_post((string)$v);
   if($key==='custom_css')return \SidcraftPageBuilder\Design\CustomCssHooks::sanitize($v);
   return (string)$v;
  }
  if($t==='repeater'){
   $fields=[];
   if(is_array($def['fields']??null)){
    foreach($def['fields'] as $fk=>$fdef){
     $fk=sanitize_key((string)$fk);
     if($fk==='')continue;
     $fields[$fk]=\SidcraftPageBuilder\Units\Unit::normalize_control($fk,$fdef);
    }
   }
   if(is_string($v))$v=self::pipe_to_repeater($v,$fields);
   $out=[];
   foreach((array)$v as $row){
    if(is_string($row))$row=self::pipe_row_to_item($row,array_keys($fields),$fields);
    if(!is_array($row))continue;
    $item=[];
    $rid=preg_replace('/[^a-zA-Z0-9_-]/','',substr((string)($row['_id']??''),0,40));
    if($rid==='')$rid='r_'.wp_generate_uuid4();
    $item['_id']=$rid;
    if($fields){
     foreach($fields as $fk=>$fdef){
      $have=array_key_exists($fk,$row)?$row[$fk]:($fdef['default']??'');
      $item[$fk]=self::sanitize_control($fdef,$have,$fk,$row);
     }
     if(class_exists('\\SidcraftPageBuilder\\Dynamic\\Resolver')){
      $dyn=\SidcraftPageBuilder\Dynamic\Resolver::sanitize_map($row['_dynamic']??[],$fields);
      if($dyn)$item['_dynamic']=$dyn;
     }
    }else{
     foreach($row as $rk=>$rv){
      $rk=sanitize_key((string)$rk);
      if($rk===''||$rk==='_id')continue;
      if($rk==='ids')$item[$rk]=is_array($rv)?implode(',',array_values(array_filter(array_map('absint',$rv)))):preg_replace('/[^0-9,\s]/','',(string)$rv);
      elseif($rk==='label')$item[$rk]=sanitize_text_field((string)$rv);
      else $item[$rk]=is_array($rv)?self::sanitize_control('text',$rv):sanitize_text_field((string)$rv);
     }
    }
    $out[]=$item;
   }
   return $out;
  }
  if($t==='url_map'){
   $o=[];
   foreach((array)$v as $k=>$x){$id=absint($k);if($id)$o[(string)$id]=esc_url_raw((string)$x);}
   return $o;
  }
  if($t==='number_map'){
   $o=[];
   foreach((array)$v as $k=>$x){$id=absint($k);if($id)$o[(string)$id]=(float)$x;}
   return $o;
  }
  if($t==='gallery')return preg_replace('/[^0-9,\s]/','',(string)$v);
  if($t==='media')return absint($v);
  if($t==='icon')return sanitize_text_field((string)$v);
  if(is_array($v)){ $o=[];foreach($v as $k=>$x)$o[sanitize_key((string)$k)]=is_array($x)?self::sanitize_control('text',$x):self::sanitize_control($t,$x);return $o;}
  if($t==='slider'){ $v=trim((string)$v); if($v===''||$v==='auto')return $v; if(!preg_match('/^(-?\d*\.?\d+)\s*([a-z%]*)$/i',$v,$m))return ''; $n=self::clamp_range((float)$m[1],$def); $u=strtolower($m[2]); if(isset($def['units'])&&is_array($def['units'])){ if($def['units']){ if($u!==''&&!in_array($u,$def['units'],true))$u=(string)$def['units'][0]; } else $u=''; } return rtrim(rtrim(number_format($n,4,'.',''),'0'),'.').$u; }
  if($t==='wysiwyg')return wp_kses_post((string)$v);if($t==='textarea')return sanitize_textarea_field((string)$v);if($t==='url')return self::normalize_url($v);if($t==='number')return $v===''?'':self::clamp_range(floatval($v),$def);if($t==='color')return class_exists('\\SidcraftPageBuilder\\Design\\Variables')?\SidcraftPageBuilder\Design\Variables::sanitize_color_value($v):(sanitize_hex_color((string)$v)?:'');if($t==='switch')return !empty($v);if($t==='select')return sanitize_text_field((string)$v);return sanitize_text_field((string)$v);
 }
 /** Keep a typed link when it has no scheme, then run it through esc_url_raw. */
 private static function normalize_url($v){
  $raw=trim((string)$v);
  if($raw===''||$raw==='#')return $raw;
  if(preg_match('/^\s*(javascript|vbscript|data)\s*:/i',$raw))return '';
  if(isset($raw[0])&&$raw[0]==='#')return '#'.ltrim(sanitize_title(substr($raw,1)),'-');
  if(!preg_match('~^(https?:|mailto:|tel:|/|\?)~i',$raw)) $raw='https://'.$raw;
  return esc_url_raw($raw);
 }
 /** Clamp a number to the schema `range` (min/max) when present. */
 private static function clamp_range($n,array $def){
  if(empty($def['range'])||!is_array($def['range']))return $n;
  if(isset($def['range']['min'])&&is_numeric($def['range']['min']))$n=max((float)$def['range']['min'],$n);
  if(isset($def['range']['max'])&&is_numeric($def['range']['max']))$n=min((float)$def['range']['max'],$n);
  return $n;
 }
 public static function revisions($id){
  if(class_exists(Revisions::class))return Revisions::summarize($id);
  $r=get_post_meta($id,self::REVISIONS,true);return is_array($r)?$r:[];
 }
 public static function autosave($id,$doc){
  if(class_exists(Revisions::class))return Revisions::autosave($id,is_array($doc)?$doc:[]);
  if(!current_user_can('edit_post',$id))return false;$clean=self::sanitize_tree($doc);update_post_meta($id,self::AUTOSAVE,['time'=>current_time('mysql'),'document'=>$clean]);return true;
 }
 public static function get_autosave($id){
  if(class_exists(Revisions::class))return Revisions::get_autosave($id);
  $a=get_post_meta($id,self::AUTOSAVE,true);return is_array($a)?$a:null;
 }
 public static function record_revision($id,$doc){
  if(class_exists(Revisions::class))return Revisions::record($id);
  $r=self::revisions($id);$r[]=['time'=>current_time('mysql'),'document'=>$doc];if(count($r)>20)$r=array_slice($r,-20);update_post_meta($id,self::REVISIONS,$r);
 }
 public static function restore_revision($id,$i){
  if(class_exists(Revisions::class))return Revisions::restore($id,(int)$i);
  if(!current_user_can('edit_post',$id))return new \WP_Error('forbidden',__('You cannot edit this document.', 'sidcraft-page-builder'));$r=get_post_meta($id,self::REVISIONS,true);$r=is_array($r)?$r:[];if(!isset($r[$i]))return new \WP_Error('not_found',__('Revision not found.', 'sidcraft-page-builder'));$clean=self::sanitize_tree($r[$i]['document']);self::write_json_meta($id,self::META,wp_json_encode($clean));update_post_meta($id,self::VERSION,SIDCRAFT_PAGE_BUILDER_VERSION);delete_post_meta($id,self::CSS_CACHE);self::$loaded[$id]=$clean;return $clean;
 }
 public static function compiled_css($id){$cached=get_post_meta($id,self::CSS_CACHE,true);if(is_string($cached)&&$cached!=='')return $cached;$d=self::get($id);if(class_exists('\\SidcraftPageBuilder\\Dynamic\\Resolver'))\SidcraftPageBuilder\Dynamic\Resolver::set_context(['post_id'=>absint($id)]);$css=Style::document_css($d);$css.=\SidcraftPageBuilder\Design\CustomCssHooks::page($d['settings']['custom_css']??''); if(class_exists('\\SidcraftPageBuilder\\Dynamic\\Resolver'))\SidcraftPageBuilder\Dynamic\Resolver::set_context([]);if($css)update_post_meta($id,self::CSS_CACHE,$css);return $css;}
 /**
  * Convert legacy pipe-delimited / single-item settings into repeater arrays.
  * Already-array values are left untouched. Called on load (schema 2.2) and again on save.
  */
 private static function migrate_node_settings($type,array $s){
  $maps=[
   'accordion'=>['items'=>['title','content']],
   'toggle'=>['items'=>['title','content']],
   'tabs'=>['tabs'=>['title','content']],
   'icon_list'=>['items'=>['text','icon','url']],
   'social'=>['links'=>['network','url','icon']],
   'price_table'=>['features'=>['text','icon']],
   'form'=>['fields'=>['label','type','required','placeholder']],
  ];
  if(isset($maps[$type])){
   foreach($maps[$type] as $key=>$cols){
    if(!array_key_exists($key,$s))continue;
    if(is_array($s[$key]))continue;
    $s[$key]=self::pipe_to_repeater((string)$s[$key],self::fields_from_columns($cols));
   }
  }
  if(($type==='accordion'||$type==='toggle')&&empty($s['items'])&&(!empty($s['title'])||!empty($s['text']))){
   $s['items']=[['title'=>(string)($s['title']??'Item'),'content'=>(string)($s['text']??'')]];
   unset($s['title'],$s['text'],$s['open']);
  }
  if($type==='testimonial'&&!is_array($s['items']??null)){
   $has=trim((string)($s['quote']??'').($s['author']??''))!=='';
   $s['items']=$has?[['_id'=>'r_'.wp_generate_uuid4(),'quote'=>(string)($s['quote']??''),'author'=>(string)($s['author']??''),'role'=>(string)($s['role']??''),'image_id'=>absint($s['image_id']??0),'image_url'=>(string)($s['image_url']??''),'link'=>(string)($s['link']??''),'link_target'=>(string)($s['link_target']??'_self')]]:[];
  }
  if($type==='carousel'&&isset($s['link'])&&is_string($s['link'])&&preg_match('~^https?://(none|file|custom)/?$~i',$s['link'],$lm))$s['link']=strtolower($lm[1]);
  if($type==='carousel'&&!is_array($s['slides']??null)){
   $ids=array_values(array_filter(array_map('absint',preg_split('/[,\s]+/',(string)($s['ids']??'')))));
   $urls=preg_split('/\r?\n/',(string)($s['custom_urls']??''));
   $slides=[];
   foreach($ids as $i=>$id){
    $slides[]=['_id'=>'r_'.wp_generate_uuid4(),'image_id'=>$id,'caption'=>'','link'=>trim((string)($urls[$i]??'')),'alt'=>''];
   }
   $s['slides']=$slides;
  }
  if(class_exists(Groups::class))$s=Groups::migrate_settings($s);
  if(class_exists('\\SidcraftPageBuilder\\Dynamic\\Resolver'))$s=\SidcraftPageBuilder\Dynamic\Resolver::migrate_settings($s,$type);
  return $s;
 }
 /** Column names as a fake field map so pipe conversion can type-coerce switch/media. */
 private static function fields_from_columns(array $cols){
  $out=[];
  foreach($cols as $c){
   $c=sanitize_key((string)$c);
   if($c==='')continue;
   $type='text';
   if($c==='required')$type='switch';
   elseif($c==='image_id')$type='media';
   elseif($c==='url'||$c==='link')$type='url';
   elseif($c==='content'||$c==='quote')$type='wysiwyg';
   $out[$c]=['type'=>$type];
  }
  return $out;
 }
 /** Multi-line "a|b|c" string -> repeater items keyed by `$fields`. */
 private static function pipe_to_repeater($text,array $fields){
  $keys=array_keys($fields);
  $out=[];
  foreach(preg_split('/\r?\n/',(string)$text) as $line){
   if(trim($line)==='')continue;
   $out[]=self::pipe_row_to_item($line,$keys,$fields);
  }
  return $out;
 }
 private static function pipe_row_to_item($line,array $keys,array $fields=[]){
  $cols=array_map('trim',explode('|',(string)$line));
  $item=['_id'=>'r_'.wp_generate_uuid4()];
  foreach($keys as $i=>$k){
   $raw=$cols[$i]??'';
   $type=is_array($fields[$k]??null)?(string)($fields[$k]['type']??'text'):'text';
   if($type==='switch')$item[$k]=($raw===true||$raw==='1'||$raw==='true'||$raw==='required'||$raw==='yes'||$raw==='on');
   elseif($type==='media')$item[$k]=absint($raw);
   else $item[$k]=$raw;
  }
  return $item;
 }
}
