import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSpecIdentity, specRuntimePaths, harnessPaths } from "./paths.mjs";
import { fingerprintWorktree } from "./worktree.mjs";

const maxAgeMs = 24 * 60 * 60 * 1000;
const verifyLabel = /^verify-.+/;

// Optional per-spec manifest at .harness/specs/<spec>/verify.json declaring
// which verify-* labels are required. Without one, attest accepts whatever
// verify-* checks happen to exist -- which is exactly the gap where a
// skipped check (lint forgotten, build never run) goes uncaught. With one,
// a declared-but-missing label fails attest instead of silently passing.
// collectVerifyEvidence/collectTrivialVerifyEvidence throw their own "does
// not prove the current worktree" error per-check, one layer below the
// top-level fingerprint comparison in explain*Validity below -- a worktree
// edit is caught there first, before the record-level comparison ever runs.
// Recognize that specific case and give it the same clear wording either
// layer would use, instead of leaking the inner per-check error verbatim.
// `mode` picks the correct rerun instruction -- "rerun hs-verify" is
// meaningless noise on the trivial path, which has no spec for hs-verify
// to run against.
function describeCollectionError(error, mode = "spec") {
  const rerun = mode === "trivial"
    ? "rerun the bundled run-check.mjs helper in --trivial mode"
    : "rerun the required verification commands and record them with run-check.mjs";
  if (/does not prove the current worktree/.test(error.message)) {
    return `the worktree has changed since this attestation was created -- ${rerun}`;
  }
  return `underlying checks no longer support this attestation: ${error.message}`;
}

function loadRequiredLabels(root, spec) {
  const manifestPath = join(harnessPaths(root, spec).specDir, "verify.json");
  if (!existsSync(manifestPath)) return null;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    throw new Error("verify.json exists but is not valid JSON");
  }
  if (!Array.isArray(manifest.checks)) throw new Error("verify.json must have a \"checks\" array");
  return manifest.checks.map((c, i) => {
    if (!c || typeof c !== "object" || typeof c.label !== "string" || !c.label) {
      throw new Error(`verify.json checks[${i}] must be an object with a string "label" (got ${JSON.stringify(c)})`);
    }
    if (!verifyLabel.test(c.label)) {
      throw new Error(`verify.json checks[${i}].label "${c.label}" must start with "verify-" -- attest only ever collects verify-* checks, so any other label could never be satisfied`);
    }
    return c.label;
  });
}

function collectVerifyEvidence(root, spec) {
  const runtime = specRuntimePaths(root, spec);
  if (!existsSync(runtime.checks)) throw new Error("no verification checks have been recorded yet");
  const labels = readdirSync(runtime.checks)
    .filter((file) => file.endsWith(".status") && verifyLabel.test(file.slice(0, -".status".length)))
    .map((file) => file.slice(0, -".status".length))
    .sort();
  if (!labels.length) throw new Error("no verify-* checks found; run `run-check.mjs verify-<name> -- <cmd>` first");
  const required = loadRequiredLabels(root, spec);
  if (required) {
    const missing = required.filter((label) => !labels.includes(label));
    if (missing.length) throw new Error(`verify.json requires checks that haven't been run: ${missing.join(", ")}`);
  }
  const fingerprint = fingerprintWorktree(root);
  const checks = labels.map((label) => {
    const statusFile = join(runtime.checks, `${label}.status`);
    if (readFileSync(statusFile, "utf8").trim() !== "PASS") throw new Error(`check did not pass: ${label}`);
    const sidecar = join(runtime.checks, `${label}.json`);
    if (!existsSync(sidecar)) throw new Error(`check lacks evidence: ${label}`);
    let value;
    try { value = JSON.parse(readFileSync(sidecar, "utf8")); } catch { throw new Error(`check has malformed evidence: ${label}`); }
    if (value.spec !== spec || value.label !== label) throw new Error(`check evidence does not match this spec: ${label}`);
    if (value.kind === "machine") {
      if (value.pass !== true || value.worktreeChanged !== false || value.fingerprintBefore !== fingerprint || value.fingerprintAfter !== fingerprint) {
        throw new Error(`check does not prove the current worktree: ${label}`);
      }
    } else if (value.kind === "manual") {
      if (value.verdict !== "PASS" || value.fingerprint !== fingerprint) throw new Error(`manual check does not prove the current worktree: ${label}`);
    } else {
      throw new Error(`unknown check kind: ${label}`);
    }
    return { label, kind: value.kind };
  });
  return { fingerprint, checks };
}

