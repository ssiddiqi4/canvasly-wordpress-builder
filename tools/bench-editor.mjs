// Editor start-up benchmark for Sidcraft Page Builder.
//
// Usage:
//   1. wp sidcraft-page-builder benchmark --keep      (creates a ~200-unit page; note its ID)
//   2. node tools/bench-editor.mjs --url=https://example.test --user=admin --pass=secret --post=123 [--runs=5]
//
// Reports, for each run and as a median: time from navigation start to the
// editor being interactive (Navigator rows and canvas units all rendered),
// JavaScript heap in use, and bytes transferred for the editor scripts and styles.
// Requires: npm i -D playwright (Chromium).
import { chromium } from "playwright";

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const base = arg("url", "http://localhost:8080").replace(/\/$/, "");
const user = arg("user", "admin");
const pass = arg("pass", "admin");
const post = arg("post", "");
const runs = Number(arg("runs", "5"));
if (!post) {
  console.error("--post=<id> is required");
  process.exit(1);
}

const browser = await chromium.launch({ args: ["--enable-precise-memory-info", "--js-flags=--expose-gc"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const login = await ctx.newPage();
await login.goto(`${base}/wp-login.php`);
await login.fill("#user_login", user);
await login.fill("#user_pass", pass);
await Promise.all([login.waitForNavigation(), login.click("#wp-submit")]);
await login.close();

const editorUrl = `${base}/wp-admin/admin.php?page=sidcraft-page-builder&post_id=${post}`;
const results = [];
for (let i = 0; i < runs; i++) {
  // A fresh tab per run, so heap figures do not include earlier runs.
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.clearBrowserCache");
  const t0 = Date.now();
  await page.goto(editorUrl, { waitUntil: "domcontentloaded" });
  // Ready = every unit is painted on the canvas and listed in the Navigator.
  await page.waitForFunction(() => {
    const frame = document.getElementById("lb-editor-frame");
    const fd = frame && frame.contentDocument;
    const canvas = fd ? fd.querySelectorAll(".lb-node[data-id]").length : 0;
    const nav = document.querySelectorAll(".lb-navigator [data-tree-id]").length;
    return canvas > 0 && nav > 0 && canvas >= nav - 1;
  }, null, { timeout: 120000 });
  const ready = Date.now() - t0;
  const m = await page.evaluate(() => {
    if (window.gc) window.gc();
    const nav = performance.getEntriesByType("navigation")[0];
    const res = performance.getEntriesByType("resource").filter((r) => /sidcraft/.test(r.name) && /\.(js|css)(\?|$)/.test(r.name));
    const fd = document.getElementById("lb-editor-frame").contentDocument;
    return {
      units: fd.querySelectorAll(".lb-node[data-id]").length,
      serverMs: Math.round(nav.responseStart - nav.requestStart),
      htmlKB: +((nav.transferSize || nav.encodedBodySize || 0) / 1024).toFixed(1),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
      editorAssetsKB: +(res.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0) / 1024).toFixed(1),
    };
  });
  results.push({ run: i + 1, readyMs: ready, ...m });
  console.log(JSON.stringify(results[results.length - 1]));
  await page.close();
}
const median = (k) => {
  const v = results.map((r) => r[k]).filter((x) => x != null).sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
};
console.log(JSON.stringify({ median: { readyMs: median("readyMs"), serverMs: median("serverMs"), htmlKB: median("htmlKB"), heapMB: median("heapMB"), editorAssetsKB: median("editorAssetsKB"), units: median("units") } }));
await browser.close();
