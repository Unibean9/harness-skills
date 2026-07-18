#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAttestation, validateTrivialAttestation } from "./attestation.mjs";

const approved = (file) => existsSync(file) && /\*\*Status:\*\*\s*approved\b/.test(readFileSync(file, "utf8"));
const ids = (text, expression) => [...text.matchAll(expression)].map((match) => match[1]);

function indexPhase(root, active) {
  const index = join(root, ".harness", "specs", "INDEX.md");
  if (!existsSync(index)) return null;
  const [id, ...slugParts] = active.split("-"); const slug = slugParts.join("-");
  const line = readFileSync(index, "utf8").split("\n").find((value) => {
    const cells = value.split("|").map((cell) => cell.trim());
    return cells[1] === id && cells[2] === slug;
  });
  return line?.split("|").map((value) => value.trim())[3] || null;
}

export function evaluateReadiness(root = process.cwd()) {
  // Checked first and unconditionally, independent of whatever spec is (or
  // isn't, or was) selected: `current-spec` is never cleared once a project
  // has selected one, so gating the trivial exemption on "no active spec"
  // would make it unreachable in every real repo after its first spec ships.
  // A trivial change is orthogonal to whatever bigger spec is in progress or
  // already shipped -- its own worktree-bound attestation is sufficient on
  // its own, so an optional ship policy can support a small change without
  // requiring a durable spec or plan.
  if (validateTrivialAttestation(root)) return { ready: true, errors: [], trivial: true };

  const current = join(root, ".harness", "state", "current-spec");
  if (!existsSync(current)) return { ready: false, errors: ["no active spec"] };
  const active = readFileSync(current, "utf8").trim();
  const specDir = join(root, ".harness", "specs", active);
  if (!/^[0-9]+-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(active) || !existsSync(specDir)) return { ready: false, errors: ["invalid active spec"] };
  if (indexPhase(root, active) === "shipped") return { ready: false, errors: ["active spec is shipped"], active };
  const specFile = join(specDir, "spec.md");
  if (!approved(specFile)) return { ready: false, errors: ["spec is not approved"], active };

  // Light mode: spec.md embeds its own "## Tasks" checklist instead of a
  // separate plan.md -- approving spec.md alone approves the plan too (see
  // skills/hs-brainstorm/references/spec-template.md). Must match
  // scripts/next-skill.mjs's detection exactly, or readiness and routing
  // disagree about what "planned" means.
  const plan = join(specDir, "plan.md");
  const specText = readFileSync(specFile, "utf8");
  const isLightMode = /^## Tasks\b/m.test(specText) && !existsSync(plan);
  let planned;
  if (isLightMode) {
    planned = ids(specText, /^- \[[ x]\] Task (\d+):/gm);
  } else {
    if (!approved(plan)) return { ready: false, errors: ["plan is not approved"], active };
    planned = ids(readFileSync(plan, "utf8"), /^## Task (\d+):/gm);
  }
  const progress = join(specDir, "progress.md"); const progressText = existsSync(progress) ? readFileSync(progress, "utf8") : "";
  const done = ids(progressText, /^- \[x\] Task (\d+):/gm); const unchecked = ids(progressText, /^- \[ \] Task (\d+):/gm);
  const unique = (values) => new Set(values).size === values.length;
  const exact = unique(planned) && unique(done) && !unchecked.length && planned.length === done.length && planned.every((id) => done.includes(id));
  if (!exact) return { ready: false, errors: ["planned and completed task IDs do not match exactly"], active };
  if (!validateAttestation(root)) return { ready: false, errors: ["verification attestation is invalid"], active };
  const reviewed = /^## Review\b/m.test(progressText);
  return { ready: true, errors: [], active, reviewed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = evaluateReadiness(process.cwd());
  for (const error of result.errors) console.log(`NOT READY: ${error}`);
  console.log(result.ready ? "READY" : "NOT READY");
  process.exit(result.ready ? 0 : 1);
}
