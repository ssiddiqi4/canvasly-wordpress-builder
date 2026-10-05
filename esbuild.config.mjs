import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

const options = {
	absWorkingDir: root,
	entryPoints: ['src/editor/index.js'],
	bundle: true,
	format: 'iife',
	platform: 'browser',
	target: ['es2020'],
	outfile: 'assets/js/editor.js',
	minify: false,
	legalComments: 'inline',
	charset: 'utf8',
	banner: {
		js: '/* Sidcraft Page Builder editor bundle. Source: src/editor/. Rebuild with `npm run build`. */',
	},
};

if (watch) {
	const ctx = await esbuild.context(options);
	await ctx.watch();
	console.log('Watching src/editor → assets/js/editor.js');
} else {
	await esbuild.build(options);
	console.log('Built assets/js/editor.js');
}
