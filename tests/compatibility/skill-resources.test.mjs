import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const phasesWithoutHelpers = ["hs-brainstorm", "hs-plan", "hs-build", "hs-review", "hs-ship"];

test("skills ship no duplicated workflow helpers", () => {
  for (const skill of phasesWithoutHelpers) assert.equal(existsSync(join(repo, "skills", skill, "scripts")), false);
  assert.ok(existsSync(join(repo, "skills", "hs-verify", "scripts", "fingerprint-worktree.mjs")));
});

test("the optional verify fingerprint works from a detached skill install", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-skill-resource-"));
  const project = join(root, "project");
  const bundle = join(root, "bundle");
  execFileSync("git", ["init", project]);
  writeFileSync(join(project, "a.txt"), "a");
  execFileSync("git", ["add", "."], { cwd: project });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd: project });
  cpSync(join(repo, "skills", "hs-verify", "scripts"), join(bundle, "scripts"), { recursive: true });
  const result = spawnSync(process.execPath, [join(bundle, "scripts", "fingerprint-worktree.mjs")], { cwd: project, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^[a-f0-9]{64}$/);
});
