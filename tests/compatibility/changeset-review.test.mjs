import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { markWorkflowDirtyIfChanged, initializeWorkflow, transitionWorkflow } from "../../scripts/workflow-state.mjs";
import { writeChangeset } from "../../scripts/changeset.mjs";

function setup() {
  const root = mkdtempSync(join(tmpdir(), "harness-changeset-")); const spec = "001-test"; const dir = join(root, ".harness", "specs", spec);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "spec.md"), "# Spec\n"); writeFileSync(join(dir, "plan.md"), "# Plan\n");
  writeFileSync(join(root, ".harness", "specs", "INDEX.md"), "# Spec Index\n\n| ID | Slug | Phase | Updated |\n|---|---|---|---|\n| 001 | test | brainstorming | today |\n");
  execFileSync("git", ["init"], { cwd: root }); writeFileSync(join(root, "a.txt"), "a"); execFileSync("git", ["add", "."], { cwd: root }); execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd: root });
  return { root, spec };
}

const approval = (kind) => ({ kind, reference: "explicit", recordedAt: "2026-07-18T00:00:00.000Z" });
const review = { blockersOpen: 0, dimensions: { coverage: "pass", ordering: "pass", risk: "pass", verifyQuality: "pass" } };

test("changeset snapshots preserve pre-existing dirty ownership and product edits invalidate verification", () => {
  const { root, spec } = setup();
  writeFileSync(join(root, "existing.txt"), "user change");
  const snapshot = writeChangeset(root, spec, { preexistingPaths: ["existing.txt"] });
  assert.deepEqual(snapshot.preexistingPaths, ["existing.txt"]);
  let state = initializeWorkflow(root, spec);
  state = transitionWorkflow(root, spec, "approve-spec", { expectedRevision: state.revision, approval: approval("spec") });
  state = transitionWorkflow(root, spec, "record-plan-review", { expectedRevision: state.revision, planReview: review });
  state = transitionWorkflow(root, spec, "approve-plan", { expectedRevision: state.revision, approval: approval("plan") });
  state = transitionWorkflow(root, spec, "complete-build", { expectedRevision: state.revision });
  state = transitionWorkflow(root, spec, "record-verification", { expectedRevision: state.revision, verification: { fingerprint: snapshot.fingerprint } });
  writeFileSync(join(root, "a.txt"), "changed after verify");
  assert.equal(markWorkflowDirtyIfChanged(root, spec).phase, "building");
});
