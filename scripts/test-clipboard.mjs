import {
	CLIPBOARD_SCHEMA,
	versionCompare,
	emptyClipboard,
	migrateBreakpointMap,
	migrateRepeaters,
	parseShadow,
	migrateGroupSettings,
	migrateNode,
	migrateClipboard,
	packClipboard
} from '../src/editor/clipboard.js';

let failed = 0;
function assert(cond, msg) {
	if (cond) {
		console.log('ok', msg);
		return;
	}
	failed++;
	console.log('FAIL', msg);
}

assert(versionCompare('2.1', '2.6') < 0, '2.1 < 2.6');
assert(versionCompare('2.6', '2.6') === 0, '2.6 == 2.6');
assert(versionCompare('2.6', '2.5') > 0, '2.6 > 2.5');

const empty = emptyClipboard();
assert(empty.schema === CLIPBOARD_SCHEMA && empty.unit === null, 'empty clipboard');

assert(migrateBreakpointMap({ desktop: '10px', tablet: '8px', junk: 1 }).junk == null, 'drops unknown bp keys');
assert(migrateBreakpointMap({ desktop: '10px', tablet: '8px' }).tablet === '8px', 'keeps tablet');

const acc = migrateRepeaters({ type: 'accordion', settings: { items: 'One|Hello\nTwo|World' } });
assert(Array.isArray(acc.settings.items) && acc.settings.items.length === 2 && acc.settings.items[0].title === 'One', 'pipe accordion → repeater');

const tog = migrateRepeaters({ type: 'toggle', settings: { title: 'Q', text: 'A' } });
assert(Array.isArray(tog.settings.items) && tog.settings.items[0].content === 'A', 'legacy toggle title/text → items');

const shadow = parseShadow('10px 4px 8px 2px rgba(0,0,0,.2) inset');
assert(shadow.x === 10 && shadow.y === 4 && shadow.blur === 8 && shadow.spread === 2 && shadow.inset, 'parse box shadow');

const groups = migrateGroupSettings({
	transform: 'translate(10px, 4px) rotate(15deg) scale(1.2, 1.2)',
	filter: 'blur(4px) brightness(1.1)',
	text_shadow: '1px 2px 3px #111',
	background: '#222'
});
assert(groups.transform.translate_x === '10px' && groups.transform.rotate === '15deg', 'transform string → object');
assert(groups.filter.blur === '4px' && groups.filter.brightness === '1.1', 'filter string → object');
assert(groups.text_shadow.x === 1 && groups.text_shadow.color === '#111', 'text-shadow string → object');
assert(groups.background.type === 'classic' && groups.background.color === '#222', 'hex background → classic');

const oldNode = migrateNode({
	type: 'accordion',
	settings: { items: 'Title|Body', transform: 'rotate(9deg)' }
}, '2.1');
assert(Array.isArray(oldNode.settings.items) && oldNode.settings.transform.rotate === '9deg', 'node migrates repeater + groups from 2.1');

const packed = packClipboard({ unit: { type: 'heading', settings: {} } }, '2.6');
assert(packed.schema === '2.6' && packed.unit.type === 'heading', 'pack tags schema');

const migrated = migrateClipboard({
	schema: '2.1',
	unit: { type: 'icon_list', settings: { items: 'Home|star|#\nAbout|user|#' } },
	style: { transform: 'translateX(8px)' }
}, '2.6');
assert(migrated.schema === '2.6', 'clipboard schema bumped');
assert(migrated.unit.settings.items[1].text === 'About', 'clipboard unit migrated');
assert(migrated.style.transform.translate_x === '8px', 'clipboard style migrated');

const current = migrateClipboard({ schema: '2.6', unit: { type: 'heading', settings: { transform: 'leave-me' } } }, '2.6');
assert(current.unit.settings.transform === 'leave-me', 'current schema is not re-migrated');

const page = migrateClipboard({
	schema: '2.1',
	page: [{ type: 'toggle', settings: { title: 'Q', text: 'A', filter: 'blur(2px)' } }]
}, '2.6');
assert(page.page[0].settings.items[0].title === 'Q', 'page clipboard migrates toggle items');
assert(page.page[0].settings.filter.blur === '2px', 'page clipboard migrates groups');

const packedStyle = packClipboard({ style: { color: '#111' } }, '2.6');
assert(packedStyle.unit === null && packedStyle.style.color === '#111', 'pack keeps unused slots null');

if (failed) {
	console.log('FAILED', failed);
	process.exit(1);
}
console.log('OK');
