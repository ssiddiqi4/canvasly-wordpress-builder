<?php
namespace SidcraftPageBuilder\Units;
if ( ! defined('ABSPATH') ) exit;
abstract class Unit {
 public function type(){return '';}
 public function title(){return '';}
 public function icon(){return "\u{25C7}";}
 public function category(){return 'basic';}
 /** Widget package slug (`lite`, `pro`, or an add-on). Empty lets Units Manager infer it from the class namespace. */
 public function source(){return '';}
 public function keywords(){return [$this->type(),$this->title()];}
 public function supports_children(){return false;}
 /**
  * Repeater control key whose items become named child slots.
  * Empty string means the unit is not slot-aware (children, if any, are a flat list).
  */
 public function slot_source(){return '';}
 /** True when panels are addressed by repeater-item `_id` rather than a flat children list. */
 public function supports_slots(){return $this->slot_source()!=='';}
 /**
  * Slot descriptors for the current settings: `[ ['id'=>'tab1','title'=>'Tab 1'], ... ]`.
  * Each `id` matches a repeater item `_id`; editor drop targets and frontend panels use it.
  */
 public function slots($settings){
  $key=$this->slot_source();
  if($key==='')return [];
  $s=is_array($settings)?$settings:[];
  $items=$this->repeater_items($s[$key]??[],['title']);
  $out=[];
  foreach($items as $i=>$item){
   $id=preg_replace('/[^a-zA-Z0-9_-]/','',(string)($item['_id']??''));
   if($id==='')$id='slot'.$i;
   $out[]=['id'=>$id,'title'=>(string)($item['title']??'')];
  }
  return $out;
 }
 public function defaults(){return [];}
 /**
  * Control schema. Each entry is either a type string (`'color'`) or a definition array:
  *
  *   'key' => [
  *     'type'        => 'slider',                 // any registered control type
  *     'label'=>__('Width', 'sidcraft-page-builder'),
  *     'section'     => 'Layout',                 // panel section (accordion) title
  *     'tab'         => 'content|style|advanced', // default 'content'
  *     'responsive'  => true,                     // value stored as ['desktop'=>.., breakpoint names]
  *     'units'       => ['px','%','em','rem','vw','vh'], // slider units; [] = unitless number
  *     'range'       => ['min'=>0,'max'=>100,'step'=>1],
  *     'options'     => ['value'=>__('Label', 'sidcraft-page-builder'), ...] or ['a','b'],
  *     'condition'   => ['other_key'=>'value', 'other_key!'=>'', 'k'=>['a','b']], // all must match
  *     'selectors'   => ['{{WRAPPER}} .x'=>'width: {{SIZE}}{{UNIT}};'],          // see Style::schema_css()
  *     'map'         => ['left'=>'flex-start'],   // {{VALUE}} is looked up here; {{RAW}} is the stored value
  *     'default'     => '',
  *     'separator'   => 'before|after',
  *     'description'=>__('Help text', 'sidcraft-page-builder'),
  *     'placeholder' => '',
  *     'hidden'      => false,                    // accepted by the sanitizer but not shown in the panel
  *     'dynamic'     => true,                     // or ['categories'=>['text','url']]; per-control tag toggle
  *     'translatable'=> true,                     // WPML/Polylang; default true for text/textarea/wysiwyg/url/html
  *     'fields'      => [...],                    // repeater: nested control schema (same shape as this)
  *     'title_field' => 'title' or '{{title}}',   // repeater: item header label
  *     'prevent_empty'=> true,                    // repeater: keep at least one item
  *   ]
  *
  * String values are shorthand for `['type' => $string]`.
  */
 public function controls(){return [];}
 public function render($settings,$children=''){return $children;}
 /** Extra CSS for this unit. `$id` is the node id (selector is `#lb-node-{$id}`). Add-ons may also use the `sidcraft-page-builder/unit/style_css` filter. */
 public function style_css($id,$settings){return '';}
 /**
  * WP script handles this unit needs on the frontend. Empty means no extra JS.
  * Return values are settings-aware so lightbox, dismiss, overlay, load-more, etc. can opt in.
  * The renderer enqueues only handles that appear on the current page.
  *
  * @param array $settings
  * @return string[]
  */
 public function scripts($settings=[]){return [];}
 /**
  * WP style handles this unit needs on the frontend. Empty means no extra CSS.
  *
  * @param array $settings
  * @return string[]
  */
 public function styles($settings=[]){return [];}
 /** Normalized unique script handles after `sidcraft-page-builder/unit/scripts` and background-layer detection. */
 public function get_scripts($settings=[]){
  $s=is_array($settings)?$settings:[];
  $handles=$this->scripts($s);
  if(!is_array($handles))$handles=[];
  if(self::settings_need_frontend($s))$handles[]='sidcraft-page-builder-frontend';
  $handles=apply_filters('sidcraft-page-builder/unit/scripts',$handles,$this,$s);
  return self::normalize_handles(is_array($handles)?$handles:[]);
 }
 /** Normalized unique style handles after `sidcraft-page-builder/unit/styles`. */
 public function get_styles($settings=[]){
  $s=is_array($settings)?$settings:[];
  $handles=$this->styles($s);
  if(!is_array($handles))$handles=[];
  $handles=apply_filters('sidcraft-page-builder/unit/styles',$handles,$this,$s);
  return self::normalize_handles(is_array($handles)?$handles:[]);
 }
 /** True when advanced background video/slideshow on any unit needs the core frontend bundle. */
 public static function settings_need_frontend($settings){
  $s=is_array($settings)?$settings:[];
  if(!empty($s['background_video']))return true;
  $bg=is_array($s['background']??null)?$s['background']:[];
  if(!empty($bg['video_url']))return true;
  $type=(string)($bg['type']??'');
  return $type==='slideshow'||$type==='video';
 }
 /** @param mixed $handles @return string[] */
 public static function normalize_handles($handles){
  $out=[];
  foreach((array)$handles as $h){
   $h=sanitize_key((string)$h);
   if($h!=='')$out[$h]=true;
  }
  return array_keys($out);
 }
 /** Core frontend bundle handle, for subclasses that always need JS. */
 protected function frontend_scripts(){return ['sidcraft-page-builder-frontend'];}
 /** Defaults after the `sidcraft-page-builder/unit/defaults` filter. Schema `default`s are merged under `defaults()`. Use this instead of defaults() when reading. */
 public function get_defaults(){
  $schema=[];
  foreach($this->controls() as $k=>$def){ if(is_array($def)&&array_key_exists('default',$def))$schema[$k]=$def['default']; }
  $d=apply_filters('sidcraft-page-builder/unit/defaults',array_merge($schema,(array)$this->defaults()),$this);
  return is_array($d)?$d:[];
 }
 /** True when the unit declares at least one control as a schema array (opts the panel into the schema renderer). */
 public function uses_schema(){
  foreach($this->controls() as $def){ if(is_array($def))return true; }
  return false;
 }
 /** True when the unit renders a clickable button (CTA, submit, read more, ...). */
 public function uses_button(){return false;}
 /** Descendant selectors for button-like nodes, used by the shared Advanced radius control. */
 public static function button_selector(){
  return '{{WRAPPER}} .lb-button,{{WRAPPER}} .lb-form button,{{WRAPPER}} .lb-read-more,{{WRAPPER}} .lb-price-table>a,{{WRAPPER}} .lb-login button,{{WRAPPER}} .lb-login input[type=submit],{{WRAPPER}} .lb-link-bio-links a,{{WRAPPER}} .lb-flip-button,{{WRAPPER}} .lb-loop-more,{{WRAPPER}} .lb-loop-page,{{WRAPPER}} .cp-cta-button';
 }
 /**
  * Full normalized control schema: unit controls + shared controls, filtered through
  * `sidcraft-page-builder/unit/controls`, every value normalized to a definition array (see controls()).
  */
 public function all_controls(){
  $c=apply_filters('sidcraft-page-builder/unit/controls',$this->base_controls(),$this);
  if(!is_array($c))return [];
  $out=[];
  foreach($c as $k=>$def){
   $k=sanitize_key((string)$k); if($k==='')continue;
   if($k==='button_radius'&&!$this->uses_button()){
    if(!is_array($def))$def=['type'=>$def];
    $def['hidden']=true;
   }
   $out[$k]=self::normalize_control($k,$def);
  }
  return $out;
 }
 /** Flat `key => type` map (legacy shape of all_controls()). */
 public function control_types(){
  $out=[]; foreach($this->all_controls() as $k=>$def)$out[$k]=$def['type']; return $out;
 }
 /** Unfiltered unit + shared controls. Unit definitions win over shared ones with the same key. */
 protected function base_controls(){
  return $this->controls()+$this->button_controls()+self::shared_controls();
 }
 /**
  * Selectors (inside the unit, comma separated) for the buttons that get the shared
  * Style > Button / Button Hover colours. '' = the unit has no such button (or styles its own).
  */
 public function button_style_selector(){return '';}
 /**
  * Shared Button + Button Hover colour controls for units that declare button_style_selector().
  * The ID-scoped selectors outrank theme rules such as `button:hover{background:red}`,
  * so the button keeps its colours on hover unless a Hover colour is set.
  */
 protected function button_controls(){
  $parts=array_values(array_filter(array_map('trim',explode(',',(string)$this->button_style_selector())),'strlen'));
  if(!$parts)return [];
  $sel=function(array $states)use($parts){
   $out=[];
   foreach($parts as $p){ foreach($states as $st){ $out[]='{{WRAPPER}} '.$p.$st; } }
   return implode(',',$out);
  };
  $n=$sel(['']); $h=$sel([':hover',':focus-visible']);
  $btn=__('Button', 'sidcraft-page-builder'); $hov=__('Button Hover', 'sidcraft-page-builder');
  return [
   'btn_text_color'=>$this->ctrl('color',__('Button Text', 'sidcraft-page-builder'),'style',$btn,['selectors'=>[$n=>'color: {{VALUE}};']]),
   'btn_background'=>$this->ctrl('color',__('Button Background', 'sidcraft-page-builder'),'style',$btn,['selectors'=>[$n=>'background-color: {{VALUE}}; background-image: none;']]),
   'btn_border_color'=>$this->ctrl('color',__('Button Border', 'sidcraft-page-builder'),'style',$btn,['selectors'=>[$n=>'border-color: {{VALUE}};']]),
   'btn_hover_text_color'=>$this->ctrl('color',__('Hover Text', 'sidcraft-page-builder'),'style',$hov,['selectors'=>[$h=>'color: {{VALUE}};']]),
   'btn_hover_background'=>$this->ctrl('color',__('Hover Background', 'sidcraft-page-builder'),'style',$hov,['selectors'=>[$h=>'background-color: {{VALUE}}; background-image: none;']]),
   'btn_hover_border_color'=>$this->ctrl('color',__('Hover Border', 'sidcraft-page-builder'),'style',$hov,['selectors'=>[$h=>'border-color: {{VALUE}};']]),
  ];
 }
 /** Compact schema entry: type, label, tab, section, plus any extra keys (options, selectors, condition...). */
 protected function ctrl($type,$label,$tab,$section,array $extra=[]){
  return array_merge(['type'=>$type,'label'=>$label,'tab'=>$tab,'section'=>$section],$extra);
 }
 /** Nested repeater field (type + label + extras). Tab/section are unused inside a repeater. */
 protected function field($type,$label,array $extra=[]){
  return array_merge(['type'=>$type,'label'=>$label],$extra);
 }
 /** Shared option lists used by the migrated widgets. */
 protected static function opt_target(){return ['_self'=>__('Same Window', 'sidcraft-page-builder'),'_blank'=>__('New Window', 'sidcraft-page-builder')];}
 protected static function opt_lcr(){return ['left'=>__('Left', 'sidcraft-page-builder'),'center'=>__('Center', 'sidcraft-page-builder'),'right'=>__('Right', 'sidcraft-page-builder')];}
 protected static function opt_align(){return ['left'=>__('Left', 'sidcraft-page-builder'),'center'=>__('Center', 'sidcraft-page-builder'),'right'=>__('Right', 'sidcraft-page-builder'),'justify'=>__('Justify', 'sidcraft-page-builder')];}
 protected static function opt_hover(){return [''=>__('None', 'sidcraft-page-builder'),'zoom'=>__('Zoom', 'sidcraft-page-builder'),'grow'=>__('Grow', 'sidcraft-page-builder'),'shrink'=>__('Shrink', 'sidcraft-page-builder'),'lift'=>__('Lift', 'sidcraft-page-builder'),'sink'=>__('Sink', 'sidcraft-page-builder'),'fade'=>__('Fade', 'sidcraft-page-builder'),'rotate'=>__('Rotate', 'sidcraft-page-builder'),'float'=>__('Float', 'sidcraft-page-builder'),'pulse'=>__('Pulse', 'sidcraft-page-builder'),'skew'=>__('Skew', 'sidcraft-page-builder'),'wobble'=>__('Wobble', 'sidcraft-page-builder'),'buzz'=>__('Buzz', 'sidcraft-page-builder')];}
 protected static function opt_title_tags(){return ['h1'=>__('H1', 'sidcraft-page-builder'),'h2'=>__('H2', 'sidcraft-page-builder'),'h3'=>__('H3', 'sidcraft-page-builder'),'h4'=>__('H4', 'sidcraft-page-builder'),'h5'=>__('H5', 'sidcraft-page-builder'),'h6'=>__('H6', 'sidcraft-page-builder'),'div'=>__('div', 'sidcraft-page-builder'),'span'=>__('span', 'sidcraft-page-builder'),'p'=>__('p', 'sidcraft-page-builder')];}
 protected static function opt_weight(){return [''=>__('Default', 'sidcraft-page-builder'),'100'=>'100','200'=>'200','300'=>'300','400'=>'400','500'=>'500','600'=>'600','700'=>'700','800'=>'800','900'=>'900'];}
 /**
  * Style > Items controls (Direction, Justify Content, Align Items, Gaps, Wrap), drawn as
  * Elementor-style icon button groups. `$keys` maps role => setting key, `$target` is the CSS
  * selector that becomes the flex box, `$lead` is prepended to every declaration
  * (e.g. `display:flex;` for widget wrappers), and `$extra` is merged into every control.
  *
  * @param array  $keys   ['direction'=>..,'justify'=>..,'align'=>..,'gap'=>..,'wrap'=>..]
  * @param string $target
  * @param string $lead
  * @param array  $extra
  * @param string $axis_default Flex direction the box has when Direction is unset (orients the icons).
  * @return array
  */
 public static function flex_items_controls(array $keys,$target,$lead='',array $extra=[],$axis_default='row'){
  $sec=__('Items', 'sidcraft-page-builder');
  $dir_key=$keys['direction'];
  $mk=function($type,$label,array $more)use($sec,$extra){
   return array_merge(['type'=>$type,'label'=>$label,'tab'=>'style','section'=>$sec],$extra,$more);
  };
  $decl=function($prop)use($target,$lead){return [$target=>$lead.$prop.': {{VALUE}};'];};
  $out=[];
  $out[$dir_key]=$mk('choose',__('Direction', 'sidcraft-page-builder'),[
   'responsive'=>true,'icons_only'=>true,'toggle'=>true,
   'options'=>['row'=>__('Row - horizontal', 'sidcraft-page-builder'),'column'=>__('Column - vertical', 'sidcraft-page-builder'),'row-reverse'=>__('Row - reversed', 'sidcraft-page-builder'),'column-reverse'=>__('Column - reversed', 'sidcraft-page-builder')],
   'icons'=>['row'=>'lbi-dir-row','column'=>'lbi-dir-column','row-reverse'=>'lbi-dir-row-reverse','column-reverse'=>'lbi-dir-column-reverse'],
   'selectors'=>$decl('flex-direction'),
  ]);
  $out[$keys['justify']]=$mk('choose',__('Justify Content', 'sidcraft-page-builder'),[
   'responsive'=>true,'icons_only'=>true,'label_block'=>true,'toggle'=>true,'axis'=>'justify','axis_key'=>$dir_key,'axis_default'=>$axis_default,
   'options'=>['flex-start'=>__('Start', 'sidcraft-page-builder'),'center'=>__('Center', 'sidcraft-page-builder'),'flex-end'=>__('End', 'sidcraft-page-builder'),'space-between'=>__('Space Between', 'sidcraft-page-builder'),'space-around'=>__('Space Around', 'sidcraft-page-builder'),'space-evenly'=>__('Space Evenly', 'sidcraft-page-builder')],
   'icons'=>['flex-start'=>'lbi-justify-start','center'=>'lbi-justify-center','flex-end'=>'lbi-justify-end','space-between'=>'lbi-justify-between','space-around'=>'lbi-justify-around','space-evenly'=>'lbi-justify-evenly'],
   'selectors'=>$decl('justify-content'),
  ]);
  $out[$keys['align']]=$mk('choose',__('Align Items', 'sidcraft-page-builder'),[
   'responsive'=>true,'icons_only'=>true,'toggle'=>true,'axis'=>'align','axis_key'=>$dir_key,'axis_default'=>$axis_default,
   'options'=>['flex-start'=>__('Start', 'sidcraft-page-builder'),'center'=>__('Center', 'sidcraft-page-builder'),'flex-end'=>__('End', 'sidcraft-page-builder'),'stretch'=>__('Stretch', 'sidcraft-page-builder')],
   'icons'=>['flex-start'=>'lbi-align-start','center'=>'lbi-align-center','flex-end'=>'lbi-align-end','stretch'=>'lbi-align-stretch'],
   'selectors'=>$decl('align-items'),
  ]);
  $out[$keys['gap']]=$mk('gaps',__('Gaps', 'sidcraft-page-builder'),[
   'responsive'=>true,'separator'=>'before','units'=>['px','em','rem','%','vw'],
   'selectors'=>$decl('gap'),
  ]);
  $out[$keys['wrap']]=$mk('choose',__('Wrap', 'sidcraft-page-builder'),[
   'responsive'=>true,'icons_only'=>true,'toggle'=>true,
   'description'=>__('Items within the container can stay in a single line (No wrap), or break into multiple lines (Wrap).', 'sidcraft-page-builder'),
   'options'=>['nowrap'=>__('No Wrap', 'sidcraft-page-builder'),'wrap'=>__('Wrap', 'sidcraft-page-builder')],
   'icons'=>['nowrap'=>'lbi-nowrap','wrap'=>'lbi-wrap'],
   'selectors'=>$decl('flex-wrap'),
  ]);
  return $out;
 }
 /** Setting keys of the shared widget-level Style > Items controls. */
 public static function items_keys(){
  return ['direction'=>'items_direction','justify'=>'items_justify','align'=>'items_align','gap'=>'items_gap','wrap'=>'items_flex_wrap'];
 }
 /** Turn a control definition (string shorthand or array) into a complete definition array. */
 public static function normalize_control($key,$def){
  if(is_string($def))$def=['type'=>$def];
  if(!is_array($def))$def=[];
  $type=isset($def['type'])&&is_string($def['type'])&&$def['type']!==''?sanitize_key($def['type']):'text';
  $tab=isset($def['tab'])&&in_array($def['tab'],['content','style','advanced'],true)?$def['tab']:'content';
  $out=$def;
  $out['type']=$type;
  $out['label']=isset($def['label'])&&is_string($def['label'])?$def['label']:self::humanize($key);
  $out['section']=isset($def['section'])&&is_string($def['section'])?$def['section']:'';
  $out['tab']=$tab;
  $out['responsive']=!empty($def['responsive']);
  $out['hidden']=!empty($def['hidden']);
  if(array_key_exists('translatable',$def))$out['translatable']=!empty($def['translatable']);
  $dyn=self::normalize_dynamic($key,$type,$def['dynamic']??null);
  if($dyn)$out['dynamic']=$dyn; else unset($out['dynamic']);
  if(isset($def['units'])){ $out['units']=is_array($def['units'])?array_values(array_map('strval',$def['units'])):[]; }
  if(isset($def['range'])&&!is_array($def['range']))unset($out['range']);
  if(isset($def['options'])&&!is_array($def['options']))unset($out['options']);
  if(isset($def['condition'])&&!is_array($def['condition']))unset($out['condition']);
  if(isset($def['selectors'])&&!is_array($def['selectors']))unset($out['selectors']);
  if(isset($def['map'])&&!is_array($def['map']))unset($out['map']);
  if($type==='repeater'){
   $fields=[];
   foreach((array)($def['fields']??[]) as $fk=>$fdef){ $fk=sanitize_key((string)$fk); if($fk==='')continue; $fields[$fk]=self::normalize_control($fk,$fdef); }
   $out['fields']=$fields;
   $out['title_field']=isset($def['title_field'])?(string)$def['title_field']:'';
   $out['prevent_empty']=!empty($def['prevent_empty']);
  }
  return $out;
 }
 /**
  * Normalize a control `dynamic` flag. `true` infers categories from the type; an array may set
  * `categories`. Content keys (text, title, url, ...) default to on when the flag is omitted.
  *
  * @param string $key
  * @param string $type
  * @param mixed  $dynamic
  * @return array{active:bool,categories:string[]}|false
  */
 public static function normalize_dynamic($key,$type,$dynamic=null){
  $by_type=array(
   'text'=>array('text'),'textarea'=>array('text'),'wysiwyg'=>array('text','html'),'code'=>array('text','html'),
   'url'=>array('url','text'),'media'=>array('image'),'number'=>array('number'),'slider'=>array('number'),'color'=>array('color'),
  );
  $content_keys=array('text','title','content','html','url','link','image_url','image_id','alt','caption','quote','author','excerpt','description','address','shortcode','prefix','suffix','role','name','bio');
  if($dynamic===false || $dynamic===0 || $dynamic==='0')return false;
  $cats=array();
  if(is_array($dynamic)){
   if(array_key_exists('active',$dynamic)&&empty($dynamic['active']))return false;
   $raw=$dynamic['categories']??$dynamic;
   if(is_array($raw)){
    foreach($raw as $c){
     $c=sanitize_key((string)$c);
     if($c!=='')$cats[]=$c;
    }
   }
  }
  if(!$cats)$cats=$by_type[$type]??array();
  if(!$cats)return false;
  if($dynamic===null && !in_array($key,$content_keys,true))return false;
  if($dynamic===null && !isset($by_type[$type]))return false;
  $allowed=array('text','url','image','number','color','html');
  $cats=array_values(array_unique(array_filter($cats,function($c)use($allowed){return in_array($c,$allowed,true);})));
  return $cats?array('active'=>true,'categories'=>$cats):false;
 }
 /** "some_key" -> "Some Key". */
 public static function humanize($key){return ucwords(str_replace('_',' ',(string)$key));}
 /** Evaluate a schema `condition` against a settings array. Keys ending in `!` mean "not equal"; array values mean "one of". */
 public static function condition_met($cond,array $s){
  if(!is_array($cond)||!$cond)return true;
  foreach($cond as $k=>$want){
   $neg=substr((string)$k,-1)==='!'; $key=$neg?substr((string)$k,0,-1):(string)$k;
   $have=$s[$key]??null; if(is_array($have))$have=$have['desktop']??reset($have);
   if(is_bool($have))$have=$have?'1':'';
   $have=(string)$have;
   $set=is_array($want)?$want:[$want];
   $hit=false; foreach($set as $w){ if(is_bool($w))$w=$w?'1':''; if((string)$w===$have){$hit=true;break;} }
   if($neg?$hit:!$hit)return false;
  }
  return true;
 }
 /**
  * Controls every unit shares (Advanced tab + hidden compatibility keys). Units override any of
  * these by declaring the same key in controls().
  */
 public static function shared_controls(){
  static $c=null; if($c!==null)return $c;
  $adv=function($type,$label,$section,array $extra=[])use(&$c){return array_merge(['type'=>$type,'label'=>$label,'section'=>$section,'tab'=>'advanced'],$extra);};
  $sty=function($type,$label,$section,array $extra=[]){return array_merge(['type'=>$type,'label'=>$label,'section'=>$section,'tab'=>'style'],$extra);};
  $hidden=function($type,array $extra=[]){return array_merge(['type'=>$type,'hidden'=>true,'tab'=>'advanced'],$extra);};
  $len=['px','%','em','rem','vw','vh'];
  // Style > Items: turns the unit wrapper into a flex box. Shown while Advanced > Display is Default or Flex.
  $items=self::flex_items_controls(self::items_keys(),'{{WRAPPER}}','display: flex; ',['condition'=>['display'=>['','flex']]]);
  $c=$items+[
   // Layout
   'width'=>$adv('slider',__('Width', 'sidcraft-page-builder'),__('Layout', 'sidcraft-page-builder'),['responsive'=>true,'units'=>['%','px','vw','em','rem'],'range'=>['min'=>0,'max'=>1000],'selectors'=>['{{WRAPPER}}'=>'--lb-el-w: {{VALUE}}; width: {{VALUE}};']]),
   'max_width'=>$adv('slider',__('Max Width', 'sidcraft-page-builder'),__('Layout', 'sidcraft-page-builder'),['responsive'=>true,'units'=>['px','%','vw','em','rem'],'range'=>['min'=>0,'max'=>2000],'selectors'=>['{{WRAPPER}}'=>'--lb-el-max-w: {{VALUE}}; max-width: {{VALUE}};']]),
   'height'=>$adv('slider',__('Height', 'sidcraft-page-builder'),__('Layout', 'sidcraft-page-builder'),['responsive'=>true,'units'=>['px','%','vh','em','rem','auto'],'range'=>['min'=>0,'max'=>2000],'selectors'=>['{{WRAPPER}}'=>'--lb-el-h: {{VALUE}}; height: {{VALUE}};']]),
   'min_height'=>$adv('slider',__('Min Height', 'sidcraft-page-builder'),__('Layout', 'sidcraft-page-builder'),['responsive'=>true,'units'=>['px','%','vh','em','rem'],'range'=>['min'=>0,'max'=>2000],'selectors'=>['{{WRAPPER}}'=>'--lb-el-min-h: {{VALUE}}; min-height: {{VALUE}};']]),
   // Spacing
   'margin'=>$adv('dimensions',__('Margin', 'sidcraft-page-builder'),__('Spacing', 'sidcraft-page-builder')),
   'padding'=>$adv('dimensions',__('Padding', 'sidcraft-page-builder'),__('Spacing', 'sidcraft-page-builder')),
   // Position
   'position'=>$adv('select',__('Position', 'sidcraft-page-builder'),__('Position', 'sidcraft-page-builder'),['options'=>[''=>__('Default', 'sidcraft-page-builder'),'relative'=>__('Relative', 'sidcraft-page-builder'),'absolute'=>__('Absolute', 'sidcraft-page-builder'),'fixed'=>__('Fixed', 'sidcraft-page-builder'),'sticky'=>__('Sticky', 'sidcraft-page-builder')]]),
   'top'=>$adv('slider',__('Top', 'sidcraft-page-builder'),__('Position', 'sidcraft-page-builder'),['units'=>['px','%','em','vh'],'range'=>['min'=>-400,'max'=>400],'condition'=>['position'=>['absolute','fixed','sticky']]]),
   'right'=>$adv('slider',__('Right', 'sidcraft-page-builder'),__('Position', 'sidcraft-page-builder'),['units'=>['px','%','em','vw'],'range'=>['min'=>-400,'max'=>400],'condition'=>['position'=>['absolute','fixed','sticky']]]),
   'bottom'=>$adv('slider',__('Bottom', 'sidcraft-page-builder'),__('Position', 'sidcraft-page-builder'),['units'=>['px','%','em','vh'],'range'=>['min'=>-400,'max'=>400],'condition'=>['position'=>['absolute','fixed','sticky']]]),
   'left'=>$adv('slider',__('Left', 'sidcraft-page-builder'),__('Position', 'sidcraft-page-builder'),['units'=>['px','%','em','vw'],'range'=>['min'=>-400,'max'=>400],'condition'=>['position'=>['absolute','fixed','sticky']]]),
   'z_index'=>$adv('number',__('Z-Index', 'sidcraft-page-builder'),__('Position', 'sidcraft-page-builder'),['range'=>['min'=>0,'max'=>9999,'step'=>1]]),
   'overflow'=>$adv('select',__('Overflow', 'sidcraft-page-builder'),__('Position', 'sidcraft-page-builder'),['options'=>[''=>__('Default', 'sidcraft-page-builder'),'visible'=>__('Visible', 'sidcraft-page-builder'),'hidden'=>__('Hidden', 'sidcraft-page-builder'),'auto'=>__('Auto', 'sidcraft-page-builder'),'scroll'=>__('Scroll', 'sidcraft-page-builder')]]),
   // Flex / grid item
   'display'=>$adv('select',__('Display', 'sidcraft-page-builder'),__('Flex Item', 'sidcraft-page-builder'),['options'=>[''=>__('Default', 'sidcraft-page-builder'),'block'=>__('Block', 'sidcraft-page-builder'),'inline-block'=>__('Inline Block', 'sidcraft-page-builder'),'flex'=>__('Flex', 'sidcraft-page-builder'),'grid'=>__('Grid', 'sidcraft-page-builder'),'none'=>__('None', 'sidcraft-page-builder')]]),
   'visibility'=>$adv('select',__('Visibility', 'sidcraft-page-builder'),__('Flex Item', 'sidcraft-page-builder'),['options'=>[''=>__('Default', 'sidcraft-page-builder'),'visible'=>__('Visible', 'sidcraft-page-builder'),'hidden'=>__('Hidden', 'sidcraft-page-builder')]]),
   'order'=>$adv('number',__('Order', 'sidcraft-page-builder'),__('Flex Item', 'sidcraft-page-builder')),
   'flex_grow'=>$adv('number',__('Flex Grow', 'sidcraft-page-builder'),__('Flex Item', 'sidcraft-page-builder'),['range'=>['min'=>0,'max'=>10,'step'=>1]]),
   'flex_shrink'=>$adv('number',__('Flex Shrink', 'sidcraft-page-builder'),__('Flex Item', 'sidcraft-page-builder'),['range'=>['min'=>0,'max'=>10,'step'=>1]]),
   'flex_basis'=>$adv('text',__('Flex Basis', 'sidcraft-page-builder'),__('Flex Item', 'sidcraft-page-builder'),['placeholder'=>__('auto', 'sidcraft-page-builder')]),
   'align_self'=>$adv('select',__('Align Self', 'sidcraft-page-builder'),__('Flex Item', 'sidcraft-page-builder'),['options'=>[''=>__('Default', 'sidcraft-page-builder'),'auto'=>__('Auto', 'sidcraft-page-builder'),'stretch'=>__('Stretch', 'sidcraft-page-builder'),'flex-start'=>__('Start', 'sidcraft-page-builder'),'center'=>__('Center', 'sidcraft-page-builder'),'flex-end'=>__('End', 'sidcraft-page-builder'),'baseline'=>__('Baseline', 'sidcraft-page-builder')]]),
   'justify_self'=>$adv('select',__('Justify Self', 'sidcraft-page-builder'),__('Flex Item', 'sidcraft-page-builder'),['options'=>[''=>__('Default', 'sidcraft-page-builder'),'auto'=>__('Auto', 'sidcraft-page-builder'),'stretch'=>__('Stretch', 'sidcraft-page-builder'),'start'=>__('Start', 'sidcraft-page-builder'),'center'=>__('Center', 'sidcraft-page-builder'),'end'=>__('End', 'sidcraft-page-builder')]]),
   'grid_column_start'=>$adv('number',__('Column Start', 'sidcraft-page-builder'),__('Grid Item', 'sidcraft-page-builder'),['range'=>['min'=>1,'max'=>24,'step'=>1]]),
   'grid_column_span'=>$adv('number',__('Column Span', 'sidcraft-page-builder'),__('Grid Item', 'sidcraft-page-builder'),['range'=>['min'=>1,'max'=>24,'step'=>1]]),
   'grid_row_start'=>$adv('number',__('Row Start', 'sidcraft-page-builder'),__('Grid Item', 'sidcraft-page-builder'),['range'=>['min'=>1,'max'=>24,'step'=>1]]),
   'grid_row_span'=>$adv('number',__('Row Span', 'sidcraft-page-builder'),__('Grid Item', 'sidcraft-page-builder'),['range'=>['min'=>1,'max'=>24,'step'=>1]]),
   // Responsive visibility
   'hide_desktop'=>$adv('switch',__('Hide On Desktop', 'sidcraft-page-builder'),__('Responsive', 'sidcraft-page-builder')),
   'hide_laptop'=>$adv('switch',__('Hide On Laptop', 'sidcraft-page-builder'),__('Responsive', 'sidcraft-page-builder')),
   'hide_tablet_extra'=>$adv('switch',__('Hide On Tablet Extra', 'sidcraft-page-builder'),__('Responsive', 'sidcraft-page-builder')),
   'hide_tablet'=>$adv('switch',__('Hide On Tablet', 'sidcraft-page-builder'),__('Responsive', 'sidcraft-page-builder')),
   'hide_mobile_extra'=>$adv('switch',__('Hide On Mobile Extra', 'sidcraft-page-builder'),__('Responsive', 'sidcraft-page-builder')),
   'hide_mobile'=>$adv('switch',__('Hide On Mobile', 'sidcraft-page-builder'),__('Responsive', 'sidcraft-page-builder')),
   'hide_widescreen'=>$adv('switch',__('Hide On Widescreen', 'sidcraft-page-builder'),__('Responsive', 'sidcraft-page-builder')),
   // Motion (legacy settings; Interactions 2.0 lives on node.interactions[])
   'interaction'=>$adv('select',__('Entrance Animation', 'sidcraft-page-builder'),__('Motion Effects', 'sidcraft-page-builder'),['hidden'=>true,'options'=>[''=>__('None', 'sidcraft-page-builder'),'fade'=>__('Fade', 'sidcraft-page-builder'),'slide-up'=>__('Slide Up', 'sidcraft-page-builder'),'scale'=>__('Scale', 'sidcraft-page-builder')]]),
   'interaction_trigger'=>$adv('select',__('Trigger', 'sidcraft-page-builder'),__('Motion Effects', 'sidcraft-page-builder'),['hidden'=>true,'options'=>['viewport'=>__('In Viewport', 'sidcraft-page-builder'),'load'=>__('On Load', 'sidcraft-page-builder'),'hover'=>__('Hover', 'sidcraft-page-builder'),'click'=>__('Click', 'sidcraft-page-builder'),'scroll'=>__('Scroll Progress', 'sidcraft-page-builder'),'focus'=>__('Focus', 'sidcraft-page-builder')]]),
   'interaction_duration'=>$adv('number',__('Duration (s)', 'sidcraft-page-builder'),__('Motion Effects', 'sidcraft-page-builder'),['hidden'=>true,'range'=>['min'=>0,'max'=>30,'step'=>0.05]]),
   'interaction_delay'=>$adv('number',__('Delay (s)', 'sidcraft-page-builder'),__('Motion Effects', 'sidcraft-page-builder'),['hidden'=>true,'range'=>['min'=>0,'max'=>30,'step'=>0.05]]),
   'interaction_easing'=>$adv('select',__('Easing', 'sidcraft-page-builder'),__('Motion Effects', 'sidcraft-page-builder'),['hidden'=>true,'options'=>['ease'=>__('Ease', 'sidcraft-page-builder'),'ease-in'=>__('Ease In', 'sidcraft-page-builder'),'ease-out'=>__('Ease Out', 'sidcraft-page-builder'),'ease-in-out'=>__('Ease In Out', 'sidcraft-page-builder'),'linear'=>__('Linear', 'sidcraft-page-builder')]]),
   'interaction_threshold'=>$adv('number',__('Viewport Threshold', 'sidcraft-page-builder'),__('Motion Effects', 'sidcraft-page-builder'),['hidden'=>true,'range'=>['min'=>0,'max'=>1,'step'=>0.05]]),
   'interaction_repeat'=>$adv('switch',__('Repeat', 'sidcraft-page-builder'),__('Motion Effects', 'sidcraft-page-builder'),['hidden'=>true]),
   // Effects
   'opacity'=>$adv('slider',__('Opacity', 'sidcraft-page-builder'),__('Effects', 'sidcraft-page-builder'),['units'=>[],'range'=>['min'=>0,'max'=>1,'step'=>0.05]]),
   'transform'=>$adv('transform',__('Transform', 'sidcraft-page-builder'),__('Effects', 'sidcraft-page-builder')),
   'transition'=>$adv('transition',__('Transition', 'sidcraft-page-builder'),__('Effects', 'sidcraft-page-builder')),
   'filter'=>$adv('css_filter',__('CSS Filter', 'sidcraft-page-builder'),__('Effects', 'sidcraft-page-builder')),
   'mix_blend_mode'=>$adv('select',__('Blend Mode', 'sidcraft-page-builder'),__('Effects', 'sidcraft-page-builder'),['options'=>[''=>__('Normal', 'sidcraft-page-builder'),'multiply'=>__('Multiply', 'sidcraft-page-builder'),'screen'=>__('Screen', 'sidcraft-page-builder'),'overlay'=>__('Overlay', 'sidcraft-page-builder'),'darken'=>__('Darken', 'sidcraft-page-builder'),'lighten'=>__('Lighten', 'sidcraft-page-builder'),'color-dodge'=>__('Color Dodge', 'sidcraft-page-builder'),'color-burn'=>__('Color Burn', 'sidcraft-page-builder'),'hard-light'=>__('Hard Light', 'sidcraft-page-builder'),'soft-light'=>__('Soft Light', 'sidcraft-page-builder'),'difference'=>__('Difference', 'sidcraft-page-builder'),'exclusion'=>__('Exclusion', 'sidcraft-page-builder')]]),
   'mask_shape'=>$adv('select',__('Mask', 'sidcraft-page-builder'),__('Effects', 'sidcraft-page-builder'),['options'=>[''=>__('None', 'sidcraft-page-builder'),'circle'=>__('Circle', 'sidcraft-page-builder'),'ellipse'=>__('Ellipse', 'sidcraft-page-builder'),'hexagon'=>__('Hexagon', 'sidcraft-page-builder'),'triangle'=>__('Triangle', 'sidcraft-page-builder'),'diamond'=>__('Diamond', 'sidcraft-page-builder'),'pill'=>__('Pill', 'sidcraft-page-builder')]]),
   'cursor'=>$adv('select',__('Cursor', 'sidcraft-page-builder'),__('Effects', 'sidcraft-page-builder'),['options'=>[''=>__('Default', 'sidcraft-page-builder'),'default'=>__('Arrow', 'sidcraft-page-builder'),'pointer'=>__('Pointer', 'sidcraft-page-builder'),'move'=>__('Move', 'sidcraft-page-builder'),'text'=>__('Text', 'sidcraft-page-builder'),'not-allowed'=>__('Not Allowed', 'sidcraft-page-builder')]]),
   // Background
   'background'=>$adv('background',__('Background', 'sidcraft-page-builder'),__('Background', 'sidcraft-page-builder')),
   'background_image'=>$hidden('url'),
   'background_size'=>$hidden('select',['options'=>['','cover','contain','auto']]),
   'background_position'=>$hidden('text'),
   'background_repeat'=>$hidden('select',['options'=>['','no-repeat','repeat','repeat-x','repeat-y']]),
   'background_overlay'=>$hidden('color'),
   'background_gradient'=>$hidden('text'),
   'background_clip'=>$adv('select',__('Background Clip', 'sidcraft-page-builder'),__('Background', 'sidcraft-page-builder'),['options'=>[''=>__('Default', 'sidcraft-page-builder'),'border-box'=>__('Border Box', 'sidcraft-page-builder'),'padding-box'=>__('Padding Box', 'sidcraft-page-builder'),'text'=>__('Text', 'sidcraft-page-builder')]]),
   // Border
   'border_style'=>$adv('select',__('Border Style', 'sidcraft-page-builder'),__('Border', 'sidcraft-page-builder'),['options'=>[''=>__('None', 'sidcraft-page-builder'),'solid'=>__('Solid', 'sidcraft-page-builder'),'dashed'=>__('Dashed', 'sidcraft-page-builder'),'dotted'=>__('Dotted', 'sidcraft-page-builder'),'double'=>__('Double', 'sidcraft-page-builder')]]),
   'border_width'=>$adv('dimensions',__('Border Width', 'sidcraft-page-builder'),__('Border', 'sidcraft-page-builder'),['condition'=>['border_style!'=>'']]),
   'border_color'=>$adv('color',__('Border Color', 'sidcraft-page-builder'),__('Border', 'sidcraft-page-builder'),['condition'=>['border_style!'=>'']]),
   'border_radius'=>$adv('dimensions',__('Border Radius', 'sidcraft-page-builder'),__('Border', 'sidcraft-page-builder')),
   'button_radius'=>$adv('slider',__('Button Radius', 'sidcraft-page-builder'),__('Border', 'sidcraft-page-builder'),['units'=>['px','%'],'range'=>['min'=>0,'max'=>80],'selectors'=>['{{WRAPPER}}'=>'--lb-btn-radius: {{SIZE}}{{UNIT}};',self::button_selector()=>'border-radius: {{SIZE}}{{UNIT}};']]),
   'shadow'=>$adv('box_shadow',__('Box Shadow', 'sidcraft-page-builder'),__('Border', 'sidcraft-page-builder')),
   // Attributes
   'css_id'=>$adv('text',__('CSS ID', 'sidcraft-page-builder'),__('Attributes', 'sidcraft-page-builder'),['description'=>__('Same-page jump target. Link a menu item, button, or text link to #this-id (for example #contact-us). Works the same way as a Menu Anchor.', 'sidcraft-page-builder'),'placeholder'=>'contact-us']),
   'css_class'=>$adv('text',__('CSS Classes', 'sidcraft-page-builder'),__('Attributes', 'sidcraft-page-builder')),
   'global_class'=>$adv('text',__('Global Classes', 'sidcraft-page-builder'),__('Attributes', 'sidcraft-page-builder'),['description'=>__('Space separated class names from the Global Classes manager.', 'sidcraft-page-builder')]),
   'aria_label'=>$adv('text',__('ARIA Label', 'sidcraft-page-builder'),__('Attributes', 'sidcraft-page-builder'),['description'=>__('Accessible name. It is applied to the unit\'s link, button, field or image; units without one get role="group" so screen readers announce it.', 'sidcraft-page-builder')]),
   'xe_classes'=>$hidden('xe_classes',['default'=>[]]),
   'role'=>$adv('text',__('Role', 'sidcraft-page-builder'),__('Attributes', 'sidcraft-page-builder')),
   'html_attributes'=>$adv('textarea',__('Custom Attributes', 'sidcraft-page-builder'),__('Attributes', 'sidcraft-page-builder'),['placeholder'=>"title=Example\ndata-key=value",'description'=>__('One attribute per line, as name=value. Only aria-*, data-*, title, rel and download are kept.', 'sidcraft-page-builder')]),
   // Typography on Style. A unit that declares the same key keeps its own tab, section and selectors.
   'color'=>$sty('color',__('Text Color', 'sidcraft-page-builder'),__('Typography', 'sidcraft-page-builder'),['selectors'=>['{{WRAPPER}}'=>'color: {{VALUE}};']]),
   'font_family'=>$sty('font',__('Font Family', 'sidcraft-page-builder'),__('Typography', 'sidcraft-page-builder'),['selectors'=>['{{WRAPPER}}'=>'font-family: {{VALUE}};']]),
   'font_size'=>$sty('slider',__('Font Size', 'sidcraft-page-builder'),__('Typography', 'sidcraft-page-builder'),['responsive'=>true,'units'=>['px','em','rem'],'range'=>['min'=>6,'max'=>200],'selectors'=>['{{WRAPPER}}'=>'font-size: {{SIZE}}{{UNIT}};']]),
   'font_weight'=>$sty('select',__('Weight', 'sidcraft-page-builder'),__('Typography', 'sidcraft-page-builder'),['options'=>self::opt_weight(),'selectors'=>['{{WRAPPER}}'=>'font-weight: {{VALUE}};']]),
   'font_style'=>$sty('select',__('Style', 'sidcraft-page-builder'),__('Typography', 'sidcraft-page-builder'),['options'=>[''=>__('Default', 'sidcraft-page-builder'),'normal'=>__('Normal', 'sidcraft-page-builder'),'italic'=>__('Italic', 'sidcraft-page-builder'),'oblique'=>__('Oblique', 'sidcraft-page-builder')],'selectors'=>['{{WRAPPER}}'=>'font-style: {{VALUE}};']]),
   'text_transform'=>$sty('select',__('Transform', 'sidcraft-page-builder'),__('Typography', 'sidcraft-page-builder'),['options'=>[''=>__('Default', 'sidcraft-page-builder'),'none'=>__('None', 'sidcraft-page-builder'),'uppercase'=>__('Uppercase', 'sidcraft-page-builder'),'lowercase'=>__('Lowercase', 'sidcraft-page-builder'),'capitalize'=>__('Capitalize', 'sidcraft-page-builder')],'selectors'=>['{{WRAPPER}}'=>'text-transform: {{VALUE}};']]),
   'text_decoration'=>$sty('select',__('Decoration', 'sidcraft-page-builder'),__('Typography', 'sidcraft-page-builder'),['options'=>[''=>__('Default', 'sidcraft-page-builder'),'none'=>__('None', 'sidcraft-page-builder'),'underline'=>__('Underline', 'sidcraft-page-builder'),'overline'=>__('Overline', 'sidcraft-page-builder'),'line-through'=>__('Line Through', 'sidcraft-page-builder')],'selectors'=>['{{WRAPPER}}'=>'text-decoration: {{VALUE}};']]),
   'line_height'=>$sty('slider',__('Line Height', 'sidcraft-page-builder'),__('Typography', 'sidcraft-page-builder'),['responsive'=>true,'units'=>[],'range'=>['min'=>0.6,'max'=>3,'step'=>0.05],'selectors'=>['{{WRAPPER}}'=>'line-height: {{SIZE}};']]),
   'letter_spacing'=>$sty('slider',__('Letter Spacing', 'sidcraft-page-builder'),__('Typography', 'sidcraft-page-builder'),['responsive'=>true,'units'=>['px','em'],'range'=>['min'=>-5,'max'=>20,'step'=>0.1],'selectors'=>['{{WRAPPER}}'=>'letter-spacing: {{SIZE}}{{UNIT}};']]),
   'text_shadow'=>$sty('text_shadow',__('Text Shadow', 'sidcraft-page-builder'),__('Typography', 'sidcraft-page-builder'),['selectors'=>['{{WRAPPER}}'=>'text-shadow: {{VALUE}};']]),
   // Hidden compatibility keys (accepted by the sanitizer, not shown in the schema panel).
   'class_mode'=>$hidden('select',['options'=>['inline','class-first']]),'variable_ref'=>$hidden('text'),'typography_global'=>$hidden('text'),
   'border_top_width'=>$hidden('number'),'border_right_width'=>$hidden('number'),'border_bottom_width'=>$hidden('number'),'border_left_width'=>$hidden('number'),'border_top_color'=>$hidden('color'),'border_right_color'=>$hidden('color'),'border_bottom_color'=>$hidden('color'),'border_left_color'=>$hidden('color'),'border_top_style'=>$hidden('select'),'border_right_style'=>$hidden('select'),'border_bottom_style'=>$hidden('select'),'border_left_style'=>$hidden('select'),'box_shadow'=>$hidden('box_shadow'),
   'object_fit'=>$hidden('select'),'object_position'=>$hidden('text'),'dynamic_source'=>$hidden('select'),'dynamic_key'=>$hidden('text'),'dynamic_meta_key'=>$hidden('text'),
  ];
  return $c;
 }
 /** Parse a multi-line "a|b|c" list control into trimmed row arrays. Empty lines are skipped. */
 protected function rows($text){
  $out=[];
  foreach(preg_split('/\r?\n/',(string)$text) as $line){
   if(trim($line)==='')continue;
   $out[]=array_map('trim',explode('|',$line));
  }
  return $out;
 }
 /**
  * Repeater items from an array (schema 2.2) or a legacy pipe-delimited string.
  * `$columns` maps column index to field name, e.g. ['title','content'].
  */
 protected function repeater_items($value,array $columns=[]){
  if(is_array($value)){
   $out=[];
   foreach($value as $row){
    if(is_array($row))$out[]=$row;
    elseif(is_string($row)&&trim($row)!==''&&$columns)$out[]=$this->pipe_item($row,$columns);
   }
   return $out;
  }
  $out=[];
  foreach($this->rows($value) as $row){
   $item=[];
   foreach(array_values($columns) as $i=>$key)$item[$key]=$row[$i]??'';
   $out[]=$item;
  }
  return $out;
 }
 /** One pipe-delimited line -> associative item using `$columns` field names. */
 protected function pipe_item($line,array $columns){
  $parts=array_map('trim',explode('|',(string)$line));
  $item=[];
  foreach(array_values($columns) as $i=>$key)$item[$key]=$parts[$i]??'';
  return $item;
 }
 /** Whitelist an HTML tag name. */
 protected function tag($value,$allowed,$fallback){
  $value=strtolower(trim((string)$value));
  return in_array($value,$allowed,true)?$value:$fallback;
 }
 /** Heading-like tag list shared by widgets that expose a title tag. */
 protected function title_tags(){return ['h1','h2','h3','h4','h5','h6','div','span','p'];}
 /** Hover animation class from the shared `hover_animation` control. */
 protected function hover_class($s){
  $h=sanitize_html_class((string)($s['hover_animation']??''));
  return $h!==''?' lb-hover-'.$h:'';
 }
 /** Build a `style` attribute from a property=>value map, skipping empty values. */
 protected function style_attr(array $props){
  $parts=[];
  foreach($props as $p=>$v){ if($v===''||$v===null||is_array($v))continue; $parts[]=$p.':'.esc_attr((string)$v); }
  return $parts?' style="'.implode(';',$parts).'"':'';
 }
 /** Desktop value of a responsive breakpoint map, or the plain value. */
 protected function scalar($v,$fallback=''){
  if(is_array($v))$v=$v['desktop']??$fallback;
  return ($v===null||$v==='')?$fallback:$v;
 }
 /** Numeric value with unit, or raw string when the user typed one. */
 protected function unit($v,$unit='px',$fallback=''){
  $v=$this->scalar($v);
  if($v===''||$v===null||is_array($v))return $fallback;
  return is_numeric($v)?((float)$v).$unit:sanitize_text_field((string)$v);
 }
 /**
  * CSS variables for the shared icon view system (default / stacked / framed + shape).
  * Used by Icon, Icon Box, Divider and Text drop caps so they style identically.
  */
 protected function icon_vars($s,$sizeKey='icon_size',$colorKey='icon_color'){
  return [
   '--lb-icon-size'=>$this->unit($s[$sizeKey]??''),
   '--lb-icon-primary'=>$s[$colorKey]??'',
   '--lb-icon-secondary'=>$s['secondary_color']??'',
   '--lb-icon-hover-primary'=>$s['hover_color']??'',
   '--lb-icon-hover-secondary'=>$s['hover_secondary_color']??'',
   '--lb-icon-padding'=>$this->unit($s['icon_padding']??''),
   '--lb-icon-border'=>$this->unit($s['icon_border_width']??''),
   '--lb-icon-radius'=>$this->unit($s['icon_radius']??''),
   '--lb-icon-rotate'=>$this->unit($s['rotate']??'','deg'),
  ];
 }
 /** Resolve a media picker pair (id + url) to a URL for the requested size. */
 protected function media_url($id,$url,$size='full'){
  $id=absint($id);
  if($id){ $u=wp_get_attachment_image_url($id,$size?:'full'); if($u)return $u; }
  return esc_url_raw((string)$url);
 }
 protected function cls($s){
  $c='lb-unit';
  foreach(preg_split('/\s+/',trim((string)($s['css_class']??''))) as $part){$safe=sanitize_html_class($part);if($safe)$c.=' '.$safe;}
  foreach(preg_split('/[\s,]+/',trim((string)($s['global_class']??''))) as $part){$safe=sanitize_html_class($part);if($safe)$c.=' lb-class-'.$safe;}
  // XEditor class stacking: every unit may carry utility classes from the XEditor Classes manager.
  if(!empty($s['xe_classes'])&&class_exists('\\SidcraftPageBuilder\\XEditor\\XEditorClassesManager')){$xe=\SidcraftPageBuilder\XEditor\XEditorClassesManager::class_attr($s['xe_classes']);if($xe!=='')$c.=' '.$xe;}
  return $c;
 }
 /**
  * Href for a menu item, button, or text link.
  * Fragment-only values such as `#contact-us` stay intact. `esc_url()` drops those.
  *
  * @param mixed $url
  * @return string
  */
 public static function link_href($url){
  $url=trim((string)$url);
  if($url===''||$url==='#')return '#';
  if(preg_match('/^\s*(javascript|vbscript|data)\s*:/i',$url))return '';
  if(isset($url[0])&&$url[0]==='#'){
   $id=MenuAnchor::slug(substr($url,1));
   return $id!==''?'#'.$id:'#';
  }
  $safe=esc_url($url);
  if($safe!=='')return $safe;
  if(preg_match('/#([A-Za-z0-9][A-Za-z0-9_-]*)\s*$/',$url,$m)&&!preg_match('/^[a-z][a-z0-9+.-]*:/i',$url)){
   $id=MenuAnchor::slug($m[1]);
   return $id!==''?'#'.$id:'#';
  }
  return '';
 }
 /**
  * Invisible jump target for a section CSS ID. The wrapper already uses `lb-node-{id}`.
  *
  * @param mixed $css_id
  * @return string
  */
 public static function jump_target($css_id){
  $id=MenuAnchor::slug($css_id);
  if($id==='')return '';
  return '<span id="'.esc_attr($id).'" class="lb-menu-anchor"></span>';
 }
 public function attrs($s){
  $a='';
  if(!empty($s['aria_label']))$a.=' aria-label="'.esc_attr($s['aria_label']).'"';
  if(!empty($s['role']))$a.=' role="'.esc_attr(sanitize_key($s['role'])).'"';
  if(!empty($s['html_attributes'])){ foreach(preg_split('/\r?\n/',(string)$s['html_attributes']) as $row){$p=explode('=',trim($row),2);if(count($p)!==2)continue;$name=sanitize_key($p[0]);if(!preg_match('/^(aria-[a-z0-9_-]+|data-[a-z0-9_-]+|title|rel|download)$/i',$name))continue;$a.=' '.esc_attr($name).'="'.esc_attr(trim($p[1]," \"'")).'"';}}
  return $a;
 }
}
