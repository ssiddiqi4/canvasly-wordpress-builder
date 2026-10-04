<?php
namespace SidcraftPageBuilder\Units; if(!defined('ABSPATH')) exit;
class Form extends Unit {
 public function type(){return 'form';} public function title(){return __('Form', 'sidcraft-page-builder');} public function icon(){return "\u{25A4}";} public function category(){return 'content';}
 public function uses_button(){return true;} public function button_style_selector(){return '.lb-form button';}
 public function keywords(){return ['form','contact','fields','email'];}
 public function scripts($s=[]){
  $h=$this->frontend_scripts();
  $s=is_array($s)?$s:[];
  if($this->uses_turnstile($s)){foreach(\SidcraftPageBuilder\Integrations\Turnstile::handles() as $t)$h[]=$t;return $h;}
  if(($s['captcha']??'')!=='none'&&class_exists('\\SidcraftPageBuilder\\Settings\\AdminSettings')&&\SidcraftPageBuilder\Settings\AdminSettings::recaptcha_enabled())$h[]='google-recaptcha';
  return $h;
 }
 /** Cloudflare Turnstile protects this form (form setting, or "all Sidcraft Page Builder forms"). */
 public function uses_turnstile($s){
  if(!class_exists('\\SidcraftPageBuilder\\Integrations\\Turnstile')||!\SidcraftPageBuilder\Integrations\Turnstile::enabled())return false;
  $c=(string)($s['captcha']??'auto');
  if($c==='turnstile')return true;
  return $c!=='none'&&\SidcraftPageBuilder\Integrations\Turnstile::get()['protect_forms']==='all';
 }
 public function defaults(){return [
  'title'=>__('Contact Us', 'sidcraft-page-builder'),
  'fields'=>[
   ['_id'=>'ff1','label'=>__('Name', 'sidcraft-page-builder'),'name'=>'name','type'=>'text','required'=>true,'placeholder'=>'','options'=>''],
   ['_id'=>'ff2','label'=>__('Email', 'sidcraft-page-builder'),'name'=>'email','type'=>'email','required'=>true,'placeholder'=>'','options'=>''],
   ['_id'=>'ff3','label'=>__('Message', 'sidcraft-page-builder'),'name'=>'message','type'=>'textarea','required'=>true,'placeholder'=>'','options'=>''],
  ],
  'submit'=>__('Send Message', 'sidcraft-page-builder'),'success'=>__('Thanks! Your message has been sent.', 'sidcraft-page-builder'),'email'=>'','honeypot'=>true,'layout'=>'stack',
 ];}
 public function controls(){
  $form=__('Form', 'sidcraft-page-builder');
  return [
   'title'=>$this->ctrl('text',__('Title', 'sidcraft-page-builder'),'content',$form),
   'fields'=>$this->ctrl('repeater',__('Fields', 'sidcraft-page-builder'),'content',$form,[
    'title_field'=>'{{label}}','prevent_empty'=>true,
    'fields'=>[
     'label'=>$this->field('text',__('Label', 'sidcraft-page-builder')),
     'name'=>$this->field('text',__('Name', 'sidcraft-page-builder'),['description'=>__('HTML name attribute. Defaults to a slug of the label.', 'sidcraft-page-builder')]),
     'type'=>$this->field('select',__('Type', 'sidcraft-page-builder'),['options'=>['text'=>__('Text', 'sidcraft-page-builder'),'email'=>__('Email', 'sidcraft-page-builder'),'tel'=>__('Tel', 'sidcraft-page-builder'),'url'=>__('URL', 'sidcraft-page-builder'),'textarea'=>__('Textarea', 'sidcraft-page-builder'),'select'=>__('Select', 'sidcraft-page-builder'),'checkbox'=>__('Checkbox', 'sidcraft-page-builder')]]),
     'required'=>$this->field('switch',__('Required', 'sidcraft-page-builder')),
     'placeholder'=>$this->field('text',__('Placeholder', 'sidcraft-page-builder'),['condition'=>['type'=>['text','email','tel','url','textarea']]]),
     'options'=>$this->field('textarea',__('Options', 'sidcraft-page-builder'),['description'=>__('One option per line.', 'sidcraft-page-builder'),'condition'=>['type'=>'select']]),
    ],
   ]),
   'submit'=>$this->ctrl('text',__('Submit Button', 'sidcraft-page-builder'),'content',$form),
   'success'=>$this->ctrl('textarea',__('Success Message', 'sidcraft-page-builder'),'content',$form),
   'email'=>$this->ctrl('text',__('Send To', 'sidcraft-page-builder'),'content',$form,['placeholder'=>__('Leave empty to use the site admin email', 'sidcraft-page-builder')]),
   'honeypot'=>$this->ctrl('switch',__('Honeypot', 'sidcraft-page-builder'),'content',$form),
   'captcha'=>$this->ctrl('select',__('Spam protection', 'sidcraft-page-builder'),'content',$form,['options'=>['auto'=>__('Site default', 'sidcraft-page-builder'),'turnstile'=>__('Require Cloudflare Turnstile', 'sidcraft-page-builder'),'none'=>__('None (honeypot only)', 'sidcraft-page-builder')],'description'=>__('Require Cloudflare Turnstile keeps the Submit button disabled until the visitor completes the Turnstile check, and the server verifies the token. Site default uses reCAPTCHA when it is configured, or Turnstile when “All Sidcraft Page Builder forms” is set. Turnstile keys live in Settings → Integrations.', 'sidcraft-page-builder')]),
   'layout'=>$this->ctrl('select',__('Layout', 'sidcraft-page-builder'),'content',$form,['options'=>['stack'=>__('Stacked', 'sidcraft-page-builder'),'inline'=>__('Inline', 'sidcraft-page-builder'),'two-column'=>__('Two Columns', 'sidcraft-page-builder')]]),
  ];
 }
 public function render($s,$children=''){
  $id='lb-form-'.wp_generate_uuid4();
  $layout_raw=$s['layout']??'stack';
  $layout=in_array($layout_raw,['stack','inline','two-column'],true)?$layout_raw:'stack';
  $fields=[];
  foreach($this->repeater_items($s['fields']??'',['label','type','required','placeholder']) as $row){
   $label=trim((string)($row['label']??$row[0]??'')); if($label==='')continue;
   $name=sanitize_key($row['name']??''); if($name==='')$name=sanitize_key($label);
   $raw=(string)($row['type']??($row[1]??'text'));
   $known=['text','email','tel','url','textarea','select','checkbox'];
   $type=in_array($raw,$known,true)?$raw:'';
   $req=!empty($row['required'])||(($row[2]??'')==='required');
   $placeholder=(string)($row['placeholder']??$row[3]??'');
   $ph=esc_attr($placeholder);
   $reqAttr=$req?' required':'';
   $phAttr=$ph!==''?' placeholder="'.$ph.'"':'';
   $input='';
   if($type===''){
    /** Extra field types from add-ons. Return escaped HTML, or empty to keep a text input. Known types skip this filter. */
    $custom=apply_filters('sidcraft_page_builder_form_field_html','',$raw,array('name'=>$name,'label'=>$label,'required'=>$req,'placeholder'=>$placeholder,'options'=>(string)($row['options']??''),'row'=>$row));
    if(is_string($custom)&&$custom!==''){ $type=sanitize_key($raw); $input=$custom; }
    else $type='text';
   }
   if($input===''){
    if($type==='textarea')$input='<textarea name="'.esc_attr($name).'"'.$reqAttr.$phAttr.'></textarea>';
    elseif($type==='select'){
     $opts='<option value="">'.esc_html__("Select\u{2026}", 'sidcraft-page-builder').'</option>';
     foreach(preg_split('/\r?\n/',(string)($row['options']??'')) as $opt){ $opt=trim($opt); if($opt==='')continue; $opts.='<option value="'.esc_attr($opt).'">'.esc_html($opt).'</option>'; }
     $input='<select name="'.esc_attr($name).'"'.$reqAttr.'>'.$opts.'</select>';
    }
    elseif($type==='checkbox')$input='<label><input type="checkbox" name="'.esc_attr($name).'" value="1"'.$reqAttr.'> '.esc_html($label).'</label>';
    else $input='<input type="'.esc_attr($type).'" name="'.esc_attr($name).'"'.$reqAttr.$phAttr.'>';
   }
   $bare=in_array($type,['checkbox','acceptance'],true);
   $fields[]='<div class="lb-form-field">'.($bare?'':('<label>'.esc_html($label).'</label>')).$input.'</div>';
  }
  $hp=!empty($s['honeypot'])?'<input class="lb-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">':'';
  $to=!empty($s['email'])?'<input type="hidden" name="_to" value="'.esc_attr($s['email']).'">':'';
  $ok=!empty($s['success'])?'<input type="hidden" name="_success" value="'.esc_attr($s['success']).'">':'';
  $captcha='';
  if($this->uses_turnstile($s)){
   $captcha=\SidcraftPageBuilder\Integrations\Turnstile::markup(['action'=>'sidcraft_page_builder_form','size'=>'flexible']);
  }elseif(($s['captcha']??'')!=='none'&&class_exists('\\SidcraftPageBuilder\\Settings\\AdminSettings')&&\SidcraftPageBuilder\Settings\AdminSettings::recaptcha_enabled()){
   $captcha='<div class="lb-recaptcha" data-lb-recaptcha="'.esc_attr(\SidcraftPageBuilder\Settings\AdminSettings::recaptcha_type()).'" data-sitekey="'.esc_attr(\SidcraftPageBuilder\Settings\AdminSettings::recaptcha_site_key()).'"></div>';
  }
  return '<form class="'.$this->cls($s).' lb-form lb-form-'.$layout.'" id="'.esc_attr($id).'" method="post" data-lb-form="1">'.((string)($s['title']??'')!==''?'<h3>'.esc_html($s['title']).'</h3>':'').implode('',$fields).$hp.$to.$ok.$captcha.'<button type="submit">'.esc_html($s['submit']??__('Send Message', 'sidcraft-page-builder')).'</button><div class="lb-form-message" role="status" aria-live="polite"></div></form>';
 }
}
