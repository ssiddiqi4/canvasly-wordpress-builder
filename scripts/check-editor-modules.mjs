import * as acorn from 'acorn';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/editor');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
let failed = 0;
for (const f of files) {
	const code = fs.readFileSync(path.join(dir, f), 'utf8');
	try {
		acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
		console.log('ok', f);
	} catch (e) {
		failed++;
		console.log('FAIL', f, e.message);
	}
}
process.exit(failed ? 1 : 0);
