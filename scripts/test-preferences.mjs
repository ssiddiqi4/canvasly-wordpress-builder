import {
	PREF_DEFAULTS,
	clampInt,
	toBool,
	normalizePreferences,
	channelToHex,
	rgbToHex,
	parsePickedColor,
	colorFromComputed,
	sampleColorAtPoint
} from '../src/editor/preferences.js';

let failed = 0;
function assert(cond, msg) {
	if (cond) {
		console.log('ok', msg);
		return;
	}
	failed++;
	console.log('FAIL', msg);
}

assert(PREF_DEFAULTS.autosave_interval === 15, 'default autosave is 15 seconds');
assert(normalizePreferences(null).panel_width === 330, 'null prefs use defaults');
assert(normalizePreferences({ ui_theme: 'dark' }).ui_theme === 'dark', 'keeps dark theme');
assert(normalizePreferences({ ui_theme: 'neon' }).ui_theme === 'auto', 'invalid theme falls back');
assert(normalizePreferences({ navigator_default: 'closed' }).navigator_default === 'closed', 'navigator closed');
assert(normalizePreferences({ navigator_default: 'maybe' }).navigator_default === 'open', 'invalid navigator falls back');
assert(normalizePreferences({ panel_width: 50 }).panel_width === 190, 'panel width min 190');
assert(normalizePreferences({ panel_width: 900 }).panel_width === 520, 'panel width max 520');
assert(normalizePreferences({ autosave_interval: 0 }).autosave_interval === 5, 'interval min 5');
assert(normalizePreferences({ autosave_interval: 99 }).autosave_interval === 60, 'interval max 60');
assert(normalizePreferences({ show_handles: false }).show_handles === false, 'handles off');
assert(normalizePreferences({ autosave: '0' }).autosave === false, 'autosave string 0 is false');
assert(toBool('false', true) === false, 'toBool false string');
assert(toBool(null, true) === true, 'toBool null uses fallback');
assert(clampInt('x', 1, 10, 4) === 4, 'clampInt non-numeric fallback');

assert(channelToHex(15) === '0f', 'channel pad');
assert(rgbToHex(255, 0, 128) === '#ff0080', 'rgbToHex');
assert(parsePickedColor('#abc') === '#aabbcc', 'expands 3-digit hex');
assert(parsePickedColor('#AABBCCDD') === '#aabbcc', 'strips alpha hex');
assert(parsePickedColor('rgb(0, 128, 255)') === '#0080ff', 'parses rgb()');
assert(parsePickedColor('rgba(255, 0, 0, 0.5)') === '#ff0000', 'parses rgba()');
assert(parsePickedColor('transparent') === '', 'transparent is empty');
assert(parsePickedColor('color(srgb 1 0 0)') === '#ff0000', 'parses color(srgb)');
assert(colorFromComputed({ backgroundColor: 'rgba(0, 0, 0, 0)', color: '#112233' }) === '#112233', 'falls through to color');

const fakeFrame = {
	getBoundingClientRect() { return { left: 10, right: 110, top: 10, bottom: 110 }; },
	contentDocument: {
		elementFromPoint() {
			return { tagName: 'DIV', parentElement: null };
		},
		defaultView: {
			getComputedStyle() { return { backgroundColor: 'rgb(10, 20, 30)', borderTopColor: 'transparent', color: '#000' }; }
		},
		documentElement: {}
	}
};
assert(sampleColorAtPoint(20, 20, fakeFrame, fakeFrame.contentDocument) === '#0a141e', 'samples iframe computed color');
assert(sampleColorAtPoint(0, 0, fakeFrame, fakeFrame.contentDocument) === '', 'outside iframe without document.elementFromPoint');

console.log(failed ? `FAILED ${failed}` : 'OK');
process.exit(failed ? 1 : 0);
