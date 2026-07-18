import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { currentChangesetIdentity } from "./changeset.mjs";
import { harnessPaths, resolveSpecIdentity, specPaths, specRuntimePaths } from "./paths.mjs";
import { fingerprintWorktree } from "./worktree.mjs";

export const WORKFLOW_VERSION = 2;
export const MODES = new Set(["gated", "quick-fix", "diagnostic"]);
export const PHASES = new Set(["brainstorming", "planning", "building", "verifying", "verified", "reviewing", "ship-approved", "shipped"]);
export const REVIEW_STATUSES = new Set(["absent", "clean", "findings-open", "waived"]);

const phaseProjection = {
  brainstorming: "brainstorming",
  planning: "planning",
  building: "building",
  verifying: "verifying",
  verified: "verifying",
  reviewing: "reviewing",
  "ship-approved": "reviewing",
  shipped: "shipped",
};

const allowed = {
  brainstorming: new Set(["approve-spec"]),
  planning: new Set(["record-plan-review", "approve-plan"]),
  building: new Set(["complete-build"]),
  verifying: new Set(["record-verification"]),
  verified: new Set(["record-review", "waive-review", "mark-dirty", "approve-ship"]),
  reviewing: new Set(["record-review", "waive-review", "mark-dirty", "approve-ship"]),
  "ship-approved": new Set(["mark-dirty", "mark-shipped"]),
  shipped: new Set(),
};

const nowIso = (value) => value || new Date().toISOString();
const hashFile = (file) => `sha256:${createHash("sha256").update(readFileSync(file)).digest("hex")}`;

function requireApproval(value, kind) {
  if (!value || value.kind !== kind || typeof value.reference !== "string" || !value.reference.trim()) {
    throw new Error(`explicit ${kind} approval is required`);
  }
  return { recordedAt: nowIso(value.recordedAt), reference: value.reference.trim() };
}

function validatePlanReview(value, planHash) {
  const dimensions = value?.dimensions;
  const required = ["coverage", "ordering", "risk", "verifyQuality"];
  if (!dimensions || !required.every((key) => dimensions[key] === "pass") || value.blockersOpen !== 0) {
    throw new Error("plan review must be clean with every dimension passing and no open blockers");
  }
  return {
    status: "clean",
    recordedAt: nowIso(value.recordedAt),
    planHash,
    dimensions: { coverage: "pass", ordering: "pass", risk: "pass", verifyQuality: "pass" },
    blockersOpen: 0,
  };
}

function stateFor(spec, mode = "gated", phase = "brainstorming", timestamp = nowIso()) {
  if (!MODES.has(mode)) throw new Error("invalid workflow mode");
  if (!PHASES.has(phase)) throw new Error("invalid workflow phase");
  return {
    version: WORKFLOW_VERSION,
    spec,
    mode,
    phase,
    revision: 0,
    updatedAt: timestamp,
    approvals: { spec: null, plan: null, ship: null },
    planReview: { status: "absent", recordedAt: null, planHash: null, dimensions: null, blockersOpen: null },
    verification: { status: "absent", fingerprint: null, attestedAt: null },
    review: { status: "absent", recordedAt: null, changeset: null },
  };
}

export function validateWorkflow(value, { spec } = {}) {
  if (!value || value.version !== WORKFLOW_VERSION || typeof value.spec !== "string" || (spec && value.spec !== spec)) throw new Error("invalid workflow state");
  if (!MODES.has(value.mode) || !PHASES.has(value.phase) || !Number.isInteger(value.revision) || value.revision < 0) throw new Error("invalid workflow state");
  if (!value.approvals || !value.planReview || !value.verification || !value.review || !REVIEW_STATUSES.has(value.review.status)) throw new Error("invalid workflow state");
  return value;
}

