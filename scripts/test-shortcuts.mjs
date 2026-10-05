import {
	isMacPlatform,
	eventKey,
	comboFromEvent,
	normalizeCombo,
	combosEqual,
	matchCombo,
	formatCombo,
	matchScore,
	defaultShortcutDefs
} from '../src/editor/shortcuts.js';

let failed = 0;
function assert(cond, msg) {
	if (cond) {
		console.log('ok', msg);
		return;
	}
	failed++;
	console.log('FAIL', msg);
}

assert(isMacPlatform('MacIntel'), 'mac platform');
assert(!isMacPlatform('Win32'), 'win platform');

assert(eventKey({ key: 'Escape' }) === 'escape', 'escape key');
assert(eventKey({ key: 'S' }) === 's', 'letter lowercased');
assert(eventKey({ key: '/', shiftKey: true }) === '?', 'shift slash is ?');
assert(eventKey({ key: '?' }) === '?', 'question key');

const save = comboFromEvent({ key: 's', ctrlKey: true });
assert(save.key === 's' && save.ctrl && !save.shift, 'combo from ctrl+s');
assert(combosEqual(save, { key: 's', ctrl: true }), 'combos equal');
assert(!combosEqual(save, { key: 's', ctrl: true, shift: true }), 'shift differs');

assert(matchCombo({ key: '?', ctrlKey: true, shiftKey: true }, { key: '?', ctrl: true }), 'ctrl+? matches without requiring shift');
assert(matchCombo({ key: 'z', ctrlKey: true, shiftKey: true }, { key: 'z', ctrl: true, shift: true }), 'ctrl+shift+z');
assert(!matchCombo({ key: 'z', ctrlKey: true }, { key: 'z', ctrl: true, shift: true }), 'missing shift');

assert(formatCombo({ key: 's', ctrl: true }, false) === 'Ctrl+S', 'win label');
assert(formatCombo({ key: 's', ctrl: true }, true) === 'Cmd+S', 'mac label');
assert(formatCombo({ key: 'v', ctrl: true, shift: true }, false) === 'Ctrl+Shift+V', 'paste style label');
assert(formatCombo({ key: 'escape' }, false) === 'Esc', 'escape label');

assert(matchScore('home', 'Home', 'page') > matchScore('home', 'About'), 'prefix/exact ranks higher');
assert(matchScore('site set', 'Site Settings') > 0, 'multi-word match');
assert(matchScore('zzz', 'Home') === 0, 'no match is 0');
assert(matchScore('', 'Home') === 1, 'empty query matches');

const ids = defaultShortcutDefs().map((d) => d.id);
['save', 'copy', 'paste', 'copy_style', 'paste_style', 'copy_all', 'paste_all', 'reset_style', 'navigator', 'responsive', 'library', 'history', 'preview', 'delete', 'escape', 'finder', 'shortcuts'].forEach((id) => {
	assert(ids.includes(id), 'default shortcut ' + id);
});
assert(defaultShortcutDefs().find((d) => d.id === 'finder').combo.key === 'e', 'finder is ctrl+e');
assert(defaultShortcutDefs().find((d) => d.id === 'shortcuts').combo.key === '?', 'cheat sheet is ctrl+?');
assert(normalizeCombo({ key: 'E', ctrl: 1 }).key === 'e', 'normalize key');

if (failed) {
	console.log('FAILED', failed);
	process.exit(1);
}
console.log('OK');
