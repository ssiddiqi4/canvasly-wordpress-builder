// Checks that a refactor of src/editor/ did not change what the editor bundle does.
//
//   node scripts/compare-bundle.mjs [git-ref]   (default: origin/main)
//
// Parses assets/js/editor.js at <git-ref> and in the working tree and compares their
// syntax trees, ignoring what a move or reformat legitimately changes: comments,
// formatting, positions, quotes on object keys, regex flag order, regrouping of
// a || b || c chains, and the names esbuild picks for local variables.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import * as acorn from "acorn";
import * as escope from "eslint-scope";

const BUNDLE = "assets/js/editor.js";
const ref = process.argv[2] || "origin/main";

const norm = (n) => {
  if (Array.isArray(n)) return n.map(norm);
  if (!n || typeof n !== "object") return n;
  if (n.type === "LogicalExpression") {
    const items = [];
    const flat = (x) =>
      x.type === "LogicalExpression" && x.operator === n.operator ? (flat(x.left), flat(x.right)) : items.push(norm(x));
    flat(n);
    return { items, operator: n.operator, type: "LogicalChain" };
  }
  const o = {};
  for (const k of Object.keys(n).sort()) {
    if (["start", "end", "raw", "range", "shorthand"].includes(k)) continue;
    o[k] = norm(n[k]);
  }
  if (
    ["Property", "PropertyDefinition", "MethodDefinition"].includes(o.type) &&
    !o.computed &&
    o.key?.type === "Literal"
  ) {
    o.key = { name: String(o.key.value), type: "Identifier" };
  }
  if (o.type === "Literal" && o.regex) {
    o.regex = { flags: [...o.regex.flags].sort().join(""), pattern: o.regex.pattern };
    delete o.value;
  }
  return o;
};

const tree = (code) => {
  const ast = acorn.parse(code, { ecmaVersion: "latest", ranges: true });
  let c = 0;
  for (const scope of escope.analyze(ast, { ecmaVersion: 2022 }).scopes) {
    if (scope.type === "global") continue;
    for (const v of scope.variables) {
      if (v.name === "arguments") continue;
      const name = "$v" + c++;
      v.identifiers.forEach((id) => (id.name = name));
      v.references.forEach((r) => (r.identifier.name = name));
    }
  }
  return norm(ast);
};

const firstDiff = (a, b, path) => {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a && b && typeof a === "object" && typeof b === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDiff(a[k], b[k], path + "." + k);
      if (d) return d;
    }
  }
  return `${path}\n  ${ref}: ${String(JSON.stringify(a)).slice(0, 300)}\n  working tree: ${String(JSON.stringify(b)).slice(0, 300)}`;
};

const before = tree(execFileSync("git", ["show", `${ref}:${BUNDLE}`], { encoding: "utf8", maxBuffer: 64 << 20 }));
const after = tree(readFileSync(BUNDLE, "utf8"));
const diff = firstDiff(before, after, "program");
if (diff) {
  console.error(`${BUNDLE} behaves differently from ${ref}. First difference at:\n${diff}`);
  process.exit(1);
}
console.log(`${BUNDLE} is equivalent to ${ref}.`);
