import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { evaluateReadiness } from "../../scripts/check-ship-ready.mjs";
import { createAttestation, createTrivialAttestation, validateAttestation } from "../../scripts/attestation.mjs";
import { runCheck, runTrivialCheck } from "../../scripts/run-check.mjs";
import { syncIndexPhase } from "../../scripts/bookkeeping.mjs";

function rootWithSpec({ progress = "- [x] Task 1: first\n", phase } = {}) {
  const root = mkdtempSync(join(tmpdir(), "harness-ready-")); const spec = "001-test"; const dir = join(root, ".harness", "specs", spec);
  mkdirSync(join(root, ".harness", "state"), { recursive: true }); mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), `${spec}\n`);
  writeFileSync(join(dir, "spec.md"), "# Spec\n\n**Status:** approved\n");
  writeFileSync(join(dir, "plan.md"), "# Plan\n\n**Status:** approved\n\n## Task 1: first\n");
  writeFileSync(join(dir, "progress.md"), progress);
  if (phase) writeFileSync(join(root, ".harness", "specs", "INDEX.md"), `# Spec Index\n\n| ID | Slug | Phase | Updated |\n|---|---|---|---|\n| 001 | test | ${phase} | today |\n`);
  execFileSync("git", ["init"], { cwd: root }); writeFileSync(join(root, ".gitignore"), ".harness/state/\n"); writeFileSync(join(root, "a.txt"), "a"); execFileSync("git", ["add", "."], { cwd: root }); execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd: root });
  return root;
}

function attestReady(root) {
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createAttestation(root, "001-test");
}

test("shared evaluator requires approved state, exact task IDs, and valid evidence", () => {
  const root = rootWithSpec(); attestReady(root); assert.equal(evaluateReadiness(root).ready, true);
  const duplicate = rootWithSpec({ progress: "- [x] Task 1: first\n- [x] Task 1: duplicate\n" }); attestReady(duplicate);
  const duplicateResult = evaluateReadiness(duplicate);
  assert.equal(duplicateResult.ready, false);
  assert.ok(duplicateResult.errors.some((error) => error.includes("do not match exactly")));
  const draft = rootWithSpec(); writeFileSync(join(draft, ".harness", "specs", "001-test", "plan.md"), "**Status:** draft\n");
  const draftResult = evaluateReadiness(draft);
  assert.equal(draftResult.ready, false);
  assert.ok(draftResult.errors.some((error) => error.includes("plan is not approved")));
});

function rootWithLightSpec({ progress = "- [x] Task 1: first\n" } = {}) {
  const root = mkdtempSync(join(tmpdir(), "harness-ready-light-"));
  const spec = "001-test";
  const dir = join(root, ".harness", "specs", spec);
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), `${spec}\n`);
  // Light mode: spec.md alone, no plan.md -- this is the exact shape
  // hs-brainstorm's light template produces.
  writeFileSync(join(dir, "spec.md"), "# Spec+Plan: light\n\n**Status:** approved\n\n## Tasks\n- [ ] Task 1: first — Verify: `true`\n");
  writeFileSync(join(dir, "progress.md"), progress);
  execFileSync("git", ["init"], { cwd: root });
  writeFileSync(join(root, ".gitignore"), ".harness/state/\n");
  writeFileSync(join(root, "a.txt"), "a");
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd: root });
  return root;
}

test("light mode (spec.md with ## Tasks, no plan.md) can reach READY -- this was broken before: evaluateReadiness hardcoded requiring plan.md", () => {
  const root = rootWithLightSpec();
  attestReady(root);
  const result = evaluateReadiness(root);
  assert.equal(result.ready, true);
  assert.deepEqual(result.errors, []);
});

test("light mode still enforces exact task-ID matching, same as full mode", () => {
  const root = rootWithLightSpec({ progress: "- [x] Task 1: first\n- [x] Task 1: duplicate\n" });
  attestReady(root);
  const result = evaluateReadiness(root);
  assert.equal(result.ready, false);
  assert.ok(result.errors.some((error) => error.includes("do not match exactly")));
});

