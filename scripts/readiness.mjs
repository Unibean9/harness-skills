import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateAttestation } from "./attestation.mjs";

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
  const current = join(root, ".harness", "state", "current-spec");
  if (!existsSync(current)) return { ready: false, nextPhase: "hs-brainstorm", errors: ["no active spec"] };
  const active = readFileSync(current, "utf8").trim();
  const specDir = join(root, ".harness", "specs", active);
  if (!/^[0-9]+-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(active) || !existsSync(specDir)) return { ready: false, nextPhase: "hs-brainstorm", errors: ["invalid active spec"] };
  if (indexPhase(root, active) === "shipped") return { ready: false, nextPhase: "hs-brainstorm", errors: ["active spec is shipped"], active };
  if (!approved(join(specDir, "spec.md"))) return { ready: false, nextPhase: "hs-brainstorm", errors: ["spec is not approved"], active };
  const plan = join(specDir, "plan.md");
  if (!approved(plan)) return { ready: false, nextPhase: "hs-plan", errors: ["plan is not approved"], active };
  const planned = ids(readFileSync(plan, "utf8"), /^## Task (\d+):/gm);
  const progress = join(specDir, "progress.md"); const progressText = existsSync(progress) ? readFileSync(progress, "utf8") : "";
  const done = ids(progressText, /^- \[x\] Task (\d+):/gm); const unchecked = ids(progressText, /^- \[ \] Task (\d+):/gm);
  const unique = (values) => new Set(values).size === values.length;
  const exact = unique(planned) && unique(done) && !unchecked.length && planned.length === done.length && planned.every((id) => done.includes(id));
  if (!exact) return { ready: false, nextPhase: "hs-build", errors: ["planned and completed task IDs do not match exactly"], active };
  if (!validateAttestation(root)) return { ready: false, nextPhase: "hs-verify", errors: ["verification attestation is invalid"], active };
  const reviewed = /^## Review /m.test(progressText);
  return { ready: true, nextPhase: reviewed ? "hs-ship" : "hs-review", errors: [], active, reviewed };
}
