# Sidcraft Page Builder 0.15.1 — source

The full source of the free plugin. The folder is also the plugin itself: copy it
into `wp-content/plugins/sidcraft-page-builder/` and it runs as is (the built
editor bundle is committed).

## Layout

| Path | What it is |
| --- | --- |
| `sidcraft-page-builder.php`, `includes/`, `assets/`, `languages/`, `readme.txt`, `changelog.txt`, `uninstall.php`, `wpml-config.xml`, `LICENSE.txt` | The plugin (PHP, CSS, front-end JS, data). Exactly what ships in the zip. |
| `src/editor/` | Source of the editor script. `npm run build` bundles it into `assets/js/editor.js`. |
| `esbuild.config.mjs` | Bundle settings (IIFE, ES2020, UTF-8 output, not minified). |
| `scripts/` | Editor tests, `build-zip.mjs` (packages the plugin), `compare-bundle.mjs` (checks a refactor did not change the bundle). |
| `tools/bench-editor.mjs` | Browser benchmark for editor start-up (Playwright). |
| `docs/site/` | The canvasly.pro pages added in 0.15.0: `document-format.html`, `performance.html` and the JSON Schema. |

## Commands

```bash
npm install            # esbuild 0.25, acorn, eslint-scope, playwright
npm run build          # src/editor → assets/js/editor.js
npm run test:editor    # module syntax check, unit tests for editor modules, bundle smoke test
npm run zip            # dist/sidcraft-page-builder-<version>.zip (runtime files only)
npm run release        # build + test:editor + zip
```

Use esbuild 0.25.x. Another major version formats the output differently, so the
bundle would no longer match the committed one byte for byte.

## Verified for this release

- `npm run build` reproduces the committed `assets/js/editor.js` byte for byte.
- The same source without the 0.15.x changes listed below reproduces the shipped
  0.14.4 bundle byte for byte.
- `npm run test:editor` passes (223 checks).
- `npm run zip` produces a zip whose contents are identical to the plugin tested in
  WordPress 6.9 (with and without Sidcraft Builder Pro 0.13.2).

## What changed in the editor source for 0.15.1

- `src/editor/panel.js`: the "Drag widget here" area at the bottom of the page is a
  drop target by position (`app.bindPageDropZone`, `app.dropOnPage`, `app.dragPayload`),
  listening in the capture phase on the frame window so no element or other listener
  can swallow the drop. It highlights while a unit is over it (`.is-drag-over`).

## What changed in the editor source for 0.15.0

- `src/editor/navigator-tools.js` (new): Navigator collapse/expand, rename, hide and
  lock. It must be the last installer, because it wraps `render`,
  `refreshRightPanel`, `lbPaintCanvas`, `remove`, `move`, `undo` and `redo`.
- `src/editor/index.js`: imports it and calls `installNavigatorTools()` after
  `installColorPicker()`.

The 0.14.2 to 0.14.4 fixes were also merged into `src/editor/` (Firefox-draggable unit
cards with Enter/Space to add, the unit-card right-click menu, and canvas frames
without a `<head>`). These were already in the 0.14.4 bundle but missing from the
source.

## Server-side tools

```bash
wp sidcraft-page-builder benchmark           # save, render, page-view and editor cost
wp sidcraft-page-builder schema              # JSON Schema of the saved document
wp sidcraft-page-builder fallback            # write readable copies for existing pages
wp sidcraft-page-builder convert-batch       # resumable Elementor conversion (--resume, --status)
```
