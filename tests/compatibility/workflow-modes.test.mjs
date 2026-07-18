import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { initializeWorkflow, transitionWorkflow } from "../../scripts/workflow-state.mjs";
import { fingerprintWorktree } from "../../scripts/worktree.mjs";
import { evaluateReadiness } from "../../scripts/readiness.mjs";

function fixture(mode) {
  const root = mkdtempSync(join(tmpdir(), "harness-modes-")); const spec = "001-test"; const dir = join(root, ".harness", "specs", spec);
  mkdirSync(dir, { recursive: true }); mkdirSync(join(root, ".harness", "state"), { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), `${spec}\n`);
  writeFileSync(join(root, ".harness", "specs", "INDEX.md"), "# Spec Index\n\n| ID | Slug | Phase | Updated |\n|---|---|---|---|\n| 001 | test | brainstorming | today |\n");
  writeFileSync(join(dir, "spec.md"), "# Spec\n"); writeFileSync(join(dir, "plan.md"), "# Plan\n"); writeFileSync(join(dir, "verify.json"), JSON.stringify({ version: 2, requirements: ["REQ-TEST"], checks: [{ label: "verify-tests", kind: "machine", argv: [process.execPath, "-e", "process.exit(0)"], stages: ["final"], covers: ["REQ-TEST"] }] }));
  execFileSync("git", ["init"], { cwd: root }); writeFileSync(join(root, ".gitignore"), ".harness/\n"); writeFileSync(join(root, "a.txt"), "a"); execFileSync("git", ["add", "."], { cwd: root }); execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd: root });
  return { root, spec };
}

const approval = (kind) => ({ kind, reference: "explicit", recordedAt: new Date().toISOString() });
const planReview = { blockersOpen: 0, dimensions: { coverage: "pass", ordering: "pass", risk: "pass", verifyQuality: "pass" } };

test("diagnostic mode reports verification without becoming attestable or ship-ready", () => {
  const { root, spec } = fixture("diagnostic"); initializeWorkflow(root, spec, { mode: "diagnostic" });
  const result = evaluateReadiness(root); assert.equal(result.ready, false); assert.equal(result.nextPhase, "hs-verify");
});

test("gated and quick-fix modes use the same explicit approval gate and v2 attestation oracle", () => {
  for (const mode of ["gated", "quick-fix"]) {
    const { root, spec } = fixture(mode); let state = initializeWorkflow(root, spec, { mode });
    state = transitionWorkflow(root, spec, "approve-spec", { expectedRevision: state.revision, approval: approval("spec") });
    state = transitionWorkflow(root, spec, "record-plan-review", { expectedRevision: state.revision, planReview });
    state = transitionWorkflow(root, spec, "approve-plan", { expectedRevision: state.revision, approval: approval("plan") });
    state = transitionWorkflow(root, spec, "complete-build", { expectedRevision: state.revision });
    transitionWorkflow(root, spec, "record-verification", { expectedRevision: state.revision, verification: { fingerprint: fingerprintWorktree(root) } });
    const result = evaluateReadiness(root); assert.equal(result.nextPhase, "hs-verify"); assert.match(result.errors[0], /v2 verification attestation/);
  }
});
