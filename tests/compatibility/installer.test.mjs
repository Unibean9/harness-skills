import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (path) => readFileSync(join(repo, path), "utf8");

test("installers preflight non-harness targets and require an explicit force option", () => {
  const powershell = read("install.ps1");
  const shell = read("install.sh");
  assert.match(powershell, /\[switch\]\$Force/);
  assert.match(powershell, /refusing to replace non-harness target/);
  assert.match(powershell, /Test-HarnessJunction/);
  assert.match(shell, /--force/);
  assert.match(shell, /refusing to replace non-harness target/);
  assert.match(shell, /conflicts/);
});

test("PowerShell installer preserves a user skill unless -Force is supplied", { skip: process.platform !== "win32" }, () => {
  const fixture = mkdtempSync(join(tmpdir(), "harness-installer-"));
  cpSync(join(repo, "install.ps1"), join(fixture, "install.ps1"));
  mkdirSync(join(fixture, ".agents", "skills", "example"), { recursive: true });
  mkdirSync(join(fixture, ".agents", "agents"), { recursive: true });
  mkdirSync(join(fixture, ".agents", "scripts"), { recursive: true });
  writeFileSync(join(fixture, ".agents", "skills", "example", "SKILL.md"), "# canonical\n");
  writeFileSync(join(fixture, ".agents", "agents", "hs-scout.md"), "# canonical scout\n");
  cpSync(join(repo, ".agents", "scripts", "generate-claude-scout.mjs"), join(fixture, ".agents", "scripts", "generate-claude-scout.mjs"));
  mkdirSync(join(fixture, ".claude", "skills", "example"), { recursive: true });
  writeFileSync(join(fixture, ".claude", "skills", "example", "SKILL.md"), "# user-owned\n");

  const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(fixture, "install.ps1")];
  const rejected = spawnSync("powershell.exe", args, { cwd: fixture, encoding: "utf8" });
  assert.notEqual(rejected.status, 0);
  assert.equal(readFileSync(join(fixture, ".claude", "skills", "example", "SKILL.md"), "utf8"), "# user-owned\n");
  const forced = spawnSync("powershell.exe", [...args, "-Force"], { cwd: fixture, encoding: "utf8" });
  assert.equal(forced.status, 0, forced.stderr);
  assert.equal(readFileSync(join(fixture, ".claude", "skills", "example", "SKILL.md"), "utf8"), "# canonical\n");
});

test("the Claude scout adapter is generated from the canonical scout role", () => {
  const generator = read(".agents/scripts/generate-claude-scout.mjs");
  const adapter = read(".claude/agents/hs-scout.md");
  const canonical = read(".agents/agents/hs-scout.md");
  assert.match(generator, /\.agents", "agents", "hs-scout\.md/);
  assert.match(adapter, /GENERATED from \.agents\/agents\/hs-scout\.md/);
  assert.ok(adapter.endsWith(canonical));
});