export function loadWorkflow(root = process.cwd(), explicitSpec, { optional = false } = {}) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  const { workflow } = specPaths(root, spec);
  if (!existsSync(workflow)) {
    if (optional) return null;
    throw new Error(`missing workflow state: ${workflow}`);
  }
  try {
    return validateWorkflow(JSON.parse(readFileSync(workflow, "utf8")), { spec });
  } catch (error) {
    if (error.message.startsWith("invalid workflow state")) throw error;
    throw new Error(`invalid workflow state: ${error.message}`);
  }
}

function splitIdentity(spec) {
  const [id, ...parts] = spec.split("-");
  return { id, slug: parts.join("-") };
}

export function projectIndexRow(state) {
  return { phase: phaseProjection[state.phase], updated: state.updatedAt.slice(0, 10) };
}

function projectIndex(indexText, state, { allowCreate = false } = {}) {
  const { id, slug } = splitIdentity(state.spec);
  const row = projectIndexRow(state);
  const lines = indexText ? indexText.split("\n") : ["# Spec Index", "", "| ID | Slug | Phase | Updated |", "|---|---|---|---|"];
  const matches = [];
  lines.forEach((line, position) => {
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells[1] === id && cells[2] === slug) matches.push(position);
  });
  if (matches.length > 1 || (!matches.length && !allowCreate)) throw new Error("index must contain exactly one row for the workflow spec");
  const line = `| ${id} | ${slug} | ${row.phase} | ${row.updated} |`;
  if (matches.length) lines[matches[0]] = line;
  else lines.push(line);
  return lines.join("\n").replace(/\n*$/, "\n");
}

function withTransitionLock(root, spec, fn) {
  const lock = join(specRuntimePaths(root, spec).dir, ".workflow-transition.lock");
  mkdirSync(dirname(lock), { recursive: true });
  try { mkdirSync(lock); } catch (error) {
    if (error?.code === "EEXIST") throw new Error("workflow transition is already in progress");
    throw error;
  }
  try { return fn(); } finally { rmSync(lock, { recursive: true, force: true }); }
}

function writePair(workflowFile, workflowText, indexFile, indexText, previousWorkflow, previousIndex) {
  mkdirSync(dirname(workflowFile), { recursive: true });
  mkdirSync(dirname(indexFile), { recursive: true });
  const workflowTemp = `${workflowFile}.${process.pid}.tmp`;
  const indexTemp = `${indexFile}.${process.pid}.tmp`;
  let indexWritten = false;
  try {
    writeFileSync(workflowTemp, workflowText);
    writeFileSync(indexTemp, indexText);
    renameSync(indexTemp, indexFile);
    indexWritten = true;
    renameSync(workflowTemp, workflowFile);
  } catch (error) {
    if (indexWritten) writeFileSync(indexFile, previousIndex);
    if (previousWorkflow === null) rmSync(workflowFile, { force: true });
    else if (existsSync(workflowFile)) writeFileSync(workflowFile, previousWorkflow);
    throw error;
  } finally {
    rmSync(workflowTemp, { force: true });
    rmSync(indexTemp, { force: true });
  }
}

export function initializeWorkflow(root = process.cwd(), explicitSpec, { mode = "gated", timestamp } = {}) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  return withTransitionLock(root, spec, () => {
    const { workflow } = specPaths(root, spec);
    if (existsSync(workflow)) throw new Error("workflow state already exists");
    const state = stateFor(spec, mode, "brainstorming", nowIso(timestamp));
    const { index } = harnessPaths(root);
    const previousIndex = existsSync(index) ? readFileSync(index, "utf8") : "";
    const nextIndex = projectIndex(previousIndex, state, { allowCreate: true });
    writePair(workflow, `${JSON.stringify(state)}\n`, index, nextIndex, null, previousIndex);
    return state;
  });
}

