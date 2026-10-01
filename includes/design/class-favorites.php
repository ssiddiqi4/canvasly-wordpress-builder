<?php
namespace SidcraftSyntex\Design;
if(!defined('ABSPATH')) exit;
class Favorites {
 const KEY='sidcraft_syntex_favorite_units';
 public static function all(){ $v=get_user_meta(get_current_user_id(),self::KEY,true); return is_array($v)?array_values(array_map('sanitize_key',$v)):[]; }
 public static function save($items){ if(!current_user_can('edit_pages'))return new \WP_Error('forbidden',__('You cannot manage favorites.', 'sidcraft-syntex')); $out=[]; foreach((array)$items as $x){$x=sanitize_key($x);if($x&&!in_array($x,$out,true))$out[]=$x;} update_user_meta(get_current_user_id(),self::KEY,$out);return $out; }
}
