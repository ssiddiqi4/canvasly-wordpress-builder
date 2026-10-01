// Builds assets/js/editor.js from src/editor/. `--check` builds in memory and fails
// if the committed bundle does not match the source.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const outfile = "assets/js/editor.js";
const check = process.argv.includes("--check");

const result = await build({
  entryPoints: ["src/editor/index.js"],
  bundle: true,
  format: "iife",
  charset: "utf8",
  banner: { js: "/* Sidcraft Page Builder editor bundle. Source: src/editor/. Rebuild with `npm run build`. */" },
  outfile,
  write: !check,
  logLevel: "warning",
});

if (check) {
  const built = result.outputFiles[0].text;
  if (built !== readFileSync(outfile, "utf8")) {
    console.error(outfile + " does not match src/editor/. Run `npm run build` and commit the result.");
    process.exit(1);
  }
  console.log(outfile + " matches src/editor/.");
}
