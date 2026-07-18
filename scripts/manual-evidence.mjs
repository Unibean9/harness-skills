#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { checksForStage, loadVerifyManifestV2, manifestDigest } from "./verify-manifest.mjs";
import { specRuntimePaths } from "./paths.mjs";
import { fingerprintWorktree } from "./worktree.mjs";

const labelPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validTimestamp = (value) => Number.isFinite(Date.parse(value)) && Math.abs(Date.now() - Date.parse(value)) <= 5 * 60 * 1000;

export function recordManualEvidence(root = process.cwd(), { spec, stage, label, confirmedBy, reference, confirmedAt = new Date().toISOString() } = {}) {
  if (!spec || !stage || !labelPattern.test(label || "") || typeof confirmedBy !== "string" || !confirmedBy.trim() || typeof reference !== "string" || !reference.trim()) {
    throw new Error("spec, stage, label, confirmed-by, and confirmation reference are required");
  }
  if (!validTimestamp(confirmedAt)) throw new Error("manual confirmation timestamp must be within five minutes of the current time");
  const manifest = loadVerifyManifestV2(root, spec);
  const check = checksForStage(manifest, stage).find((candidate) => candidate.label === label);
  if (!check || check.kind !== "manual") throw new Error("label must name a manual check declared for this manifest stage");
  const runtime = specRuntimePaths(root, spec);
  mkdirSync(runtime.checks, { recursive: true });
  const evidence = {
    version: 2, spec, stage, label, kind: "manual", argv: null, covers: check.covers,
    manifestDigest: manifestDigest(manifest), fingerprint: fingerprintWorktree(root), confirmedAt,
    confirmedBy: confirmedBy.trim(), reference: reference.trim(), verdict: "PASS",
  };
  const base = join(runtime.checks, `${stage}-${label}`);
  writeFileSync(`${base}.json`, `${JSON.stringify(evidence)}\n`);
  writeFileSync(`${base}.status`, "PASS\n");
  return evidence;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [specFlag, spec, stageFlag, stage, labelFlag, label, byFlag, confirmedBy, referenceFlag, reference] = process.argv.slice(2);
  try {
    if (specFlag !== "--spec" || stageFlag !== "--stage" || labelFlag !== "--label" || byFlag !== "--confirmed-by" || referenceFlag !== "--reference" || process.argv.length !== 12) {
      throw new Error("usage: manual-evidence.mjs --spec <id> --stage <baseline|final> --label <label> --confirmed-by <name> --reference <reference>");
    }
    recordManualEvidence(process.cwd(), { spec, stage, label, confirmedBy, reference });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
