import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateAttestation } from "../../scripts/attestation.mjs";

const runCheck = fileURLToPath(new URL("../../scripts/run-check.mjs", import.meta.url));
const attest = fileURLToPath(new URL("../../scripts/attestation.mjs", import.meta.url));
const machine = (label = "verify-tests", argv = [process.execPath, "-e", "process.exit(0)"]) => ({ label, kind: "machine", argv });

function initSpecRoot(checks = [machine()]) {
  const root = mkdtempSync(join(tmpdir(), "harness-attest-"));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  mkdirSync(join(root, ".harness", "specs", "001-test"), { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), "001-test\n");
  writeFileSync(join(root, ".harness", "specs", "001-test", "verify.json"), JSON.stringify({ version: 1, checks }));
  execFileSync("git", ["init"], { cwd: root });
  writeFileSync(join(root, ".gitignore"), ".harness/\n");
  writeFileSync(join(root, "a.txt"), "a");
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd: root });
  return root;
}

function runMachine(root, check) {
  execFileSync(process.execPath, [runCheck, check.label, "--", ...check.argv], { cwd: root });
}

function attestRoot(root) {
  execFileSync(process.execPath, [attest, "attest"], { cwd: root });
}

test("attestation binds the declared machine check to the selected spec and exact worktree", () => {
  const check = machine(); const root = initSpecRoot([check]);
  runMachine(root, check); attestRoot(root); assert.equal(validateAttestation(root), true);
  writeFileSync(join(root, "a.txt"), "changed"); assert.equal(validateAttestation(root), false);
});

test("run-check records provenance and rejects a command that changes the active worktree", () => {
  const root = initSpecRoot([machine("verify-tests"), machine("verify-mutating", [process.execPath, "-e", "require('node:fs').writeFileSync('a.txt', 'changed')"])]);
  runMachine(root, machine("verify-tests"));
  const checkDir = join(root, ".harness", "specs", "001-test", "state");
  const passing = JSON.parse(readFileSync(join(checkDir, "verify-tests.json"), "utf8"));
  assert.equal(passing.pass, true); assert.equal(passing.spec, "001-test"); assert.equal(passing.fingerprintBefore, passing.fingerprintAfter);
  assert.throws(() => runMachine(root, machine("verify-mutating", [process.execPath, "-e", "require('node:fs').writeFileSync('a.txt', 'changed')"])));
  assert.equal(JSON.parse(readFileSync(join(checkDir, "verify-mutating.json"), "utf8")).worktreeChanged, true);
});

test("attest rejects F0 evidence after the worktree changes to F1", () => {
  const check = machine(); const root = initSpecRoot([check]);
  runMachine(root, check); writeFileSync(join(root, "a.txt"), "F1");
  assert.throws(() => attestRoot(root), /does not prove the current worktree/);
});

test("attest requires the manifest's exact argv and rejects malformed manifests", () => {
  const declared = machine("verify-tests", [process.execPath, "-e", "process.exit(0)"]); const root = initSpecRoot([declared]);
  assert.throws(() => runMachine(root, machine("verify-tests", [process.execPath, "-e", "process.exit(1)"])));
  assert.throws(() => attestRoot(root), /not PASS/);
  const duplicate = initSpecRoot([machine("verify-tests"), machine("verify-tests")]);
  assert.throws(() => attestRoot(duplicate), /invalid verify manifest/);
});

test("manual checks remain explicit while a complete manifest can attest", () => {
  const machineCheck = machine("verify-tests"); const root = initSpecRoot([machineCheck, { label: "verify-ux", kind: "manual", argv: null }]);
  runMachine(root, machineCheck);
  const checkDir = join(root, ".harness", "specs", "001-test", "state"); mkdirSync(checkDir, { recursive: true }); writeFileSync(join(checkDir, "verify-ux.status"), "PASS\n");
  attestRoot(root); const record = JSON.parse(readFileSync(join(root, ".harness", "state", "verify-all.json"), "utf8"));
  assert.deepEqual(record.checks.map((check) => check.kind), ["machine", "manual"]);
});
