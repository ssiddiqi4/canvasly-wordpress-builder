// Package the installable plugin: dist/sidcraft-page-builder-<version>.zip
// with a single sidcraft-page-builder/ folder and only the runtime files.
// Uses the system `zip` command (Git for Windows, macOS and Linux have it;
// on Windows without it, PowerShell's Compress-Archive is used instead).
import { cpSync, mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const main = readFileSync(path.join(root, "sidcraft-page-builder.php"), "utf8");
const version = (main.match(/^\s*\*\s*Version:\s*([0-9.]+)/m) || [])[1];
if (!version) throw new Error("Version header not found in sidcraft-page-builder.php");

// Runtime files only. src/, scripts/, tools/, docs/ and build config stay out.
const include = ["assets", "includes", "languages", "LICENSE.txt", "changelog.txt", "readme.txt", "sidcraft-page-builder.php", "uninstall.php", "wpml-config.xml"];

const stage = path.join(root, "dist", ".stage");
const slug = path.join(stage, "sidcraft-page-builder");
rmSync(stage, { recursive: true, force: true });
mkdirSync(slug, { recursive: true });
for (const f of include) {
  const from = path.join(root, f);
  if (existsSync(from)) cpSync(from, path.join(slug, f), { recursive: true });
}
const out = path.join(root, "dist", `sidcraft-page-builder-${version}.zip`);
rmSync(out, { force: true });
try {
  execFileSync("zip", ["-qr", "-X", out, "sidcraft-page-builder", "-x", "*.DS_Store"], { cwd: stage, stdio: "inherit" });
} catch {
  execFileSync("powershell", ["-NoProfile", "-Command", `Compress-Archive -Path '${slug}' -DestinationPath '${out}' -Force`], { stdio: "inherit" });
}
rmSync(stage, { recursive: true, force: true });
console.log(`Built ${path.relative(root, out)}`);
