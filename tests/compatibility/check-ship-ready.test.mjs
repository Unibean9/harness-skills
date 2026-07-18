import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { evaluateReadiness } from "../../scripts/readiness.mjs";

const runCheck = fileURLToPath(new URL("../../scripts/run-check.mjs", import.meta.url));
const attest = fileURLToPath(new URL("../../scripts/attestation.mjs", import.meta.url));

function rootWithSpec({ progress = "- [x] Task 1: first\n", phase } = {}) {
  const root = mkdtempSync(join(tmpdir(), "harness-ready-")); const spec = "001-test"; const dir = join(root, ".harness", "specs", spec);
  mkdirSync(join(root, ".harness", "state"), { recursive: true }); mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), `${spec}\n`);
  writeFileSync(join(dir, "spec.md"), "# Spec\n\n**Status:** approved\n");
  writeFileSync(join(dir, "plan.md"), "# Plan\n\n**Status:** approved\n\n## Task 1: first\n");
  writeFileSync(join(dir, "progress.md"), progress);
  writeFileSync(join(dir, "verify.json"), JSON.stringify({ version: 1, checks: [{ label: "verify-tests", kind: "machine", argv: [process.execPath, "-e", "process.exit(0)"] }] }));
  if (phase) writeFileSync(join(root, ".harness", "specs", "INDEX.md"), `# Spec Index\n\n| ID | Slug | Phase | Updated |\n|---|---|---|---|\n| 001 | test | ${phase} | today |\n`);
  execFileSync("git", ["init"], { cwd: root }); writeFileSync(join(root, ".gitignore"), ".harness/\n"); writeFileSync(join(root, "a.txt"), "a"); execFileSync("git", ["add", "."], { cwd: root }); execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd: root });
  return root;
}
function attestReady(root) { execFileSync(process.execPath, [runCheck, "verify-tests", "--", process.execPath, "-e", "process.exit(0)"], { cwd: root }); execFileSync(process.execPath, [attest, "attest"], { cwd: root }); }

test("shared evaluator requires approved state, exact task IDs, and valid evidence", () => {
  const root = rootWithSpec(); attestReady(root); assert.equal(evaluateReadiness(root).ready, true);
  const duplicate = rootWithSpec({ progress: "- [x] Task 1: first\n- [x] Task 1: duplicate\n" }); attestReady(duplicate);
  assert.equal(evaluateReadiness(duplicate).nextPhase, "hs-build");
  const draft = rootWithSpec(); writeFileSync(join(draft, ".harness", "specs", "001-test", "plan.md"), "**Status:** draft\n");
  assert.equal(evaluateReadiness(draft).nextPhase, "hs-plan");
});

test("terminal shipped specs route to brainstorm, never stale verification", () => {
  const root = rootWithSpec({ phase: "shipped" });
  const result = evaluateReadiness(root); assert.equal(result.ready, false); assert.equal(result.nextPhase, "hs-brainstorm");
});
