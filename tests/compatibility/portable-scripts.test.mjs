import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const repo = fileURLToPath(new URL("../..", import.meta.url));
test("Node utilities allocate IDs and record check failures without Bash", () => {
  const cwd = mkdtempSync(join(tmpdir(), "harness-portable-")); mkdirSync(join(cwd, ".harness", "specs", "007-test"), { recursive: true });
  const id = spawnSync(process.execPath, [join(repo, "scripts/next-spec-id.mjs"), "test"], { cwd, encoding: "utf8" }); assert.equal(id.stdout.trim(), "008-test");
  writeFileSync(join(cwd, ".harness", "specs", "007-test", "verify.json"), JSON.stringify({ version: 2, requirements: ["REQ-TEST"], checks: [{ label: "failure", kind: "machine", argv: [process.execPath, "-e", "process.exit(3)"], stages: ["final"], covers: ["REQ-TEST"] }] }));
  execFileSync("git", ["init"], { cwd }); writeFileSync(join(cwd, ".gitignore"), ".harness/\n"); writeFileSync(join(cwd, "a.txt"), "a"); execFileSync("git", ["add", "."], { cwd }); execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd });
  const check = spawnSync(process.execPath, [join(repo, "scripts/run-check.mjs"), "--spec", "007-test", "--stage", "final", "--label", "failure"], { cwd });
  assert.equal(check.status, 3); assert.equal(readFileSync(join(cwd, ".harness/state/specs/007-test/checks/final-failure.status"), "utf8").trim(), "FAIL");
});
