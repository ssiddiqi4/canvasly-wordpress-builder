import {
	INLINE_EDITABLE_TYPES,
	isInlineEditableType,
	inlineSettingPath,
	inlineAlignKey,
	normalizeAlign,
	sanitizeHref,
	filterInlineStyle,
	sanitizeInlineHtml,
	markIconListInline
} from '../src/editor/inline-toolbar.js';

let failed = 0;
function assert(cond, msg) {
	if (cond) {
		console.log('ok', msg);
		return;
	}
	failed++;
	console.log('FAIL', msg);
}

assert(INLINE_EDITABLE_TYPES.join(',') === 'heading,text,button,icon_list', 'editable types');
assert(isInlineEditableType('heading') && isInlineEditableType('button'), 'heading and button are editable');
assert(!isInlineEditableType('image') && !isInlineEditableType(''), 'image is not editable');

assert(inlineSettingPath('heading') === 'text', 'heading path is text');
assert(inlineSettingPath('text') === 'text', 'text path is text');
assert(inlineSettingPath('button') === 'text', 'button path is text');
assert(inlineSettingPath('icon_list', 2) === 'items.2.text', 'icon list item path');
assert(inlineSettingPath('icon_list', -1) === '', 'invalid icon list index');
assert(inlineSettingPath('image') === '', 'unknown type has no path');

assert(inlineAlignKey('heading') === 'align', 'heading align key');
assert(inlineAlignKey('icon_list') === 'icon_align', 'icon list align key');
assert(inlineAlignKey('spacer') === '', 'spacer has no align key');

assert(normalizeAlign('CENTER') === 'center', 'normalize center');
assert(normalizeAlign('justifyRight') === 'right', 'normalize justifyRight');
assert(normalizeAlign('justifyFull') === 'justify', 'normalize justify');
assert(normalizeAlign('') === 'left', 'empty align is left');

assert(sanitizeHref('javascript:alert(1)') === '', 'rejects javascript href');
assert(sanitizeHref('data:text/html,x') === '', 'rejects data href');
assert(sanitizeHref('www.example.com') === 'https://www.example.com', 'prefixes www');
assert(sanitizeHref('https://ok.test/a') === 'https://ok.test/a', 'keeps https');
assert(sanitizeHref('/about') === '/about', 'keeps root-relative');
assert(sanitizeHref('') === '', 'empty href');

assert(filterInlineStyle('color:red; text-align:center; font-weight:700') === 'text-align:center; font-weight:700', 'keeps allowed styles');
assert(filterInlineStyle('background:url(x)') === '', 'drops unknown styles');

assert(sanitizeInlineHtml('<strong>Hi</strong>') === '<strong>Hi</strong>', 'keeps strong');
assert(sanitizeInlineHtml('<em>Hi</em>') === '<em>Hi</em>', 'keeps em');
assert(sanitizeInlineHtml('<u>Hi</u>') === '<u>Hi</u>', 'keeps underline');
assert(!sanitizeInlineHtml('<script>alert(1)</script>Hi').includes('script'), 'strips script');
assert(!sanitizeInlineHtml('<b onclick="x()">Hi</b>').includes('onclick'), 'strips handlers');
assert(sanitizeInlineHtml('<a href="javascript:alert(1)">x</a>') === '<a>x</a>', 'drops javascript href');
assert(sanitizeInlineHtml('<a href="https://ok.test">x</a>').includes('rel="noopener noreferrer"'), 'adds rel on links');
assert(sanitizeInlineHtml('<p style="text-align:center;color:red">A</p>').includes('text-align:center'), 'keeps text-align');
assert(!sanitizeInlineHtml('<p style="text-align:center;color:red">A</p>').includes('color'), 'drops color style');
assert(sanitizeInlineHtml('Hello<br>World').includes('<br'), 'keeps br');
assert(sanitizeInlineHtml('<div>A</div>') === '<div>A</div>', 'keeps div');

const marked = markIconListInline('<ul><li><span class="lb-icon-list-text">One</span></li><li><span class="lb-icon-list-text">Two</span></li></ul>');
assert(marked.includes('data-inline="text" data-inline-index="0"'), 'marks first icon list item');
assert(marked.includes('data-inline-index="1"'), 'marks second icon list item');
assert(!markIconListInline('<span class="lb-button-text">X</span>').includes('data-inline-index'), 'ignores non list spans');

console.log(failed ? `FAILED ${failed}` : 'OK');
process.exit(failed ? 1 : 0);
