/**
 * Smoke-test the committed editor bundle: hooks exist without #lb-editor,
 * and boot does not throw.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = fs.readFileSync(path.join(root, 'assets', 'js', 'editor.js'), 'utf8');

function run(hasEditor) {
	const el = hasEditor
		? {
				id: 'lb-editor',
				dataset: { document: '{"version":"2.2","root":[],"settings":{}}', postId: '1' },
				querySelector() { return null; },
				querySelectorAll() { return []; },
				addEventListener() {},
				insertAdjacentHTML() {},
				set innerHTML(_v) {},
				get innerHTML() { return ''; },
			}
		: null;
	const doc = {
		getElementById: (id) => (id === 'lb-editor' ? el : null),
		querySelector: () => null,
		querySelectorAll: () => [],
		createElement: (tag) => ({ tagName: String(tag).toUpperCase(), style: {}, appendChild() {}, setAttribute() {}, addEventListener() {} }),
		addEventListener() {},
		head: { appendChild() {} },
		body: { appendChild() {}, classList: { add() {}, remove() {} } },
		readyState: 'complete',
	};
	const window = {
		console,
		document: doc,
		addEventListener() {},
		SidcraftPageBuilderData: { i18n: {}, units: [], api: '/wp-json/sidcraft-page-builder/v1', nonce: 'n', postId: 1, schema: '2.6' },
	};
	window.window = window;
	doc.defaultView = window;
	vm.runInNewContext(code + '\nthis.__LB = this.window.SidcraftPageBuilder;', window, { filename: 'editor.js' });
	return window.SidcraftPageBuilder;
}

const off = run(false);
if (!off || typeof off.hooks?.addAction !== 'function' || typeof off.registerControl !== 'function') {
	throw new Error('hooks/registerControl missing when #lb-editor is absent');
}
if (typeof off.render === 'function') {
	throw new Error('editor boot should not attach LB.render without #lb-editor');
}
off.hooks.addAction('t', () => {});
if (!off.hooks.hasAction('t')) throw new Error('addAction/hasAction failed');
console.log('ok: hooks without editor root');
