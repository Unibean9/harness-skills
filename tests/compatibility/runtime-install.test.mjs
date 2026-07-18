import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repo = fileURLToPath(new URL("../..", import.meta.url));
// npm-cli.js lives next to node.exe on Windows but under <prefix>/lib on
// Unix -- probe both layouts instead of assuming one platform's.
const npmCli = [
  join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
  join(dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
].find((candidate) => existsSync(candidate));

test("packed runtime installs without network and hs resolves from a nested project directory", () => {
  assert.ok(npmCli, "could not locate npm-cli.js next to the node binary");
  const packDir = mkdtempSync(join(tmpdir(), "harness-pack-"));
  const project = mkdtempSync(join(tmpdir(), "harness-install-")); const nested = join(project, "nested", "cwd"); mkdirSync(nested, { recursive: true });
  writeFileSync(join(project, "package.json"), "{\"private\":true}\n");
  execFileSync(process.execPath, [npmCli, "pack", "--pack-destination", packDir], { cwd: repo, stdio: "ignore" });
  const archive = join(packDir, "harness-skills-2.0.0.tgz"); assert.ok(existsSync(archive));
  execFileSync(process.execPath, [npmCli, "install", "--ignore-scripts", "--no-package-lock", "--no-audit", "--no-fund", archive], { cwd: project, stdio: "ignore" });
  for (const skill of ["hs-brainstorm", "hs-plan", "hs-build", "hs-verify", "hs-review", "hs-ship"]) {
    assert.ok(existsSync(join(project, "node_modules", "harness-skills", "skills", skill, "SKILL.md")));
  }
  const hs = join(project, "node_modules", "harness-skills", "bin", "hs.mjs");
  const init = spawnSync(process.execPath, [hs, "init"], { cwd: project, encoding: "utf8", shell: false });
  assert.equal(init.status, 0, init.stderr);
  const result = spawnSync(process.execPath, [hs, "status"], { cwd: nested, encoding: "utf8", shell: false });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /phase: none/);
  assert.ok(existsSync(join(project, ".harness", "specs", "INDEX.md")));
});
