import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { detectLegacySpecState, detectSpecVersion, initializeWorkflow, loadWorkflow, resolveSpecRuntimeDir, selectActiveSpec, specPaths, specRuntimePaths, transitionWorkflow } from "../../scripts/state.mjs";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const reserve = join(repo, "scripts/next-spec-id.mjs");

test("concurrent reservations receive distinct identities without changing active selection", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-state-"));
  mkdirSync(join(root, ".harness", "specs", "001-existing"), { recursive: true });
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), "001-existing\n");
  const results = Array.from({ length: 6 }, () => spawnSync(process.execPath, [reserve, "parallel-work"], { cwd: root, encoding: "utf8" }));
  assert.ok(results.every((result) => result.status === 0));
  const identities = results.map((result) => result.stdout.trim());
  assert.equal(new Set(identities).size, identities.length);
  assert.ok(identities.every((identity) => /^\d{3,}-parallel-work$/.test(identity) && existsSync(join(root, ".harness", "specs", identity))));
  assert.equal(readFileSync(join(root, ".harness", "state", "current-spec"), "utf8"), "001-existing\n");
});

test("active selection validates identity and refuses silent replacement", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-active-"));
  mkdirSync(join(root, ".harness", "specs", "001-one"), { recursive: true });
  mkdirSync(join(root, ".harness", "specs", "002-two"), { recursive: true });
  selectActiveSpec("001-one", root);
  assert.equal(readFileSync(join(root, ".harness", "state", "current-spec"), "utf8"), "001-one\n");
  assert.throws(() => selectActiveSpec("002-two", root), /already 001-one/);
  assert.throws(() => selectActiveSpec("bad", root), /invalid/);
  selectActiveSpec("002-two", root, { replace: true });
  assert.equal(readFileSync(join(root, ".harness", "state", "current-spec"), "utf8"), "002-two\n");
});

test("v2 runtime paths require an explicit valid spec and stay outside durable history", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-runtime-path-"));
  mkdirSync(join(root, ".harness", "specs", "001-one"), { recursive: true });
  assert.equal(resolveSpecRuntimeDir(root, "001-one"), join(root, ".harness", "state", "specs", "001-one"));
  assert.equal(specPaths(root, "001-one").manifest, join(root, ".harness", "specs", "001-one", "verify.json"));
  assert.equal(specRuntimePaths(root, "001-one").checks, join(root, ".harness", "state", "specs", "001-one", "checks"));
  assert.throws(() => resolveSpecRuntimeDir(root, "bad"), /invalid spec identity/);
  assert.throws(() => resolveSpecRuntimeDir(root, "002-missing"), /does not exist/);
});

test("explicit runtime identity is stable when active selection changes", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-explicit-runtime-"));
  mkdirSync(join(root, ".harness", "specs", "001-one"), { recursive: true });
  mkdirSync(join(root, ".harness", "specs", "002-two"), { recursive: true });
  selectActiveSpec("001-one", root);
  const one = specRuntimePaths(root, "001-one").dir;
  selectActiveSpec("002-two", root, { replace: true });
  assert.equal(specRuntimePaths(root, "001-one").dir, one);
  assert.notEqual(specRuntimePaths(root, "002-two").dir, one);
});

test("legacy spec-local evidence is detected read-only with regeneration guidance", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-legacy-state-"));
  const legacy = join(root, ".harness", "specs", "001-one", "state");
  mkdirSync(legacy, { recursive: true });
  writeFileSync(join(legacy, "verify-tests.status"), "PASS\n");
  const result = detectLegacySpecState(root, "001-one");
  assert.equal(result.version, 1);
  assert.deepEqual(result.entries, ["verify-tests.status"]);
  assert.match(result.message, /read-only.*regenerate/);
  assert.equal(readFileSync(join(legacy, "verify-tests.status"), "utf8"), "PASS\n");
});

