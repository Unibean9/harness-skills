import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateAttestationV2 as validateAttestation } from "../../scripts/attestation.mjs";
import { fingerprintWorktree } from "../../scripts/worktree.mjs";
import { inspectProductSnapshot } from "../../scripts/changeset.mjs";
import { checksForStage, inspectVerifyManifest, manifestDigest, validateVerifyManifest } from "../../scripts/verify-manifest.mjs";
import { runVerificationStage } from "../../scripts/verification-runner.mjs";
import { recordManualEvidence } from "../../scripts/manual-evidence.mjs";

const runCheck = fileURLToPath(new URL("../../scripts/run-check.mjs", import.meta.url));
const attest = fileURLToPath(new URL("../../scripts/attestation.mjs", import.meta.url));
const machine = (label = "verify-tests", argv = [process.execPath, "-e", "process.exit(0)"]) => ({ label, kind: "machine", argv });

function initSpecRoot(checks = [machine()]) {
  const root = mkdtempSync(join(tmpdir(), "harness-attest-"));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  mkdirSync(join(root, ".harness", "specs", "001-test"), { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), "001-test\n");
  writeFileSync(join(root, ".harness", "specs", "001-test", "verify.json"), JSON.stringify({ version: 2, requirements: ["REQ-TEST"], checks: checks.map((check) => ({ ...check, stages: ["final"], covers: ["REQ-TEST"] })) }));
  execFileSync("git", ["init"], { cwd: root });
  writeFileSync(join(root, ".gitignore"), ".harness/\n");
  writeFileSync(join(root, "a.txt"), "a");
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd: root });
  return root;
}

function runMachine(root, check) {
  execFileSync(process.execPath, [runCheck, "--spec", "001-test", "--stage", "final", "--label", check.label], { cwd: root });
}

function attestRoot(root) {
  execFileSync(process.execPath, [attest, "attest", "--spec", "001-test"], { cwd: root });
}

test("attestation binds the declared machine check to the selected spec and exact worktree", () => {
  const check = machine(); const root = initSpecRoot([check]);
  runMachine(root, check); attestRoot(root); assert.equal(validateAttestation(root, "001-test"), true);
  writeFileSync(join(root, "a.txt"), "changed"); assert.equal(validateAttestation(root, "001-test"), false);
});

test("run-check records provenance and rejects a command that changes the active worktree", () => {
  const root = initSpecRoot([machine("verify-tests"), machine("verify-mutating", [process.execPath, "-e", "require('node:fs').writeFileSync('a.txt', 'changed')"])]);
  runMachine(root, machine("verify-tests"));
  const checkDir = join(root, ".harness", "state", "specs", "001-test", "checks");
  const passing = JSON.parse(readFileSync(join(checkDir, "final-verify-tests.json"), "utf8"));
  assert.equal(passing.pass, true); assert.equal(passing.spec, "001-test"); assert.equal(passing.fingerprintBefore, passing.fingerprintAfter);
  assert.throws(() => runMachine(root, machine("verify-mutating", [process.execPath, "-e", "require('node:fs').writeFileSync('a.txt', 'changed')"])));
  assert.equal(JSON.parse(readFileSync(join(checkDir, "final-verify-mutating.json"), "utf8")).worktreeChanged, true);
});

test("attest rejects F0 evidence after the worktree changes to F1", () => {
  const check = machine(); const root = initSpecRoot([check]);
  runMachine(root, check); writeFileSync(join(root, "a.txt"), "F1");
  assert.throws(() => attestRoot(root), /does not prove the current worktree/);
});

test("attest requires the manifest's exact argv and rejects malformed manifests", () => {
  const declared = machine("verify-tests", [process.execPath, "-e", "process.exit(0)"]); const root = initSpecRoot([declared]);
  runMachine(root, machine("verify-tests", [process.execPath, "-e", "process.exit(1)"]));
  assert.equal(JSON.parse(readFileSync(join(root, ".harness", "state", "specs", "001-test", "checks", "final-verify-tests.json"), "utf8")).argv[2], "process.exit(0)");
  const duplicate = initSpecRoot([machine("verify-tests"), machine("verify-tests")]);
  assert.throws(() => attestRoot(duplicate), /unique kebab-case/);
});

test("manual checks remain explicit while a complete manifest can attest", () => {
  const machineCheck = machine("verify-tests"); const root = initSpecRoot([machineCheck, { label: "verify-ux", kind: "manual", argv: null }]);
  runMachine(root, machineCheck);
  recordManualEvidence(root, { spec: "001-test", stage: "final", label: "verify-ux", confirmedBy: "user", reference: "explicit test verdict" });
  attestRoot(root); const record = JSON.parse(readFileSync(join(root, ".harness", "state", "specs", "001-test", "attestation.json"), "utf8"));
  assert.deepEqual(record.checks.map((check) => check.kind), ["machine", "manual"]);
});

