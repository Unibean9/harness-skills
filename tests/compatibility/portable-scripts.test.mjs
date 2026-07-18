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
  const reserve = spawnSync(process.execPath, [join(repo, "scripts/state.mjs"), "reserve", "test"], { cwd, encoding: "utf8" });
  assert.equal(reserve.stdout.trim(), "008-test");
  mkdirSync(join(cwd, ".harness", "state"), { recursive: true });
  writeFileSync(join(cwd, ".harness", "state", "current-spec"), "007-test\n");
  execFileSync("git", ["init"], { cwd }); writeFileSync(join(cwd, ".gitignore"), ".harness/state/\n"); writeFileSync(join(cwd, "a.txt"), "a"); execFileSync("git", ["add", "."], { cwd }); execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd });
  const check = spawnSync(process.execPath, [join(repo, "scripts/run-check.mjs"), "failure", "--", process.execPath, "-e", "process.exit(3)"], { cwd });
  assert.equal(check.status, 3);
  assert.equal(readFileSync(join(cwd, ".harness/state/specs/007-test/checks/failure.status"), "utf8").trim(), "FAIL");
});

test("the --trivial CLI branches of run-check.mjs and attestation.mjs work end to end, with no spec required", () => {
  const cwd = mkdtempSync(join(tmpdir(), "harness-portable-trivial-"));
  execFileSync("git", ["init"], { cwd });
  writeFileSync(join(cwd, "a.txt"), "a");
  execFileSync("git", ["add", "."], { cwd });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd });

  const check = spawnSync(process.execPath, [join(repo, "scripts/run-check.mjs"), "--trivial", "verify-tests", "--", process.execPath, "-e", "process.exit(0)"], { cwd, encoding: "utf8" });
  assert.equal(check.status, 0);
  assert.match(check.stdout, /PASS.*\[trivial\]/);

  const attest = spawnSync(process.execPath, [join(repo, "scripts/attestation.mjs"), "--trivial", "attest"], { cwd, encoding: "utf8" });
  assert.equal(attest.status, 0);
  assert.match(attest.stdout, /attested \(trivial\)/);

  const validate = spawnSync(process.execPath, [join(repo, "scripts/attestation.mjs"), "--trivial", "validate"], { cwd, encoding: "utf8" });
  assert.equal(validate.status, 0);
  assert.match(validate.stdout, /^VALID/);

  // A failing trivial check must exit non-zero and print the [trivial] tag too.
  const failing = spawnSync(process.execPath, [join(repo, "scripts/run-check.mjs"), "--trivial", "verify-lint", "--", process.execPath, "-e", "process.exit(2)"], { cwd, encoding: "utf8" });
  assert.equal(failing.status, 2);
  assert.match(failing.stdout, /FAIL.*\[trivial\]/);
});