export function transitionWorkflow(root = process.cwd(), explicitSpec, event, input = {}) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  return withTransitionLock(root, spec, () => {
    const current = loadWorkflow(root, spec);
    if (input.expectedRevision !== current.revision) throw new Error("workflow revision does not match expected revision");
    if (!allowed[current.phase].has(event)) throw new Error(`workflow event '${event}' is not allowed from ${current.phase}`);
    const next = structuredClone(current);
    const durable = specPaths(root, spec);
    const timestamp = nowIso(input.timestamp);

    if (event === "approve-spec") {
      next.approvals.spec = { ...requireApproval(input.approval, "spec"), documentHash: hashFile(durable.spec) };
      next.phase = "planning";
    } else if (event === "record-plan-review") {
      next.planReview = validatePlanReview(input.planReview, hashFile(durable.plan));
    } else if (event === "approve-plan") {
      if (next.planReview.status !== "clean" || next.planReview.planHash !== hashFile(durable.plan)) throw new Error("a current clean plan review is required before plan approval");
      next.approvals.plan = { ...requireApproval(input.approval, "plan"), documentHash: hashFile(durable.plan) };
      next.phase = "building";
    } else if (event === "complete-build") {
      if (!next.approvals.plan || next.approvals.plan.documentHash !== hashFile(durable.plan)) throw new Error("a current approved plan is required before verification");
      next.phase = "verifying";
    } else if (event === "record-verification") {
      if (!input.verification?.fingerprint) throw new Error("verification fingerprint is required");
      next.verification = { status: "valid", fingerprint: input.verification.fingerprint, attestedAt: timestamp };
      next.phase = "verified";
    } else if (event === "record-review" || event === "waive-review") {
      const status = event === "waive-review" ? "waived" : input.review?.status;
      if (!REVIEW_STATUSES.has(status) || status === "absent") throw new Error("a concrete review status is required");
      const changeset = currentChangesetIdentity(root, spec);
      if (!changeset.safeForReview) throw new Error("pre-existing dirty paths changed; review changeset is unsafe");
      if (next.verification.fingerprint !== changeset.fingerprint) throw new Error("verification does not prove the current review changeset");
      if (input.review?.expectedChangeset && input.review.expectedChangeset !== changeset.changesetId) {
        throw new Error("review changeset changed before review was recorded");
      }
      next.review = { status, recordedAt: timestamp, changeset: changeset.changesetId };
      next.phase = "reviewing";
    } else if (event === "mark-dirty") {
      next.verification = { status: "absent", fingerprint: null, attestedAt: null };
      next.approvals.ship = null;
      next.phase = "building";
    } else if (event === "approve-ship") {
      if (next.verification.status !== "valid") throw new Error("valid verification is required before ship approval");
      if (next.review.status === "findings-open") throw new Error("open review findings block ship approval");
      next.approvals.ship = requireApproval(input.approval, "ship");
      next.phase = "ship-approved";
    } else if (event === "mark-shipped") {
      next.phase = "shipped";
    }

    next.revision += 1;
    next.updatedAt = timestamp;
    validateWorkflow(next, { spec });
    const { index } = harnessPaths(root);
    const previousWorkflow = readFileSync(durable.workflow, "utf8");
    const previousIndex = readFileSync(index, "utf8");
    const nextIndex = projectIndex(previousIndex, next);
    writePair(durable.workflow, `${JSON.stringify(next)}\n`, index, nextIndex, previousWorkflow, previousIndex);
    return next;
  });
}

export function workflowRoute(state) {
  if (state.phase === "brainstorming") return "hs-brainstorm";
  if (state.phase === "planning") return "hs-plan";
  if (state.phase === "building") return "hs-build";
  if (state.phase === "verifying") return "hs-verify";
  if (state.phase === "verified") return "hs-review";
  if (state.phase === "reviewing" || state.phase === "ship-approved") return "hs-ship";
  return "hs-brainstorm";
}

export function markWorkflowDirtyIfChanged(root = process.cwd(), explicitSpec) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  const state = loadWorkflow(root, spec);
  if (!["verified", "reviewing", "ship-approved"].includes(state.phase) || state.verification.status !== "valid") return state;
  if (state.verification.fingerprint === fingerprintWorktree(root)) return state;
  return transitionWorkflow(root, spec, "mark-dirty", { expectedRevision: state.revision });
}

export const reconcileProductState = markWorkflowDirtyIfChanged;
