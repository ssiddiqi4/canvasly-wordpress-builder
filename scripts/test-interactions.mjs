import { app } from '../src/editor/app.js';
import { fxCatalog, fxDefault, fxList, fxTitle, fxPreviewClasses } from '../src/editor/interactions.js';

let failed = 0;
function assert(cond, msg) {
	if (cond) {
		console.log('ok', msg);
		return;
	}
	failed++;
	console.log('FAIL', msg);
}

app.D = {
	interactions: {
		presets: [
			{ id: 'fade', label: 'Fade', group: 'fade' },
			{ id: 'slide-up', label: 'Slide Up', group: 'slide' }
		],
		groups: { fade: 'Fading', slide: 'Sliding' },
		triggers: { viewport: 'In Viewport', hover: 'Hover' },
		kinds: { entrance: 'Entrance', exit: 'Exit', custom: 'Custom Keyframes' },
		easings: { ease: 'Ease' }
	}
};
app.t = (k) => k;
app.eid = () => 'i_test';

const cat = fxCatalog();
assert(cat.presets.length === 2, 'catalog reads localized presets');
assert(cat.triggers.viewport === 'In Viewport', 'catalog reads triggers');

const def = fxDefault();
assert(def.kind === 'entrance' && def.trigger === 'viewport' && def.effect === 'fade', 'default interaction');
assert(Array.isArray(def.keyframes) && def.keyframes.length === 2, 'default custom keyframes');

const fromSettings = fxList({ settings: { interaction: 'slide-up', interaction_trigger: 'hover' }, interactions: [] });
assert(fromSettings[0].effect === 'slide-up' && fromSettings[0].trigger === 'hover', 'legacy settings become a list item');

const fromNode = fxList({ interactions: [{ kind: 'exit', effect: 'fade', trigger: 'viewport' }] });
assert(fromNode.length === 1 && fromNode[0].kind === 'exit', 'node.interactions wins');

assert(fxTitle({ kind: 'entrance', effect: 'fade', trigger: 'viewport' }, 0).includes('Entrance'), 'title uses kind label');
assert(fxPreviewClasses({ kind: 'exit', effect: 'slide-up', trigger: 'viewport' }).includes('lb-fx-exit'), 'exit preview class');
assert(fxPreviewClasses({ kind: 'custom', effect: 'custom' }).includes('lb-fx-custom-0'), 'custom preview class');
assert(fxPreviewClasses({ effect: 'fade-up' }).includes('lb-fx-fade-up'), 'preset preview class');

console.log(failed ? `FAILED ${failed}` : 'OK');
process.exit(failed ? 1 : 0);