// Trivial mode records companion evidence for a small change without an
// active spec. Evidence lives under .harness/state/trivial/, keyed only by
// worktree fingerprint, so check and attestation helpers work with no durable
// spec apparatus while still satisfying the optional ship policy.
function trivialPaths(root) {
  const dir = join(root, ".harness", "state", "trivial");
  return { checks: join(dir, "checks"), attestation: join(dir, "attestation.json"), attestationStatus: join(dir, "attestation.status") };
}

function collectTrivialVerifyEvidence(root) {
  const runtime = trivialPaths(root);
  if (!existsSync(runtime.checks)) throw new Error("no trivial verification checks have been recorded yet");
  const labels = readdirSync(runtime.checks)
    .filter((file) => file.endsWith(".status") && verifyLabel.test(file.slice(0, -".status".length)))
    .map((file) => file.slice(0, -".status".length))
    .sort();
  if (!labels.length) throw new Error("no verify-* checks found; run `run-check.mjs --trivial verify-<name> -- <cmd>` first");
  const fingerprint = fingerprintWorktree(root);
  const checks = labels.map((label) => {
    const statusFile = join(runtime.checks, `${label}.status`);
    if (readFileSync(statusFile, "utf8").trim() !== "PASS") throw new Error(`check did not pass: ${label}`);
    const sidecar = join(runtime.checks, `${label}.json`);
    if (!existsSync(sidecar)) throw new Error(`check lacks evidence: ${label}`);
    let value;
    try { value = JSON.parse(readFileSync(sidecar, "utf8")); } catch { throw new Error(`check has malformed evidence: ${label}`); }
    if (value.label !== label) throw new Error(`check evidence label mismatch: ${label}`);
    if (value.pass !== true || value.worktreeChanged !== false || value.fingerprintBefore !== fingerprint || value.fingerprintAfter !== fingerprint) {
      throw new Error(`check does not prove the current worktree: ${label}`);
    }
    return { label, kind: "machine" };
  });
  return { fingerprint, checks };
}

export function createTrivialAttestation(root = process.cwd()) {
  const collected = collectTrivialVerifyEvidence(root);
  const runtime = trivialPaths(root);
  const record = { trivial: true, createdAt: new Date().toISOString(), fingerprint: collected.fingerprint, checks: collected.checks };
  writeFileSync(runtime.attestation, `${JSON.stringify(record)}\n`);
  writeFileSync(runtime.attestationStatus, "PASS\n");
  return record;
}

export function validateTrivialAttestation(root = process.cwd()) {
  return explainTrivialAttestationValidity(root) === null;
}

export function explainTrivialAttestationValidity(root = process.cwd()) {
  const runtime = trivialPaths(root);
  if (!existsSync(runtime.attestation)) return "no trivial attestation has been recorded yet -- run attestation.mjs --trivial first";
  let record;
  try {
    record = JSON.parse(readFileSync(runtime.attestation, "utf8"));
  } catch {
    return "trivial attestation.json is malformed";
  }
  let collected;
  try {
    collected = collectTrivialVerifyEvidence(root);
  } catch (error) {
    return describeCollectionError(error, "trivial");
  }
  if (record.fingerprint !== collected.fingerprint) {
    return "the worktree has changed since this trivial attestation was created -- rerun run-check.mjs --trivial";
  }
  const createdAtMs = Date.parse(record.createdAt);
  if (Number.isNaN(createdAtMs)) return "trivial attestation.json has a missing or unparseable createdAt -- rerun attestation.mjs --trivial";
  const ageMs = Date.now() - createdAtMs;
  if (ageMs > maxAgeMs) {
    return `trivial attestation is ${Math.round(ageMs / (60 * 60 * 1000))}h old, older than the ${maxAgeMs / (60 * 60 * 1000)}h limit -- rerun run-check.mjs --trivial (clock expiry, not evidence anything is wrong)`;
  }
  if (JSON.stringify(record.checks) !== JSON.stringify(collected.checks)) {
    return "the set of recorded trivial checks has changed since this attestation was created -- rerun attestation.mjs --trivial";
  }
  return null;
}

