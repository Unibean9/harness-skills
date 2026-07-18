import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const SPEC_ID_PATTERN = /^\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSpecId(spec) {
  if (typeof spec !== "string" || !SPEC_ID_PATTERN.test(spec)) {
    throw new Error("invalid spec identity");
  }
  return spec;
}

export function harnessPaths(root = process.cwd(), spec = null) {
  const harness = join(root, ".harness");
  const specs = join(harness, "specs");
  const state = join(harness, "state");
  const base = {
    harness,
    specs,
    state,
    runtimeSpecs: join(state, "specs"),
    current: join(state, "current-spec"),
    selectionLock: join(state, ".active-spec.lock"),
    index: join(specs, "INDEX.md"),
  };
  if (spec === null) return base;
  validateSpecId(spec);
  return {
    ...base,
    spec,
    specDir: join(specs, spec),
    specRuntimeDir: join(state, "specs", spec),
    legacySpecStateDir: join(specs, spec, "state"),
  };
}

export function readActiveSpec(root = process.cwd()) {
  const { current } = harnessPaths(root);
  if (!existsSync(current)) return null;
  const spec = readFileSync(current, "utf8").trim();
  return spec ? validateSpecId(spec) : null;
}

export function resolveSpecIdentity(root = process.cwd(), explicitSpec = null, { mustExist = true } = {}) {
  const spec = explicitSpec === null ? readActiveSpec(root) : validateSpecId(explicitSpec);
  if (!spec) throw new Error("no spec identity provided and no active spec selected");
  const paths = harnessPaths(root, spec);
  if (mustExist && !existsSync(paths.specDir)) throw new Error(`spec does not exist: ${spec}`);
  return spec;
}

export function detectLegacySpecState(root = process.cwd(), explicitSpec = null) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  const { legacySpecStateDir } = harnessPaths(root, spec);
  const entries = existsSync(legacySpecStateDir) ? readdirSync(legacySpecStateDir).sort() : [];
  return {
    version: entries.length ? 1 : null,
    spec,
    path: legacySpecStateDir,
    entries,
    message: entries.length
      ? `legacy v1 evidence for ${spec} is read-only; regenerate checks with the v2 runtime`
      : null,
  };
}

export function specPaths(root = process.cwd(), explicitSpec) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  const paths = harnessPaths(root, spec);
  return {
    dir: paths.specDir,
    spec: join(paths.specDir, "spec.md"),
    plan: join(paths.specDir, "plan.md"),
    progress: join(paths.specDir, "progress.md"),
    notes: join(paths.specDir, "implement-notes.md"),
    manifest: join(paths.specDir, "verify.json"),
    workflow: join(paths.specDir, "workflow.json"),
    changeset: join(paths.specDir, "changeset.json"),
  };
}

export function specRuntimePaths(root = process.cwd(), explicitSpec) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  const { specRuntimeDir } = harnessPaths(root, spec);
  return {
    dir: specRuntimeDir,
    checks: join(specRuntimeDir, "checks"),
    attestation: join(specRuntimeDir, "attestation.json"),
    attestationStatus: join(specRuntimeDir, "attestation.status"),
  };
}

export function detectSpecVersion(root = process.cwd(), explicitSpec) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  const durable = specPaths(root, spec);
  if (existsSync(durable.workflow)) {
    try {
      const value = JSON.parse(readFileSync(durable.workflow, "utf8"));
      if (value?.version === 2 && value.spec === spec && ["gated", "quick-fix", "diagnostic"].includes(value.mode) && ["brainstorming", "planning", "building", "verifying", "verified", "reviewing", "ship-approved", "shipped"].includes(value.phase) && Number.isInteger(value.revision) && value.approvals && value.planReview && value.verification && value.review) {
        return { kind: "v2", spec, readable: true, evidenceTrusted: true, instruction: null };
      }
      return { kind: "invalid", spec, readable: false, evidenceTrusted: false, instruction: "Unsupported workflow state version; repair it explicitly." };
    } catch {
      return { kind: "invalid", spec, readable: false, evidenceTrusted: false, instruction: "Malformed workflow state; repair it explicitly." };
    }
  }
  return {
    kind: "legacy-v1",
    spec,
    readable: true,
    evidenceTrusted: false,
    instruction: "Legacy v1 history is read-only; regenerate workflow state and verification evidence under v2.",
  };
}
