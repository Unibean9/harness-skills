import { existsSync, readFileSync } from "node:fs";
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

export function specPaths(root = process.cwd(), explicitSpec) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  const paths = harnessPaths(root, spec);
  return {
    dir: paths.specDir,
    spec: join(paths.specDir, "spec.md"),
    plan: join(paths.specDir, "plan.md"),
    progress: join(paths.specDir, "progress.md"),
    notes: join(paths.specDir, "implement-notes.md"),
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
