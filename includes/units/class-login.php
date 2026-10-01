<?php
namespace SidcraftSyntex\Units; if(!defined('ABSPATH')) exit;
class Login extends Unit {
 public function type(){return 'login';}
 public function title(){return __('Login', 'sidcraft-syntex');}
 public function icon(){return "\u{21E5}";}
 public function uses_button(){return true;}
 public function button_style_selector(){return '.lb-login input[type=submit],.lb-login button';}
 public function keywords(){return ['login','sign in','account','turnstile','captcha'];}
 public function defaults(){return ['title'=>'Login','button'=>__('Log In', 'sidcraft-syntex'),'redirect'=>'','turnstile'=>false];}
 public function controls(){
  $sec=__('Login', 'sidcraft-syntex');
  return [
   'title'=>$this->ctrl('text',__('Title', 'sidcraft-syntex'),'content',$sec),
   'button'=>$this->ctrl('text',__('Button', 'sidcraft-syntex'),'content',$sec),
   'redirect'=>$this->ctrl('url',__('Redirect', 'sidcraft-syntex'),'content',$sec),
   'turnstile'=>$this->ctrl('switch',__('Require Cloudflare Turnstile', 'sidcraft-syntex'),'content',__('Security', 'sidcraft-syntex'),['description'=>__('Shows a Cloudflare Turnstile check above the Log In button. The button stays disabled until the visitor completes the check, and the login is rejected without a valid token. Keys live in Settings → Integrations. To also protect wp-login.php itself, turn on Integrations → WordPress forms → Login form.', 'sidcraft-syntex')]),
  ];
 }
 /** Turnstile is shown when this unit asks for it, or when the site protects every login form. */
 public function uses_turnstile($s){
  if(!class_exists('\\SidcraftSyntex\\Integrations\\Turnstile')||!\SidcraftSyntex\Integrations\Turnstile::enabled())return false;
  return !empty($s['turnstile'])||!empty(\SidcraftSyntex\Integrations\Turnstile::get()['protect_login']);
 }
 public function scripts($s=[]){
  $s=is_array($s)?$s:[];
  return $this->uses_turnstile($s)?\SidcraftSyntex\Integrations\Turnstile::handles():[];
 }
 public function render($s,$children=''){
  $s=is_array($s)?$s:[];
  $form=(string)wp_login_form(['echo'=>false,'label_username'=>__('Username', 'sidcraft-syntex'),'label_password'=>__('Password', 'sidcraft-syntex'),'label_log_in'=>$s['button']??__('Log In', 'sidcraft-syntex'),'redirect'=>$s['redirect']??'']);
  if($this->uses_turnstile($s)){
   $form=\SidcraftSyntex\Integrations\Turnstile::inject_before_submit($form,\SidcraftSyntex\Integrations\Turnstile::core_form_markup('login'));
  }
  return '<div class="lb-login"><h3>'.esc_html($s['title']??'Login').'</h3>'.$form.'</div>';
 }
}
