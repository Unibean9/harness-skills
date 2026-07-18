import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCheckStateDir } from "./state.mjs";
import { fingerprintWorktree } from "./worktree.mjs";
import { checksForStage, loadVerifyManifest, loadVerifyManifestV2, manifestDigest } from "./verify-manifest.mjs";
import { specRuntimePaths } from "./paths.mjs";

const maxAgeMs = 24 * 60 * 60 * 1000;
const SCHEMA_VERSION = 3;
const statePath = (root) => join(root, ".harness", "state");
const activeSpec = (root) => readFileSync(join(statePath(root), "current-spec"), "utf8").trim();
const sameArgv = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]);
const sameChecks = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((check, index) => check.label === right[index].label && check.kind === right[index].kind && sameArgv(check.argv, right[index].argv));
const timestampValid = (value) => Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now() + 60_000 && Date.now() - Date.parse(value) <= maxAgeMs;

function evidenceChecks(root, spec, checks) {
  const checkDir = resolveCheckStateDir(root);
  const currentFingerprint = fingerprintWorktree(root);
  const expected = new Set(checks.map((check) => check.label));
  const extra = existsSync(checkDir) ? readdirSync(checkDir)
    .filter((name) => /^verify-.*\.status$/.test(name))
    .map((name) => name.slice(0, -".status".length))
    .filter((label) => !expected.has(label)) : [];
  if (extra.length) throw new Error(`unexpected verification evidence: ${extra.join(", ")}`);
  for (const check of checks) {
    const status = join(checkDir, `${check.label}.status`);
    if (!existsSync(status) || readFileSync(status, "utf8").trim() !== "PASS") throw new Error(`cannot attest, not PASS: ${check.label}`);
    const sidecar = join(checkDir, `${check.label}.json`);
    if (check.kind === "manual") {
      if (existsSync(sidecar)) throw new Error(`manual check '${check.label}' must not have machine evidence`);
      continue;
    }
    if (!existsSync(sidecar)) throw new Error(`machine check '${check.label}' lacks provenance evidence`);
    let evidence;
    try { evidence = JSON.parse(readFileSync(sidecar, "utf8")); } catch { throw new Error(`machine check '${check.label}' has malformed provenance evidence`); }
    if (evidence.version !== 1 || evidence.spec !== spec || evidence.label !== check.label || !sameArgv(evidence.argv, check.argv) || evidence.pass !== true || evidence.exitCode !== 0 || evidence.worktreeChanged !== false || evidence.fingerprintError || evidence.fingerprintBefore !== currentFingerprint || evidence.fingerprintAfter !== currentFingerprint) {
      throw new Error(`machine check '${check.label}' does not prove the current worktree`);
    }
  }
}

export function createLegacyAttestation(root = process.cwd()) {
  const spec = activeSpec(root);
  const checks = loadVerifyManifest(root, spec);
  evidenceChecks(root, spec, checks);
  const record = { version: SCHEMA_VERSION, spec, createdAt: new Date().toISOString(), fingerprint: fingerprintWorktree(root), checks };
  writeFileSync(join(statePath(root), "verify-all.json"), `${JSON.stringify(record)}\n`);
  writeFileSync(join(statePath(root), "verify-all.status"), "PASS\n");
  return record;
}

export function validateLegacyAttestation(root = process.cwd()) {
  try {
    const spec = activeSpec(root);
    const value = JSON.parse(readFileSync(join(statePath(root), "verify-all.json"), "utf8"));
    if (value.version !== SCHEMA_VERSION || value.spec !== spec || !sameChecks(value.checks, loadVerifyManifest(root, spec))) return false;
    if (Date.now() - Date.parse(value.createdAt) > maxAgeMs) return false;
    return value.fingerprint === fingerprintWorktree(root);
  } catch { return false; }
}

