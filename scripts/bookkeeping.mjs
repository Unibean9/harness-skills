#!/usr/bin/env node
// Auto-updates the two pieces of bookkeeping every hs-build/hs-verify pass
// through the SKILL.md instructions asks a model to remember by hand:
// appending a progress.md line after a task check passes, and flipping the
// spec's INDEX.md Phase cell. Automating the mechanical, judgment-free
// transitions here removes exactly the class of drift risk a model
// forgetting (or mis-copying) either step creates -- it does NOT touch the
// judgment-driven transitions (hs-review's triage, hs-ship's human-confirmed
// "shipped"), which stay the model's responsibility on purpose.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { harnessPaths } from "./paths.mjs";

function findTaskName(text, taskNumber) {
  // Full-mode plan.md: "## Task N: <name>" headers.
  const fullMatch = text.match(new RegExp(`^## Task ${taskNumber}: (.+)$`, "m"));
  if (fullMatch) return fullMatch[1].trim();
  // Light-mode spec.md: "- [ ] Task N: <name> — Verify: `cmd`" checklist lines.
  const lightMatch = text.match(new RegExp(`^- \\[[ x]\\] Task ${taskNumber}: (.+?)\\s*(?:—|-)\\s*Verify:`, "m"));
  if (lightMatch) return lightMatch[1].trim();
  return null;
}

// Numbered-task pattern, matching next-skill.mjs and check-ship-ready.mjs
// exactly -- all three must agree on what counts as a task, or "all tasks
// done" can mean three different things depending on which one answers.
function totalTaskCount(text) {
  const fullCount = (text.match(/^## Task \d+:/gm) || []).length;
  if (fullCount) return fullCount;
  return (text.match(/^- \[[ x]\] Task \d+:/gm) || []).length;
}

// Appends a progress.md line for a passed task-N check, looking up the task's
// name from plan.md (full mode) or spec.md's "## Tasks" (light mode) so the
// line reads the same as a hand-written one would. Idempotent: re-running the
// same task's check doesn't duplicate its progress.md line.
export function recordTaskProgress(root, spec, label, argv, pass) {
  if (!pass) return { recorded: false, reason: "check did not pass" };
  const match = /^task-(\d+)$/.exec(label);
  if (!match) return { recorded: false, reason: "label is not a task-N check" };
  const taskNumber = match[1];

  const { specDir } = harnessPaths(root, spec);
  const planFile = join(specDir, "plan.md");
  const specFile = join(specDir, "spec.md");
  const source = existsSync(planFile) ? readFileSync(planFile, "utf8") : existsSync(specFile) ? readFileSync(specFile, "utf8") : "";
  const name = findTaskName(source, taskNumber) || `task-${taskNumber}`;
  const command = argv.join(" ");
  const line = `- [x] Task ${taskNumber}: ${name} — verify: \`${command}\` -> PASS`;

  const progressFile = join(specDir, "progress.md");
  const existing = existsSync(progressFile) ? readFileSync(progressFile, "utf8") : "";
  if (existing.includes(`- [x] Task ${taskNumber}:`)) return { recorded: false, reason: "already recorded" };

  const separator = existing && !existing.endsWith("\n") ? "\n" : "";
  const updatedContent = existing + separator + line + "\n";
  writeFileSync(progressFile, updatedContent);

  const total = totalTaskCount(source);
  const doneCount = (updatedContent.match(/^- \[x\] Task \d+:/gm) || []).length;
  const allDone = total > 0 && doneCount >= total;
  if (allDone) syncIndexPhase(root, spec, "building");
  return { recorded: true, line, allTasksDone: allDone };
}

// Rewrites the active spec's row in INDEX.md -- Phase and Updated columns
// only, leaving ID/Slug and every other row untouched. Silently no-ops if
// INDEX.md or the row don't exist yet (nothing to sync before hs-brainstorm
// has created either).
export function syncIndexPhase(root, spec, phase) {
  const { index } = harnessPaths(root);
  if (!existsSync(index)) return { synced: false, reason: "INDEX.md does not exist" };
  const idMatch = /^(\d+)-/.exec(spec);
  if (!idMatch) return { synced: false, reason: "invalid spec identity" };
  const id = idMatch[1];
  const text = readFileSync(index, "utf8");
  const rowPattern = new RegExp(`^(\\|\\s*${id}\\s*\\|[^|]*\\|)([^|]*)(\\|)[^|]*(\\|)\\s*$`, "m");
  const match = rowPattern.exec(text);
  if (!match) return { synced: false, reason: `no INDEX.md row for spec ${id}` };
  // "shipped" is terminal -- re-running hs-verify/hs-check against a spec
  // that's already shipped (e.g. a stale current-spec pointer left over
  // after shipping, or someone re-verifying out of curiosity) must never
  // resurrect it. Only hs-ship itself, writing "shipped" directly, moves a
  // spec into or out of this state.
  const currentPhase = match[2].trim();
  if (currentPhase === "shipped") return { synced: false, reason: "spec is already shipped -- refusing to overwrite a terminal phase" };
  const today = new Date().toISOString().slice(0, 10);
  const updated = text.replace(rowPattern, (_match, before, _phaseCell, mid, after) => `${before} ${phase} ${mid} ${today} ${after}`);
  writeFileSync(index, updated);
  return { synced: true, phase, date: today };
}