test("a real plan.md always wins over a stray ## Tasks heading in spec.md (no silent light-mode misfire)", () => {
  const root = rootWithLightSpec();
  writeFileSync(join(root, ".harness", "specs", "001-test", "plan.md"), "**Status:** draft\n");
  const result = evaluateReadiness(root);
  assert.equal(result.ready, false);
  assert.ok(result.errors.some((error) => error.includes("plan is not approved")));
});

test("no active spec is READY via a valid trivial attestation -- this is the exact shape AGENTS.md's one-line-change exemption leaves behind, and it was unconditionally NOT READY before this fix", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-ready-trivial-"));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  execFileSync("git", ["init"], { cwd: root });
  writeFileSync(join(root, ".gitignore"), ".harness/state/\n");
  writeFileSync(join(root, "a.txt"), "a");
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd: root });

  const beforeVerify = evaluateReadiness(root);
  assert.equal(beforeVerify.ready, false);
  assert.ok(beforeVerify.errors.some((error) => error.includes("no active spec")));

  runTrivialCheck(root, "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createTrivialAttestation(root);
  const afterVerify = evaluateReadiness(root);
  assert.equal(afterVerify.ready, true);
  assert.equal(afterVerify.trivial, true);
});

test("trivial attestation is reachable even when current-spec still points at an old (or shipped) spec -- current-spec is never cleared after shipping, so gating the trivial path on \"no active spec\" made it permanently unreachable in any repo that has ever shipped a spec", () => {
  const root = rootWithSpec({ phase: "shipped" }); // a fully shipped, terminal spec is still selected -- this is what every real repo looks like after its first spec ships
  const beforeTrivial = evaluateReadiness(root);
  assert.equal(beforeTrivial.ready, false);
  assert.ok(beforeTrivial.errors.some((error) => error.includes("shipped")), "sanity check: the old spec is indeed blocking readiness on its own");

  runTrivialCheck(root, "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createTrivialAttestation(root);
  const afterTrivial = evaluateReadiness(root);
  assert.equal(afterTrivial.ready, true);
  assert.equal(afterTrivial.trivial, true);
});

test("re-attesting a shipped spec does not resurrect its INDEX.md row from 'shipped' back to 'verifying'", () => {
  const root = rootWithSpec({ phase: "shipped" });
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createAttestation(root, "001-test");
  assert.equal(validateAttestation(root, "001-test"), true, "the attestation itself is still valid evidence");
  const index = readFileSync(join(root, ".harness", "specs", "INDEX.md"), "utf8");
  assert.match(index, /\|\s*shipped\s*\|/, "INDEX.md must still say shipped, not verifying, after re-attesting");
  const readiness = evaluateReadiness(root);
  assert.equal(readiness.ready, false);
  assert.ok(readiness.errors.some((error) => error.includes("shipped")), "a shipped spec must stay NOT READY even with a fresh valid attestation");
});

test("syncIndexPhase refuses to overwrite a shipped row directly, independent of the attestation flow above", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-shipped-sync-"));
  mkdirSync(join(root, ".harness", "specs"), { recursive: true });
  writeFileSync(
    join(root, ".harness", "specs", "INDEX.md"),
    "# Spec Index\n\n| ID | Slug | Phase | Updated |\n|---|---|---|---|\n| 001 | test | shipped | 2026-01-01 |\n"
  );
  const result = syncIndexPhase(root, "001-test", "verifying");
  assert.equal(result.synced, false);
  assert.match(result.reason, /already shipped/);
  const index = readFileSync(join(root, ".harness", "specs", "INDEX.md"), "utf8");
  assert.match(index, /\|\s*shipped\s*\|/);
});

test("terminal shipped specs are never ready, regardless of stale verification", () => {
  const root = rootWithSpec({ phase: "shipped" });
  const result = evaluateReadiness(root); assert.equal(result.ready, false);
  assert.ok(result.errors.some((error) => error.includes("shipped")));
});
