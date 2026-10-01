<?php
namespace SidcraftSyntex\Units; if(!defined('ABSPATH')) exit;
class Form extends Unit {
 public function type(){return 'form';} public function title(){return __('Form', 'sidcraft-syntex');} public function icon(){return "\u{25A4}";} public function category(){return 'content';}
 public function uses_button(){return true;} public function button_style_selector(){return '.lb-form button';}
 public function keywords(){return ['form','contact','fields','email'];}
 public function scripts($s=[]){
  $h=$this->frontend_scripts();
  $s=is_array($s)?$s:[];
  if($this->uses_turnstile($s)){foreach(\SidcraftSyntex\Integrations\Turnstile::handles() as $t)$h[]=$t;return $h;}
  if(($s['captcha']??'')!=='none'&&class_exists('\\SidcraftSyntex\\Settings\\AdminSettings')&&\SidcraftSyntex\Settings\AdminSettings::recaptcha_enabled())$h[]='google-recaptcha';
  return $h;
 }
 /** Cloudflare Turnstile protects this form (form setting, or "all Sidcraft Syntex forms"). */
 public function uses_turnstile($s){
  if(!class_exists('\\SidcraftSyntex\\Integrations\\Turnstile')||!\SidcraftSyntex\Integrations\Turnstile::enabled())return false;
  $c=(string)($s['captcha']??'auto');
  if($c==='turnstile')return true;
  return $c!=='none'&&\SidcraftSyntex\Integrations\Turnstile::get()['protect_forms']==='all';
 }
 public function defaults(){return [
  'title'=>__('Contact Us', 'sidcraft-syntex'),
  'fields'=>[
   ['_id'=>'ff1','label'=>__('Name', 'sidcraft-syntex'),'name'=>'name','type'=>'text','required'=>true,'placeholder'=>'','options'=>''],
   ['_id'=>'ff2','label'=>__('Email', 'sidcraft-syntex'),'name'=>'email','type'=>'email','required'=>true,'placeholder'=>'','options'=>''],
   ['_id'=>'ff3','label'=>__('Message', 'sidcraft-syntex'),'name'=>'message','type'=>'textarea','required'=>true,'placeholder'=>'','options'=>''],
  ],
  'submit'=>__('Send Message', 'sidcraft-syntex'),'success'=>__('Thanks! Your message has been sent.', 'sidcraft-syntex'),'email'=>'','honeypot'=>true,'layout'=>'stack',
 ];}
 public function controls(){
  $form=__('Form', 'sidcraft-syntex');
  return [
   'title'=>$this->ctrl('text',__('Title', 'sidcraft-syntex'),'content',$form),
   'fields'=>$this->ctrl('repeater',__('Fields', 'sidcraft-syntex'),'content',$form,[
    'title_field'=>'{{label}}','prevent_empty'=>true,
    'fields'=>[
     'label'=>$this->field('text',__('Label', 'sidcraft-syntex')),
     'name'=>$this->field('text',__('Name', 'sidcraft-syntex'),['description'=>__('HTML name attribute. Defaults to a slug of the label.', 'sidcraft-syntex')]),
     'type'=>$this->field('select',__('Type', 'sidcraft-syntex'),['options'=>['text'=>__('Text', 'sidcraft-syntex'),'email'=>__('Email', 'sidcraft-syntex'),'tel'=>__('Tel', 'sidcraft-syntex'),'url'=>__('URL', 'sidcraft-syntex'),'textarea'=>__('Textarea', 'sidcraft-syntex'),'select'=>__('Select', 'sidcraft-syntex'),'checkbox'=>__('Checkbox', 'sidcraft-syntex')]]),
     'required'=>$this->field('switch',__('Required', 'sidcraft-syntex')),
     'placeholder'=>$this->field('text',__('Placeholder', 'sidcraft-syntex'),['condition'=>['type'=>['text','email','tel','url','textarea']]]),
     'options'=>$this->field('textarea',__('Options', 'sidcraft-syntex'),['description'=>__('One option per line.', 'sidcraft-syntex'),'condition'=>['type'=>'select']]),
    ],
   ]),
   'submit'=>$this->ctrl('text',__('Submit Button', 'sidcraft-syntex'),'content',$form),
   'success'=>$this->ctrl('textarea',__('Success Message', 'sidcraft-syntex'),'content',$form),
   'email'=>$this->ctrl('text',__('Send To', 'sidcraft-syntex'),'content',$form,['placeholder'=>__('Leave empty to use the site admin email', 'sidcraft-syntex')]),
   'honeypot'=>$this->ctrl('switch',__('Honeypot', 'sidcraft-syntex'),'content',$form),
   'captcha'=>$this->ctrl('select',__('Spam protection', 'sidcraft-syntex'),'content',$form,['options'=>['auto'=>__('Site default', 'sidcraft-syntex'),'turnstile'=>__('Require Cloudflare Turnstile', 'sidcraft-syntex'),'none'=>__('None (honeypot only)', 'sidcraft-syntex')],'description'=>__('Require Cloudflare Turnstile keeps the Submit button disabled until the visitor completes the Turnstile check, and the server verifies the token. Site default uses reCAPTCHA when it is configured, or Turnstile when “All Sidcraft Syntex forms” is set. Turnstile keys live in Settings → Integrations.', 'sidcraft-syntex')]),
   'layout'=>$this->ctrl('select',__('Layout', 'sidcraft-syntex'),'content',$form,['options'=>['stack'=>__('Stacked', 'sidcraft-syntex'),'inline'=>__('Inline', 'sidcraft-syntex'),'two-column'=>__('Two Columns', 'sidcraft-syntex')]]),
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
    $custom=apply_filters('sidcraft-syntex/form/field_html','',$raw,array('name'=>$name,'label'=>$label,'required'=>$req,'placeholder'=>$placeholder,'options'=>(string)($row['options']??''),'row'=>$row));
    if(is_string($custom)&&$custom!==''){ $type=sanitize_key($raw); $input=$custom; }
    else $type='text';
   }
   if($input===''){
    if($type==='textarea')$input='<textarea name="'.esc_attr($name).'"'.$reqAttr.$phAttr.'></textarea>';
    elseif($type==='select'){
     $opts='<option value="">'.esc_html__("Select\u{2026}", 'sidcraft-syntex').'</option>';
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
   $captcha=\SidcraftSyntex\Integrations\Turnstile::markup(['action'=>'sidcraft_syntex_form','size'=>'flexible']);
  }elseif(($s['captcha']??'')!=='none'&&class_exists('\\SidcraftSyntex\\Settings\\AdminSettings')&&\SidcraftSyntex\Settings\AdminSettings::recaptcha_enabled()){
   $captcha='<div class="lb-recaptcha" data-lb-recaptcha="'.esc_attr(\SidcraftSyntex\Settings\AdminSettings::recaptcha_type()).'" data-sitekey="'.esc_attr(\SidcraftSyntex\Settings\AdminSettings::recaptcha_site_key()).'"></div>';
  }
  return '<form class="'.$this->cls($s).' lb-form lb-form-'.$layout.'" id="'.esc_attr($id).'" method="post" data-lb-form="1">'.((string)($s['title']??'')!==''?'<h3>'.esc_html($s['title']).'</h3>':'').implode('',$fields).$hp.$to.$ok.$captcha.'<button type="submit">'.esc_html($s['submit']??__('Send Message', 'sidcraft-syntex')).'</button><div class="lb-form-message" role="status" aria-live="polite"></div></form>';
 }
}
