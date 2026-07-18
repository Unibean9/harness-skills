import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { computeNextSkill } from "../../scripts/next-skill.mjs";
import { runCheck } from "../../scripts/run-check.mjs";
import { createAttestation } from "../../scripts/attestation.mjs";

function initRoot() {
  const root = mkdtempSync(join(tmpdir(), "harness-nextskill-"));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  execFileSync("git", ["init"], { cwd: root });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "--allow-empty", "-m", "init"], { cwd: root });
  return root;
}

test("a shipped spec routes to hs-brainstorm ('start a new one'), not stale disk state forever -- this used to disagree with hs readiness the moment a spec shipped", () => {
  const root = initRoot();
  const specDir = join(root, ".harness", "specs", "001-test");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), "001-test\n");
  writeFileSync(join(specDir, "spec.md"), "# Spec\n\n**Status:** approved\n");
  writeFileSync(
    join(root, ".harness", "specs", "INDEX.md"),
    "# Spec Index\n\n| ID | Slug | Phase | Updated |\n|---|---|---|---|\n| 001 | test | shipped | 2026-01-01 |\n"
  );
  const result = computeNextSkill(root);
  assert.equal(result.nextSkill, "hs-brainstorm");
  assert.match(result.reason, /already shipped/);
});

test("no active spec routes to hs-brainstorm", () => {
  const root = initRoot();
  assert.equal(computeNextSkill(root).nextSkill, "hs-brainstorm");
});

test("routes through every phase in order as disk state advances", () => {
  const root = initRoot();
  const specDir = join(root, ".harness", "specs", "001-test");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), "001-test\n");

  writeFileSync(join(specDir, "spec.md"), "# Spec\n\n**Status:** draft\n");
  assert.equal(computeNextSkill(root).nextSkill, "hs-brainstorm");

  writeFileSync(join(specDir, "spec.md"), "# Spec\n\n**Status:** approved\n");
  assert.equal(computeNextSkill(root).nextSkill, "hs-plan");

  writeFileSync(join(specDir, "plan.md"), "# Plan\n\n**Status:** approved\n\n## Task 1: a\n- Verify: `true`\n\n## Task 2: b\n- Verify: `true`\n");
  const building = computeNextSkill(root);
  assert.equal(building.nextSkill, "hs-build");
  assert.equal(building.reason, "0/2 tasks done");

  writeFileSync(join(specDir, "progress.md"), "- [x] Task 1: a — verify: `true` -> PASS\n");
  assert.equal(computeNextSkill(root).reason, "1/2 tasks done");

  writeFileSync(join(specDir, "progress.md"), "- [x] Task 1: a — verify: `true` -> PASS\n- [x] Task 2: b — verify: `true` -> PASS\n");
  assert.equal(computeNextSkill(root).nextSkill, "hs-verify");

  runCheck(root, "001-test", "verify-tests", [process.execPath, "-e", "process.exit(0)"]);
  createAttestation(root, "001-test");
  const reviewing = computeNextSkill(root);
  assert.match(reviewing.nextSkill, /hs-review/);
  assert.equal(reviewing.phase, "reviewing");

  writeFileSync(join(specDir, "progress.md"), "- [x] Task 1: a — verify: `true` -> PASS\n- [x] Task 2: b — verify: `true` -> PASS\n\n## Review (today)\n- blockers: 0 found\n");
  const shipping = computeNextSkill(root);
  assert.equal(shipping.nextSkill, "hs-ship");
  assert.equal(shipping.phase, "shipping");
});

test("light mode: an approved spec.md with its own ## Tasks skips hs-plan entirely", () => {
  const root = initRoot();
  const specDir = join(root, ".harness", "specs", "001-light");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), "001-light\n");

  writeFileSync(
    join(specDir, "spec.md"),
    "# Spec+Plan: light (light)\n\n**Status:** draft\n\n## Goal\nFix a typo.\n\n## Tasks\n- [ ] Task 1: fix typo — Verify: `true`\n"
  );
  assert.equal(computeNextSkill(root).nextSkill, "hs-brainstorm", "draft light spec still needs approval");

  writeFileSync(
    join(specDir, "spec.md"),
    "# Spec+Plan: light (light)\n\n**Status:** approved\n\n## Goal\nFix a typo.\n\n## Tasks\n- [ ] Task 1: fix typo — Verify: `true`\n"
  );
  // No plan.md was ever written -- approval of spec.md alone must be enough
  // to skip straight to hs-build, not fall through to hs-plan.
  const afterApproval = computeNextSkill(root);
  assert.equal(afterApproval.nextSkill, "hs-build");
  assert.equal(afterApproval.reason, "0/1 tasks done");

  writeFileSync(join(specDir, "progress.md"), "- [x] Task 1: fix typo — verify: `true` -> PASS\n");
  assert.equal(computeNextSkill(root).nextSkill, "hs-verify");
});

test("light mode is ignored once a real plan.md exists for the same spec (full mode wins)", () => {
  const root = initRoot();
  const specDir = join(root, ".harness", "specs", "001-mixed");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), "001-mixed\n");
  writeFileSync(join(specDir, "spec.md"), "# Spec\n\n**Status:** approved\n\n## Tasks\n- [ ] stray text that looks like light mode\n");
  writeFileSync(join(specDir, "plan.md"), "# Plan\n\n**Status:** draft\n");
  assert.equal(computeNextSkill(root).nextSkill, "hs-plan", "an actual plan.md file always takes precedence over a stray ## Tasks heading");
});

test("session-state hook injects the computed phase/next-skill line into its digest", () => {
  const root = initRoot();
  writeFileSync(join(root, "hs.settings.json"), JSON.stringify({ sessionState: { enabled: true } }));
  const hook = fileURLToPath(new URL("../../hooks/session-state.mjs", import.meta.url));
  const result = execFileSync(process.execPath, [hook], {
    cwd: root,
    input: JSON.stringify({ cwd: root, hook_event_name: "SessionStart" }),
    encoding: "utf8",
  });
  const output = JSON.parse(result);
  assert.match(output.hookSpecificOutput.additionalContext, /\*\*Next: `hs-brainstorm`\*\*/);
});