test("product fingerprints ignore tracked harness control-state updates", () => {
  const root = initSpecRoot();
  execFileSync("git", ["add", "-f", ".harness/specs/001-test/verify.json"], { cwd: root });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "track durable spec"], { cwd: root });
  const before = fingerprintWorktree(root);
  writeFileSync(join(root, ".harness", "specs", "001-test", "spec.md"), "# durable update\n");
  writeFileSync(join(root, ".harness", "state", "audit.log"), "runtime update\n");
  assert.equal(fingerprintWorktree(root), before);
  writeFileSync(join(root, "a.txt"), "product update");
  assert.notEqual(fingerprintWorktree(root), before);
});

test("changesets classify staged, unstaged, and untracked product files with spaces", () => {
  const root = initSpecRoot();
  writeFileSync(join(root, "staged.txt"), "staged"); execFileSync("git", ["add", "staged.txt"], { cwd: root });
  writeFileSync(join(root, "a.txt"), "unstaged");
  writeFileSync(join(root, "new file.txt"), "untracked");
  writeFileSync(join(root, ".harness", "specs", "001-test", "progress.md"), "ignored control state\n");
  const changeset = inspectProductSnapshot(root);
  assert.equal(changeset.staged.find((entry) => entry.path === "staged.txt")?.kind, "staged");
  assert.equal(changeset.unstaged.find((entry) => entry.path === "a.txt")?.kind, "unstaged");
  assert.equal(changeset.untracked.find((entry) => entry.path === "new file.txt")?.kind, "untracked");
  assert.equal([...changeset.staged, ...changeset.unstaged, ...changeset.untracked].some((entry) => entry.path.includes(".harness")), false);
});

const requirements = ["REQ-ONE", "REQ-TWO"];
const v2Manifest = (checks = [
  { label: "baseline", kind: "machine", argv: [process.execPath, "-e", "process.exit(0)"], stages: ["baseline", "final"], covers: ["REQ-ONE"] },
  { label: "final", kind: "machine", argv: [process.execPath, "-e", "process.exit(0)"], stages: ["final"], covers: ["REQ-TWO"] },
]) => ({ version: 2, requirements, checks });

test("v2 manifests require stable final coverage and preserve declared order", () => {
  const manifest = validateVerifyManifest(v2Manifest());
  assert.deepEqual(checksForStage(manifest, "baseline").map((check) => check.label), ["baseline"]);
  assert.deepEqual(checksForStage(manifest, "final").map((check) => check.label), ["baseline", "final"]);
  assert.notEqual(manifestDigest(manifest), manifestDigest(v2Manifest([...manifest.checks].reverse())));
  assert.throws(() => validateVerifyManifest({ ...v2Manifest(), requirements: ["REQ-ONE", "REQ-ONE"] }), /unique stable IDs/);
  assert.throws(() => validateVerifyManifest(v2Manifest([{ ...v2Manifest()["checks"][0], stages: ["baseline", "baseline"] }])), /unique baseline\/final stages/);
  assert.throws(() => validateVerifyManifest(v2Manifest([{ ...v2Manifest()["checks"][0], covers: ["REQ-TWO"] }])), /final coverage/);
  assert.throws(() => validateVerifyManifest({ ...v2Manifest(), unexpected: true }), /unknown fields/);
});

test("v2 runner executes exact stage argv without active-spec discovery and continues after a failure", () => {
  const root = initSpecRoot(); const spec = "001-test";
  writeFileSync(join(root, ".harness", "specs", spec, "verify.json"), JSON.stringify(v2Manifest([
    { label: "first", kind: "machine", argv: ["first", "arg"], stages: ["final"], covers: ["REQ-ONE"] },
    { label: "second", kind: "machine", argv: ["second"], stages: ["final"], covers: ["REQ-TWO"] },
  ])));
  const received = [];
  const report = runVerificationStage(root, spec, "final", { executor: (argv) => { received.push(argv); return { status: argv[0] === "first" ? 1 : 0, stdout: "", stderr: "" }; } });
  assert.deepEqual(received, [["first", "arg"], ["second"]]);
  assert.equal(report.pass, false); assert.equal(report.checks[1].pass, true);
});

test("v1 manifests stay readable for legacy attestation but the v2 runner gives a regeneration instruction", () => {
  const root = initSpecRoot();
  writeFileSync(join(root, ".harness", "specs", "001-test", "verify.json"), JSON.stringify({ version: 1, checks: [machine()] }));
  assert.equal(inspectVerifyManifest(root, "001-test").kind, "legacy-v1");
  assert.throws(() => runVerificationStage(root, "001-test", "final"), /read-only; regenerate v2/);
});
