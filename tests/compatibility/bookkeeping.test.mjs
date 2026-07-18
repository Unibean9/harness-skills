import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { recordTaskProgress, syncIndexPhase } from "../../scripts/bookkeeping.mjs";
import { runCheck } from "../../scripts/run-check.mjs";
import { createAttestation } from "../../scripts/attestation.mjs";

function initSpecRoot(taskCount = 2) {
  const root = mkdtempSync(join(tmpdir(), "harness-bookkeeping-"));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  const specDir = join(root, ".harness", "specs", "001-test");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), "001-test\n");
  const planTasks = Array.from({ length: taskCount }, (_, i) => `## Task ${i + 1}: do thing ${i + 1}\n- Verify: \`true\`\n`).join("\n");
  writeFileSync(join(specDir, "plan.md"), `# Plan\n\n**Status:** approved\n\n${planTasks}`);
  writeFileSync(join(root, ".harness", "specs", "INDEX.md"), "# Spec Index\n\n| ID | Slug | Phase | Updated |\n|---|---|---|---|\n| 001 | test | planning | 2026-01-01 |\n");
  execFileSync("git", ["init"], { cwd: root });
  writeFileSync(join(root, ".gitignore"), ".harness/state/\n");
  writeFileSync(join(root, "a.txt"), "a");
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd: root });
  return root;
}

test("recordTaskProgress appends a progress.md line with the task name looked up from plan.md", () => {
  const root = initSpecRoot(2);
  const result = recordTaskProgress(root, "001-test", "task-1", ["true"], true);
  assert.equal(result.recorded, true);
  const progress = readFileSync(join(root, ".harness", "specs", "001-test", "progress.md"), "utf8");
  assert.match(progress, /- \[x\] Task 1: do thing 1 — verify: `true` -> PASS/);
});

test("recordTaskProgress is idempotent -- re-running the same task's check doesn't duplicate the line", () => {
  const root = initSpecRoot(2);
  recordTaskProgress(root, "001-test", "task-1", ["true"], true);
  const second = recordTaskProgress(root, "001-test", "task-1", ["true"], true);
  assert.equal(second.recorded, false);
  assert.equal(second.reason, "already recorded");
  const progress = readFileSync(join(root, ".harness", "specs", "001-test", "progress.md"), "utf8");
  assert.equal((progress.match(/Task 1:/g) || []).length, 1);
});

test("recordTaskProgress does nothing for a failed check or a non-task label", () => {
  const root = initSpecRoot(2);
  assert.equal(recordTaskProgress(root, "001-test", "task-1", ["true"], false).recorded, false);
  assert.equal(recordTaskProgress(root, "001-test", "verify-tests", ["true"], true).recorded, false);
});

test("recordTaskProgress flips INDEX.md to 'building' only once every task is recorded", () => {
  const root = initSpecRoot(2);
  recordTaskProgress(root, "001-test", "task-1", ["true"], true);
  let index = readFileSync(join(root, ".harness", "specs", "INDEX.md"), "utf8");
  assert.match(index, /\|\s*001\s*\|\s*test\s*\|\s*planning\s*\|/); // still planning after only 1/2

  recordTaskProgress(root, "001-test", "task-2", ["true"], true);
  index = readFileSync(join(root, ".harness", "specs", "INDEX.md"), "utf8");
  assert.match(index, /\|\s*001\s*\|\s*test\s*\|\s*building\s*\|/);
});

test("syncIndexPhase rewrites only the targeted row's Phase and Updated columns", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-bookkeeping-index-"));
  mkdirSync(join(root, ".harness", "specs"), { recursive: true });
  writeFileSync(
    join(root, ".harness", "specs", "INDEX.md"),
    "# Spec Index\n\n| ID | Slug | Phase | Updated |\n|---|---|---|---|\n| 001 | one | building | 2026-01-01 |\n| 002 | two | planning | 2026-01-02 |\n"
  );
  const result = syncIndexPhase(root, "001-one", "verifying");
  assert.equal(result.synced, true);
  const index = readFileSync(join(root, ".harness", "specs", "INDEX.md"), "utf8");
  assert.match(index, /\|\s*001\s*\|\s*one\s*\|\s*verifying\s*\|/);
  assert.match(index, /\|\s*002\s*\|\s*two\s*\|\s*planning\s*\|/, "the other row must be untouched");
});

test("syncIndexPhase no-ops (doesn't corrupt) on a table shape it doesn't recognize -- extra column or missing trailing pipe", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-bookkeeping-index-noncanonical-"));
  mkdirSync(join(root, ".harness", "specs"), { recursive: true });

  const extraColumn = "# Spec Index\n\n| ID | Slug | Phase | Updated | Notes |\n|---|---|---|---|---|\n| 001 | one | building | 2026-01-01 | some note |\n";
  writeFileSync(join(root, ".harness", "specs", "INDEX.md"), extraColumn);
  const resultA = syncIndexPhase(root, "001-one", "verifying");
  assert.equal(resultA.synced, false);
  assert.equal(readFileSync(join(root, ".harness", "specs", "INDEX.md"), "utf8"), extraColumn, "table with an extra column must be left byte-for-byte unchanged, not partially rewritten");

  const missingTrailingPipe = "# Spec Index\n\n| ID | Slug | Phase | Updated\n|---|---|---|---\n| 001 | one | building | 2026-01-01\n";
  writeFileSync(join(root, ".harness", "specs", "INDEX.md"), missingTrailingPipe);
  const resultB = syncIndexPhase(root, "001-one", "verifying");
  assert.equal(resultB.synced, false);
  assert.equal(readFileSync(join(root, ".harness", "specs", "INDEX.md"), "utf8"), missingTrailingPipe);
});

test("createAttestation auto-flips the spec's INDEX.md row to 'verifying'", () => {
  const root = initSpecRoot(1);
  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createAttestation(root, "001-test");
  const index = readFileSync(join(root, ".harness", "specs", "INDEX.md"), "utf8");
  assert.match(index, /\|\s*001\s*\|\s*test\s*\|\s*verifying\s*\|/);
});

test("runCheck auto-records task progress end to end through the real CLI path", () => {
  const root = initSpecRoot(1);
  const evidence = runCheck(root, "001-test", "task-1", [process.execPath, "-e", "process.exit(0)"]);
  assert.equal(evidence.bookkeeping.recorded, true);
  const progress = readFileSync(join(root, ".harness", "specs", "001-test", "progress.md"), "utf8");
  assert.match(progress, /Task 1: do thing 1/);
});