function loadFinalEvidence(root, spec, manifest, check, fingerprint) {
  const runtime = specRuntimePaths(root, spec);
  const file = join(runtime.checks, `final-${check.label}.json`);
  if (!existsSync(file)) throw new Error(`missing final evidence: ${check.label}`);
  let evidence;
  try { evidence = JSON.parse(readFileSync(file, "utf8")); } catch { throw new Error(`malformed final evidence: ${check.label}`); }
  const argvMatches = check.kind === "manual" ? evidence.argv === null && check.argv === null : sameArgv(evidence.argv, check.argv);
  const common = evidence.version === 2 && evidence.spec === spec && evidence.stage === "final" && evidence.label === check.label && evidence.kind === check.kind && argvMatches && JSON.stringify(evidence.covers) === JSON.stringify(check.covers) && evidence.manifestDigest === manifestDigest(manifest);
  if (!common) throw new Error(`final evidence does not match manifest: ${check.label}`);
  if (check.kind === "machine") {
    if (evidence.pass !== true || evidence.exitCode !== 0 || evidence.worktreeChanged !== false || evidence.fingerprintBefore !== fingerprint || evidence.fingerprintAfter !== fingerprint || !timestampValid(evidence.startedAt) || !timestampValid(evidence.finishedAt)) throw new Error(`machine evidence does not prove the current worktree: ${check.label}`);
  } else if (evidence.verdict !== "PASS" || evidence.fingerprint !== fingerprint || !timestampValid(evidence.confirmedAt) || typeof evidence.confirmedBy !== "string" || !evidence.confirmedBy.trim() || typeof evidence.reference !== "string" || !evidence.reference.trim()) {
    throw new Error(`manual evidence does not prove the current worktree: ${check.label}`);
  }
  return evidence;
}

function collectFinalEvidence(root, spec, manifest) {
  const runtime = specRuntimePaths(root, spec);
  const checks = checksForStage(manifest, "final");
  const expected = new Set(checks.map((check) => `final-${check.label}.json`));
  const extra = existsSync(runtime.checks) ? readdirSync(runtime.checks).filter((file) => /^final-.*\.json$/.test(file) && !expected.has(file)) : [];
  if (extra.length) throw new Error(`unexpected final verification evidence: ${extra.join(", ")}`);
  const fingerprint = fingerprintWorktree(root);
  return { fingerprint, evidence: checks.map((check) => loadFinalEvidence(root, spec, manifest, check, fingerprint)) };
}

export function createAttestation(root = process.cwd(), spec) {
  if (!spec) throw new Error("explicit spec identity is required for attestation");
  const manifest = loadVerifyManifestV2(root, spec); const collected = collectFinalEvidence(root, spec, manifest);
  const runtime = specRuntimePaths(root, spec);
  const record = { version: 2, spec, stage: "final", createdAt: new Date().toISOString(), fingerprint: collected.fingerprint, manifestDigest: manifestDigest(manifest), checks: collected.evidence.map((evidence) => ({ label: evidence.label, kind: evidence.kind })) };
  writeFileSync(runtime.attestation, `${JSON.stringify(record)}\n`);
  writeFileSync(runtime.attestationStatus, "PASS\n");
  return record;
}

export function validateAttestationV2(root = process.cwd(), spec) {
  try {
    if (!spec) return false;
    const manifest = loadVerifyManifestV2(root, spec); const runtime = specRuntimePaths(root, spec);
    const record = JSON.parse(readFileSync(runtime.attestation, "utf8"));
    const collected = collectFinalEvidence(root, spec, manifest);
    return record.version === 2 && record.spec === spec && record.stage === "final" && record.manifestDigest === manifestDigest(manifest) && timestampValid(record.createdAt) && record.fingerprint === collected.fingerprint && JSON.stringify(record.checks) === JSON.stringify(collected.evidence.map((evidence) => ({ label: evidence.label, kind: evidence.kind })));
  } catch { return false; }
}

// Kept until Task 6 moves legacy readiness consumers onto the v2 oracle.
export const validateAttestation = validateLegacyAttestation;

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [action, specFlag, spec] = process.argv.slice(2);
  try {
    if ((action === "attest" || action === "validate") && specFlag === "--spec" && spec && process.argv.length === 5) {
      if (action === "attest") console.log(`attested ${createAttestation(process.cwd(), spec).spec}`);
      else {
        const ok = validateAttestationV2(process.cwd(), spec);
      console.log(ok ? "VALID" : "INVALID");
      if (!ok) process.exitCode = 1;
      }
    } else {
      throw new Error("usage: attestation.mjs attest|validate --spec <id>");
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
