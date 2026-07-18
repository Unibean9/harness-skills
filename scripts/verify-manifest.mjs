import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const LABEL = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIREMENT = /^REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const STAGES = new Set(["baseline", "final"]);

function requireExactKeys(value, keys, message) {
  const actual = Object.keys(value || {}).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new Error(message);
}

export function verifyManifestPath(root, spec) {
  return join(root, ".harness", "specs", spec, "verify.json");
}

function validateCheck(check, labels, requirements) {
    requireExactKeys(check, ["label", "kind", "argv", "stages", "covers"], "verify manifest checks must not contain unknown fields");
    if (!check || typeof check !== "object" || !LABEL.test(check.label || "") || labels.has(check.label)) {
      throw new Error("verify manifest check labels must be unique kebab-case strings");
    }
    labels.add(check.label);
    if (!Array.isArray(check.stages) || !check.stages.length || check.stages.some((stage) => !STAGES.has(stage)) || new Set(check.stages).size !== check.stages.length) {
      throw new Error(`check '${check.label}' must declare unique baseline/final stages`);
    }
    if (!Array.isArray(check.covers) || !check.covers.length || check.covers.some((id) => !requirements.has(id)) || new Set(check.covers).size !== check.covers.length) {
      throw new Error(`check '${check.label}' must cover declared requirement IDs`);
    }
    if (check.kind === "machine") {
      if (!Array.isArray(check.argv) || !check.argv.length || !check.argv.every((arg) => typeof arg === "string" && arg.length)) {
        throw new Error(`machine check '${check.label}' requires a non-empty argv array`);
      }
    } else if (check.kind === "manual") {
      if (check.argv !== null) throw new Error(`manual check '${check.label}' must use argv: null`);
    } else {
      throw new Error(`check '${check.label}' kind must be machine or manual`);
    }
    return { label: check.label, kind: check.kind, argv: check.argv, stages: [...check.stages], covers: [...check.covers] };
  }

export function validateVerifyManifest(value) {
  if (!value || value.version !== 2 || !Array.isArray(value.requirements) || !value.requirements.length || !Array.isArray(value.checks) || !value.checks.length) {
    throw new Error("verify manifest must be version 2 with requirements and at least one check");
  }
  requireExactKeys(value, ["version", "requirements", "checks"], "verify manifest must not contain unknown fields");
  const requirements = new Set();
  for (const requirement of value.requirements) {
    const id = typeof requirement === "string" ? requirement : requirement?.id;
    if (!REQUIREMENT.test(id || "") || requirements.has(id)) throw new Error("verify manifest requirements must have unique stable IDs");
    requirements.add(id);
  }
  const labels = new Set();
  const checks = value.checks.map((check) => validateCheck(check, labels, requirements));
  const finalCoverage = new Set(checks.filter((check) => check.stages.includes("final")).flatMap((check) => check.covers));
  const uncovered = [...requirements].filter((id) => !finalCoverage.has(id));
  if (uncovered.length) throw new Error(`every requirement needs final coverage: ${uncovered.join(", ")}`);
  return { version: 2, requirements: [...requirements], checks };
}

export function validateLegacyVerifyManifest(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.checks) || !value.checks.length) {
    throw new Error("verify manifest must be version 1 with at least one check");
  }
  const labels = new Set();
  return value.checks.map((check) => {
    if (!check || typeof check !== "object" || !LABEL.test(check.label || "") || labels.has(check.label)) {
      throw new Error("verify manifest check labels must be unique kebab-case strings");
    }
    labels.add(check.label);
    if (check.kind === "machine") {
      if (!Array.isArray(check.argv) || !check.argv.length || !check.argv.every((arg) => typeof arg === "string" && arg.length)) {
        throw new Error(`machine check '${check.label}' requires a non-empty argv array`);
      }
    } else if (check.kind === "manual") {
      if (check.argv !== null) throw new Error(`manual check '${check.label}' must use argv: null`);
    } else {
      throw new Error(`check '${check.label}' kind must be machine or manual`);
    }
    return { label: check.label, kind: check.kind, argv: check.argv };
  });
}

function readManifest(root, spec) {
  const file = verifyManifestPath(root, spec);
  if (!existsSync(file)) throw new Error(`missing verify manifest: ${file}`);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`invalid verify manifest: ${error.message}`);
  }
}

export function inspectVerifyManifest(root, spec) {
  const value = readManifest(root, spec);
  if (value?.version === 1) {
    return { kind: "legacy-v1", checks: validateLegacyVerifyManifest(value), instruction: "legacy v1 manifest is read-only; regenerate v2 verification evidence" };
  }
  return { kind: "v2", manifest: validateVerifyManifest(value) };
}

export function loadVerifyManifestV2(root, spec) {
  const inspected = inspectVerifyManifest(root, spec);
  if (inspected.kind !== "v2") throw new Error(inspected.instruction);
  return inspected.manifest;
}

export const loadVerifyManifestDocument = loadVerifyManifestV2;

// Temporary v1-compatible adapter. Task 5 moves attestation to the v2 document.
export function loadVerifyManifest(root, spec) {
  try {
    const inspected = inspectVerifyManifest(root, spec);
    return inspected.kind === "v2" ? inspected.manifest.checks : inspected.checks;
  } catch (error) {
    throw new Error(`invalid verify manifest: ${error.message}`);
  }
}

export function checksForStage(document, stage) {
  if (!STAGES.has(stage)) throw new Error("verification stage must be baseline or final");
  return document.checks.filter((check) => check.stages.includes(stage));
}

export function manifestDigest(document) {
  const valid = validateVerifyManifest(document);
  return `sha256:${createHash("sha256").update(JSON.stringify(valid)).digest("hex")}`;
}
