import { applyCounterLive, formatCounterNumber, isCounterSliderKey } from '../src/editor/counter-live.js';

let failed = 0;
function assert(cond, msg) {
	if (cond) {
		console.log('ok', msg);
		return;
	}
	failed++;
	console.log('FAIL', msg);
}

assert(formatCounterNumber(100, '') === '100', 'plain end number');
assert(formatCounterNumber(1234, ',') === '1,234', 'thousand separator');
assert(formatCounterNumber(-12.5, ' ') === '-12.5', 'negative decimal keeps sign');
assert(isCounterSliderKey('number') && isCounterSliderKey('number_size'), 'number sliders are live keys');
assert(!isCounterSliderKey('prefix'), 'prefix is not a slider live key');

function mockCounter(parts) {
	return {
		classList: { contains: (c) => c === 'lb-node-counter' },
		querySelector(sel) {
			if (sel === '.lb-counter') return this;
			return parts[sel] || null;
		},
		style: {
			props: {},
			setProperty(k, v) { this.props[k] = v; },
			removeProperty(k) { delete this.props[k]; }
		}
	};
}

const number = { textContent: '100' };
const prefix = { textContent: '' };
const suffix = { textContent: '+' };
const node = mockCounter({
	'.lb-counter-number': number,
	'.lb-counter-prefix': prefix,
	'.lb-counter-suffix': suffix
});
const settings = { number: 100, prefix: '', suffix: '+', thousand_separator: true, separator_char: ',' };

applyCounterLive(node, settings, 'number', 2500);
assert(number.textContent === '2,500', 'changing Number updates canvas digits');

applyCounterLive(node, settings, 'prefix', '$');
assert(prefix.textContent === '$', 'prefix updates on canvas');

applyCounterLive(node, settings, 'suffix', 'k');
assert(suffix.textContent === 'k', 'suffix updates on canvas');

applyCounterLive(node, settings, 'number_size', 64);
assert(node.style.props['--lb-counter-number-size'] === '64px', 'number size applies as canvas CSS var');

if (failed) {
	console.error(failed + ' counter live checks failed');
	process.exit(1);
}
console.log('counter live ok');