test("workflow version detection is deterministic and fail-closed", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-version-state-"));
  const dir = join(root, ".harness", "specs", "001-one");
  mkdirSync(dir, { recursive: true });
  assert.equal(detectSpecVersion(root, "001-one").kind, "legacy-v1");
  writeFileSync(join(dir, "workflow.json"), JSON.stringify({ version: 2 }));
  assert.equal(detectSpecVersion(root, "001-one").kind, "invalid");
  writeFileSync(join(dir, "workflow.json"), "not-json");
  assert.equal(detectSpecVersion(root, "001-one").kind, "invalid");
  writeFileSync(join(dir, "workflow.json"), JSON.stringify({ version: 99 }));
  assert.equal(detectSpecVersion(root, "001-one").kind, "invalid");
});

function workflowRoot() {
  const root = mkdtempSync(join(tmpdir(), "harness-workflow-"));
  const spec = "001-one";
  mkdirSync(join(root, ".harness", "specs", spec), { recursive: true });
  writeFileSync(join(root, ".harness", "specs", spec, "spec.md"), "# Spec\n");
  writeFileSync(join(root, ".harness", "specs", spec, "plan.md"), "# Plan\n");
  writeFileSync(join(root, ".harness", "specs", "INDEX.md"), "# Spec Index\n\n| ID | Slug | Phase | Updated |\n|---|---|---|---|\n| 001 | one | brainstorming | today |\n");
  return { root, spec };
}

const approval = (kind) => ({ kind, reference: `explicit ${kind} approval`, recordedAt: "2026-07-18T00:00:00.000Z" });
const cleanReview = { recordedAt: "2026-07-18T00:00:00.000Z", blockersOpen: 0, dimensions: { coverage: "pass", ordering: "pass", risk: "pass", verifyQuality: "pass" } };

test("workflow transitions require explicit approvals and a clean current plan review", () => {
  const { root, spec } = workflowRoot();
  initializeWorkflow(root, spec, { timestamp: "2026-07-18T00:00:00.000Z" });
  assert.throws(() => transitionWorkflow(root, spec, "approve-spec", { expectedRevision: 0 }), /explicit spec approval/);
  let state = transitionWorkflow(root, spec, "approve-spec", { expectedRevision: 0, approval: approval("spec") });
  assert.equal(state.phase, "planning");
  assert.throws(() => transitionWorkflow(root, spec, "approve-plan", { expectedRevision: 1, approval: approval("plan") }), /clean plan review/);
  state = transitionWorkflow(root, spec, "record-plan-review", { expectedRevision: 1, planReview: cleanReview });
  state = transitionWorkflow(root, spec, "approve-plan", { expectedRevision: 2, approval: approval("plan") });
  assert.equal(state.phase, "building");
  assert.equal(state.revision, 3);
  assert.equal(loadWorkflow(root, spec).approvals.plan.reference, "explicit plan approval");
});

test("workflow rejects stale, out-of-order, and locked transitions without mutation", () => {
  const { root, spec } = workflowRoot();
  initializeWorkflow(root, spec);
  const workflow = specPaths(root, spec).workflow;
  const index = join(root, ".harness", "specs", "INDEX.md");
  const beforeWorkflow = readFileSync(workflow, "utf8"); const beforeIndex = readFileSync(index, "utf8");
  assert.throws(() => transitionWorkflow(root, spec, "approve-plan", { expectedRevision: 0, approval: approval("plan") }), /not allowed/);
  assert.equal(readFileSync(workflow, "utf8"), beforeWorkflow); assert.equal(readFileSync(index, "utf8"), beforeIndex);
  mkdirSync(join(root, ".harness", "state", "specs", spec, ".workflow-transition.lock"), { recursive: true });
  assert.throws(() => transitionWorkflow(root, spec, "approve-spec", { expectedRevision: 0, approval: approval("spec") }), /already in progress/);
  assert.equal(readFileSync(workflow, "utf8"), beforeWorkflow);
});
