import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
const repo = new URL("../..", import.meta.url).pathname.slice(1);
test("Node utilities allocate IDs and record check failures without Bash", () => {
  const cwd = mkdtempSync(join(tmpdir(), "harness-portable-")); mkdirSync(join(cwd, ".harness", "specs", "007-test"), { recursive: true });
  const id = spawnSync(process.execPath, [join(repo, ".agents/scripts/next-spec-id.mjs")], { cwd, encoding: "utf8" }); assert.equal(id.stdout.trim(), "008");
  const check = spawnSync(process.execPath, [join(repo, ".agents/scripts/run-check.mjs"), "failure", "--", process.execPath, "-e", "process.exit(3)"], { cwd });
  assert.equal(check.status, 3); assert.equal(readFileSync(join(cwd, ".harness/state/failure.status"), "utf8").trim(), "FAIL");
});
