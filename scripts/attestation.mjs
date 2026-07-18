import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCheckStateDir } from "./state.mjs";
import { fingerprintWorktree } from "./worktree.mjs";
import { loadVerifyManifest } from "./verify-manifest.mjs";

const maxAgeMs = 24 * 60 * 60 * 1000;
const SCHEMA_VERSION = 3;
const statePath = (root) => join(root, ".harness", "state");
const activeSpec = (root) => readFileSync(join(statePath(root), "current-spec"), "utf8").trim();
const sameArgv = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]);
const sameChecks = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((check, index) => check.label === right[index].label && check.kind === right[index].kind && sameArgv(check.argv, right[index].argv));

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

export function createAttestation(root = process.cwd()) {
  const spec = activeSpec(root);
  const checks = loadVerifyManifest(root, spec);
  evidenceChecks(root, spec, checks);
  const record = { version: SCHEMA_VERSION, spec, createdAt: new Date().toISOString(), fingerprint: fingerprintWorktree(root), checks };
  writeFileSync(join(statePath(root), "verify-all.json"), `${JSON.stringify(record)}\n`);
  writeFileSync(join(statePath(root), "verify-all.status"), "PASS\n");
  return record;
}

export function validateAttestation(root = process.cwd()) {
  try {
    const spec = activeSpec(root);
    const value = JSON.parse(readFileSync(join(statePath(root), "verify-all.json"), "utf8"));
    if (value.version !== SCHEMA_VERSION || value.spec !== spec || !sameChecks(value.checks, loadVerifyManifest(root, spec))) return false;
    if (Date.now() - Date.parse(value.createdAt) > maxAgeMs) return false;
    return value.fingerprint === fingerprintWorktree(root);
  } catch { return false; }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [action, ...labels] = process.argv.slice(2);
  try {
    if (action === "attest" && !labels.length) {
      const record = createAttestation(process.cwd());
      const manual = record.checks.filter((check) => check.kind === "manual").map((check) => check.label);
      console.log(`attested ${record.spec}: ${record.checks.map((check) => check.label).join(", ")}${manual.length ? ` (manual: ${manual.join(", ")})` : ""}`);
    } else if (action === "validate") {
      const ok = validateAttestation(process.cwd());
      console.log(ok ? "VALID" : "INVALID");
      if (!ok) process.exitCode = 1;
    } else {
      throw new Error("usage: attestation.mjs attest | validate");
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
