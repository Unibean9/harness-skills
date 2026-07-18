import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { evaluateReadiness } from "../../scripts/check-ship-ready.mjs";
import { createAttestation } from "../../scripts/attestation.mjs";
import { runCheck } from "../../scripts/run-check.mjs";

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

test("terminal shipped specs are never ready, regardless of stale verification", () => {
  const root = rootWithSpec({ phase: "shipped" });
  const result = evaluateReadiness(root); assert.equal(result.ready, false);
  assert.ok(result.errors.some((error) => error.includes("shipped")));
});
