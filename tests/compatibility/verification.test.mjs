import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { validateAttestation, createAttestation } from "../../scripts/attestation.mjs";
import { runCheck, runManualCheck } from "../../scripts/run-check.mjs";
import { fingerprintWorktree } from "../../scripts/worktree.mjs";

function initSpecRoot() {
  const root = mkdtempSync(join(tmpdir(), "harness-attest-"));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  mkdirSync(join(root, ".harness", "specs", "001-test"), { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), "001-test\n");
  execFileSync("git", ["init"], { cwd: root });
  writeFileSync(join(root, ".gitignore"), ".harness/state/\n");
  writeFileSync(join(root, "a.txt"), "a");
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd: root });
  return root;
}

test("attestation binds a recorded check to the selected spec and exact worktree", () => {
  const root = initSpecRoot();
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createAttestation(root, "001-test");
  assert.equal(validateAttestation(root, "001-test"), true);
  writeFileSync(join(root, "a.txt"), "changed");
  assert.equal(validateAttestation(root, "001-test"), false);
});

test("run-check records provenance and rejects a command that changes the active worktree", () => {
  const root = initSpecRoot();
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  const checkDir = join(root, ".harness", "state", "specs", "001-test", "checks");
  const passing = JSON.parse(readFileSync(join(checkDir, "verify-tests.json"), "utf8"));
  assert.equal(passing.pass, true); assert.equal(passing.spec, "001-test"); assert.equal(passing.fingerprintBefore, passing.fingerprintAfter);
  const mutating = runCheck(root, "001-test", "verify-mutating", [process.execPath, "-e", "require('node:fs').writeFileSync('a.txt', 'changed')"]);
  assert.equal(mutating.pass, false); assert.equal(mutating.worktreeChanged, true);
  assert.equal(JSON.parse(readFileSync(join(checkDir, "verify-mutating.json"), "utf8")).worktreeChanged, true);
});

test("attest rejects evidence recorded before the worktree changed", () => {
  const root = initSpecRoot();
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  writeFileSync(join(root, "a.txt"), "changed after check");
  assert.throws(() => createAttestation(root, "001-test"), /does not prove the current worktree/);
});

test("attest requires at least one verify-* check and fails if any isn't PASS", () => {
  const root = initSpecRoot();
  assert.throws(() => createAttestation(root, "001-test"), /no verification checks have been recorded yet/);
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(1)"]);
  assert.throws(() => createAttestation(root, "001-test"), /check did not pass/);
});

test("manual checks stay explicit and combine with machine checks in one attestation", () => {
  const root = initSpecRoot();
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  runManualCheck(root, "001-test", "verify-ux", "PASS", "user confirmed the layout looks right");
  const record = createAttestation(root, "001-test");
  assert.deepEqual(record.checks.map((check) => check.kind).sort(), ["machine", "manual"]);
  assert.equal(validateAttestation(root, "001-test"), true);
});

test("fingerprintWorktree ignores the harness runtime state directory", () => {
  const root = initSpecRoot();
  const before = fingerprintWorktree(root);
  mkdirSync(join(root, ".harness", "state", "specs", "001-test", "checks"), { recursive: true });
  writeFileSync(join(root, ".harness", "state", "specs", "001-test", "checks", "verify-tests.status"), "PASS\n");
  assert.equal(fingerprintWorktree(root), before);
  writeFileSync(join(root, "a.txt"), "product update");
  assert.notEqual(fingerprintWorktree(root), before);
});