export function createAttestation(root = process.cwd(), explicitSpec) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  const collected = collectVerifyEvidence(root, spec);
  const runtime = specRuntimePaths(root, spec);
  const record = { spec, createdAt: new Date().toISOString(), fingerprint: collected.fingerprint, checks: collected.checks };
  writeFileSync(runtime.attestation, `${JSON.stringify(record)}\n`);
  writeFileSync(runtime.attestationStatus, "PASS\n");
  return record;
}

export function validateAttestation(root = process.cwd(), explicitSpec) {
  return explainAttestationValidity(root, explicitSpec) === null;
}

// Same checks as validateAttestation, but returns WHY instead of a bare
// boolean -- printing only "INVALID" left an agent no
// way to tell "the worktree changed since I attested" apart from "the
// attestation is just stale by the clock," which call for different next
// steps (re-verify vs. nothing was actually wrong).
export function explainAttestationValidity(root = process.cwd(), explicitSpec) {
  let spec;
  try {
    spec = resolveSpecIdentity(root, explicitSpec);
  } catch (error) {
    return error.message;
  }
  const runtime = specRuntimePaths(root, spec);
  if (!existsSync(runtime.attestation)) return "no attestation has been recorded for this spec yet -- run attestation.mjs first";
  let record;
  try {
    record = JSON.parse(readFileSync(runtime.attestation, "utf8"));
  } catch {
    return "attestation.json is malformed";
  }
  let collected;
  try {
    collected = collectVerifyEvidence(root, spec);
  } catch (error) {
    return describeCollectionError(error, "spec");
  }
  if (record.spec !== spec) return "attestation belongs to a different spec";
  if (record.fingerprint !== collected.fingerprint) {
    return "the worktree has changed since this attestation was created -- rerun the required verification commands and record them with run-check.mjs";
  }
  const createdAtMs = Date.parse(record.createdAt);
  if (Number.isNaN(createdAtMs)) return "attestation.json has a missing or unparseable createdAt -- rerun attestation.mjs";
  const ageMs = Date.now() - createdAtMs;
  if (ageMs > maxAgeMs) {
    return `attestation is ${Math.round(ageMs / (60 * 60 * 1000))}h old, older than the ${maxAgeMs / (60 * 60 * 1000)}h limit -- the worktree hasn't changed, but rerun the required verification commands and record them with run-check.mjs since this is just a clock expiry, not evidence anything is actually wrong`;
  }
  if (JSON.stringify(record.checks) !== JSON.stringify(collected.checks)) {
    return "the set of recorded checks has changed since this attestation was created (a check was added, removed, or re-run under a different kind) -- rerun attestation.mjs";
  }
  return null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const trivialIndex = args.indexOf("--trivial");
  const trivial = trivialIndex !== -1;
  if (trivial) args.splice(trivialIndex, 1);
  const [action] = args;
  try {
    if (action === "attest" || !action) {
      const record = trivial ? createTrivialAttestation(process.cwd()) : createAttestation(process.cwd());
      console.log(trivial ? "attested (trivial)" : `attested ${record.spec}`);
      for (const check of record.checks) console.log(`  - ${check.label} (${check.kind})`);
      const manual = record.checks.filter((c) => c.kind === "manual");
      if (manual.length) console.log(`note: ${manual.length} check(s) are human-attested (--manual), not machine-run: ${manual.map((c) => c.label).join(", ")}`);
    } else if (action === "validate") {
      const reason = trivial ? explainTrivialAttestationValidity(process.cwd()) : explainAttestationValidity(process.cwd());
      console.log(reason === null ? "VALID" : "INVALID");
      if (reason !== null) {
        console.log(`reason: ${reason}`);
        process.exitCode = 1;
      }
    } else {
      throw new Error("usage: attestation.mjs [--trivial] [attest|validate]");
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
