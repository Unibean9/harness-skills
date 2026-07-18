import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { validateAttestation, createAttestation, createTrivialAttestation, validateTrivialAttestation, explainAttestationValidity, explainTrivialAttestationValidity } from "../../scripts/attestation.mjs";
import { runCheck, runManualCheck, runTrivialCheck } from "../../scripts/run-check.mjs";
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

test("verify.json manifest fails attest when a declared check hasn't been run", () => {
  const root = initSpecRoot();
  writeFileSync(
    join(root, ".harness", "specs", "001-test", "verify.json"),
    JSON.stringify({ checks: [{ label: "verify-tests" }, { label: "verify-lint" }] })
  );
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  // verify-lint was declared but never run -- this is exactly the gap a
  // manifest exists to close: "which checks you ran is still judgment,
  // nothing catches a skipped check for you" becomes untrue once declared.
  assert.throws(() => createAttestation(root, "001-test"), /requires checks that haven't been run: verify-lint/);
  runCheck(root, "001-test", "verify-lint", [process.execPath, "-e", "process.exit(0)"]);
  assert.doesNotThrow(() => createAttestation(root, "001-test"));
});

test("verify.json rejects malformed entries with a specific reason instead of a confusing downstream error", () => {
  const root = initSpecRoot();
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);

  writeFileSync(join(root, ".harness", "specs", "001-test", "verify.json"), JSON.stringify({ checks: ["verify-tests"] }));
  assert.throws(() => createAttestation(root, "001-test"), /must be an object with a string "label"/);

  writeFileSync(join(root, ".harness", "specs", "001-test", "verify.json"), JSON.stringify({ checks: [{ label: "task-1" }] }));
  assert.throws(() => createAttestation(root, "001-test"), /must start with "verify-"/);
});

test("attest works without a verify.json manifest, same as before it existed", () => {
  const root = initSpecRoot();
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  assert.doesNotThrow(() => createAttestation(root, "001-test"));
});

test("manual checks stay explicit and combine with machine checks in one attestation", () => {
  const root = initSpecRoot();
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  runManualCheck(root, "001-test", "verify-ux", "PASS", "user confirmed the layout looks right");
  const record = createAttestation(root, "001-test");
  assert.deepEqual(record.checks.map((check) => check.kind).sort(), ["machine", "manual"]);
  assert.equal(validateAttestation(root, "001-test"), true);
});

test("trivial attestation works without any active spec -- the AGENTS.md one-line-change exemption had no path to a real attestation before this", () => {
  const root = initSpecRoot();
  // Deliberately no active spec, no plan, nothing -- initSpecRoot() sets one
  // up, but trivial mode must work even if we ignore all of it.
  runTrivialCheck(root, "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  const record = createTrivialAttestation(root);
  assert.equal(record.trivial, true);
  assert.equal(validateTrivialAttestation(root), true);
});

test("trivial attestation is invalidated by a worktree change, same as a spec-bound one", () => {
  const root = initSpecRoot();
  runTrivialCheck(root, "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createTrivialAttestation(root);
  assert.equal(validateTrivialAttestation(root), true);
  writeFileSync(join(root, "a.txt"), "changed");
  assert.equal(validateTrivialAttestation(root), false);
});

test("explainAttestationValidity gives a distinct, specific reason for each invalid case instead of a bare boolean", () => {
  const root = initSpecRoot();
  assert.match(explainAttestationValidity(root, "001-test"), /no attestation has been recorded/);

  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createAttestation(root, "001-test");
  assert.equal(explainAttestationValidity(root, "001-test"), null);

  writeFileSync(join(root, "a.txt"), "changed");
  assert.match(explainAttestationValidity(root, "001-test"), /worktree has changed/);
});

test("explainTrivialAttestationValidity mirrors the spec-bound version's specific reasons", () => {
  const root = initSpecRoot();
  assert.match(explainTrivialAttestationValidity(root), /no trivial attestation has been recorded/);
  runTrivialCheck(root, "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createTrivialAttestation(root);
  assert.equal(explainTrivialAttestationValidity(root), null);
  writeFileSync(join(root, "a.txt"), "changed");
  assert.match(explainTrivialAttestationValidity(root), /worktree has changed/);
});

test("a missing/unparseable createdAt is treated as invalid, not as 'never expires' (NaN comparison bug)", () => {
  const root = initSpecRoot();
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createAttestation(root, "001-test");
  assert.equal(validateAttestation(root, "001-test"), true);

  const attestationPath = join(root, ".harness", "state", "specs", "001-test", "attestation.json");
  const record = JSON.parse(readFileSync(attestationPath, "utf8"));
  delete record.createdAt;
  writeFileSync(attestationPath, `${JSON.stringify(record)}\n`);
  // Date.parse(undefined) is NaN, and NaN > maxAgeMs is false -- naively
  // treating that as "not expired" would make a corrupted attestation live
  // forever instead of being rejected.
  assert.equal(validateAttestation(root, "001-test"), false);
  assert.match(explainAttestationValidity(root, "001-test"), /missing or unparseable createdAt/);
});

test("describeCollectionError gives trivial-appropriate rerun instructions, not a spec-mode 'rerun hs-verify' that doesn't apply", () => {
  const root = initSpecRoot();
  runTrivialCheck(root, "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createTrivialAttestation(root);
  writeFileSync(join(root, "a.txt"), "changed");
  const reason = explainTrivialAttestationValidity(root);
  assert.match(reason, /rerun hs check --trivial/);
  assert.doesNotMatch(reason, /hs-verify/);
});

test("trivial and spec-bound attestations are independent -- one existing doesn't fake-satisfy the other", () => {
  const root = initSpecRoot();
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createAttestation(root, "001-test");
  assert.equal(validateAttestation(root, "001-test"), true);
  assert.equal(validateTrivialAttestation(root), false, "a spec-bound attestation must not count as a trivial one");
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
