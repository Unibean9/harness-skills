import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSpecIdentity, specRuntimePaths } from "./paths.mjs";
import { fingerprintWorktree } from "./worktree.mjs";

const maxAgeMs = 24 * 60 * 60 * 1000;
const verifyLabel = /^verify-.+/;

function collectVerifyEvidence(root, spec) {
  const runtime = specRuntimePaths(root, spec);
  if (!existsSync(runtime.checks)) throw new Error("no verification checks have been recorded yet");
  const labels = readdirSync(runtime.checks)
    .filter((file) => file.endsWith(".status") && verifyLabel.test(file.slice(0, -".status".length)))
    .map((file) => file.slice(0, -".status".length))
    .sort();
  if (!labels.length) throw new Error("no verify-* checks found; run `hs check verify-<name> -- <cmd>` first");
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
  try {
    const spec = resolveSpecIdentity(root, explicitSpec);
    const runtime = specRuntimePaths(root, spec);
    if (!existsSync(runtime.attestation)) return false;
    const record = JSON.parse(readFileSync(runtime.attestation, "utf8"));
    const collected = collectVerifyEvidence(root, spec);
    if (record.spec !== spec || record.fingerprint !== collected.fingerprint) return false;
    if (Date.now() - Date.parse(record.createdAt) > maxAgeMs) return false;
    return JSON.stringify(record.checks) === JSON.stringify(collected.checks);
  } catch {
    return false;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [action] = process.argv.slice(2);
  try {
    if (action === "attest" || !action) {
      console.log(`attested ${createAttestation(process.cwd()).spec}`);
    } else if (action === "validate") {
      const ok = validateAttestation(process.cwd());
      console.log(ok ? "VALID" : "INVALID");
      if (!ok) process.exitCode = 1;
    } else {
      throw new Error("usage: attestation.mjs [attest|validate]");
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
