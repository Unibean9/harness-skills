#!/usr/bin/env node
// Computes "which skill comes next" from disk state alone -- the exact
// decision tree AGENTS.md describes in prose ("route from state, not
// memory"). A model still has to read this correctly every session; this
// module makes the read deterministic instead of leaving it to inference
// over spec.md/plan.md/progress.md each time.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { harnessPaths, readActiveSpec } from "./paths.mjs";
import { validateAttestation } from "./attestation.mjs";

function statusOf(text) {
  const match = text.match(/\*\*Status:\*\*\s*(\w+)/);
  return match ? match[1] : null;
}

// Same row-parsing logic as check-ship-ready.mjs's indexPhase -- kept as a
// small local copy rather than a shared import to avoid coupling these two
// otherwise-independent modules over one table lookup; if this drifts from
// check-ship-ready.mjs's version, that's a bug to catch in review, same as
// the light-mode detection the two already have to agree on.
function indexPhase(root, spec) {
  const { index } = harnessPaths(root);
  if (!existsSync(index)) return null;
  const [id, ...slugParts] = spec.split("-");
  const slug = slugParts.join("-");
  const line = readFileSync(index, "utf8").split("\n").find((value) => {
    const cells = value.split("|").map((cell) => cell.trim());
    return cells[1] === id && cells[2] === slug;
  });
  return line?.split("|").map((value) => value.trim())[3] || null;
}

export function computeNextSkill(root = process.cwd()) {
  const activeSpec = readActiveSpec(root);
  if (!activeSpec) {
    return { phase: "none", nextSkill: "hs-brainstorm", reason: "no active spec selected" };
  }

  // A shipped spec is terminal -- readiness/AGENTS.md's own routing tree
  // both treat it as "start a new feature," not as still being worked on.
  // Without this check, computeNextSkill kept reporting whatever phase the
  // (now-frozen) disk state implied forever, disagreeing with `hs readiness`
  // the moment a spec shipped -- exactly the mismatch AGENTS.md now says to
  // treat as a bug.
  if (indexPhase(root, activeSpec) === "shipped") {
    return { phase: "none", nextSkill: "hs-brainstorm", reason: "active spec already shipped -- start a new one", activeSpec };
  }

  const { specDir } = harnessPaths(root, activeSpec);
  const specFile = join(specDir, "spec.md");
  const planFile = join(specDir, "plan.md");
  const progressFile = join(specDir, "progress.md");

  if (!existsSync(specFile)) {
    return { phase: "brainstorming", nextSkill: "hs-brainstorm", reason: "spec missing or not yet approved", activeSpec };
  }
  const specText = readFileSync(specFile, "utf8");
  if (statusOf(specText) !== "approved") {
    return { phase: "brainstorming", nextSkill: "hs-brainstorm", reason: "spec missing or not yet approved", activeSpec };
  }

  // Light mode: a small task's spec.md embeds its own "## Tasks" checklist
  // instead of a separate plan.md -- approving spec.md approves the plan too,
  // so hs-plan is skipped entirely once this file alone says approved.
  const isLightMode = /^## Tasks\b/m.test(specText) && !existsSync(planFile);

  // Numbered-task pattern ("- [ ] Task 3: ..." / "## Task 3: ...") matches
  // check-ship-ready.mjs's `ids()` extraction exactly -- both must agree on
  // what counts as a task, or `hs status` and `hs readiness` can report
  // different task counts for the identical disk state (a bare "- [ ] Task"
  // with no number/colon, which the template never produces, used to count
  // here but not there).
  let planTaskCount;
  if (isLightMode) {
    planTaskCount = (specText.match(/^- \[[ x]\] Task \d+:/gm) || []).length;
  } else {
    if (!existsSync(planFile) || statusOf(readFileSync(planFile, "utf8")) !== "approved") {
      return { phase: "planning", nextSkill: "hs-plan", reason: "plan missing or not yet approved", activeSpec };
    }
    planTaskCount = (readFileSync(planFile, "utf8").match(/^## Task \d+:/gm) || []).length;
  }

  const progressText = existsSync(progressFile) ? readFileSync(progressFile, "utf8") : "";
  const doneTaskCount = (progressText.match(/^- \[x\] Task \d+:/gm) || []).length;

  if (planTaskCount > 0 && doneTaskCount < planTaskCount) {
    return { phase: "building", nextSkill: "hs-build", reason: `${doneTaskCount}/${planTaskCount} tasks done`, activeSpec };
  }

  let attestationValid = false;
  try {
    attestationValid = validateAttestation(root, activeSpec);
  } catch {
    attestationValid = false;
  }

  if (!attestationValid) {
    return { phase: "verifying", nextSkill: "hs-verify", reason: "all tasks done, no valid verify attestation yet", activeSpec };
  }

  if (!/^## Review\b/m.test(progressText)) {
    return { phase: "reviewing", nextSkill: "hs-review (recommended, not required) or hs-ship", reason: "attestation valid, no review recorded yet", activeSpec };
  }

  return { phase: "shipping", nextSkill: "hs-ship", reason: "attestation valid, review recorded", activeSpec };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = computeNextSkill(process.cwd());
  console.log(`phase: ${result.phase}`);
  console.log(`next skill: ${result.nextSkill}`);
  console.log(`reason: ${result.reason}`);
  if (result.activeSpec) console.log(`active spec: ${result.activeSpec}`);
}
