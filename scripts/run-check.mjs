#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { manifestDigest, checksForStage, loadVerifyManifestV2 } from "./verify-manifest.mjs";
import { specRuntimePaths } from "./paths.mjs";
import { fingerprintWorktree } from "./worktree.mjs";

const labelPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const timestampValid = (value) => Number.isFinite(Date.parse(value)) && Math.abs(Date.now() - Date.parse(value)) <= 5 * 60 * 1000;

function execute(argv, root) {
  let executable = argv[0];
  let arguments_ = argv.slice(1);
  if (process.platform === "win32" && argv[0] === "npm") {
    const npmCli = join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
    if (existsSync(npmCli)) {
      executable = process.execPath;
      arguments_ = [npmCli, ...arguments_];
    }
  }
  return spawnSync(executable, arguments_, { cwd: root, encoding: "utf8", shell: false });
}

export function runCheck(root = process.cwd(), { spec, stage, label } = {}) {
  if (!spec || !stage || !labelPattern.test(label || "")) throw new Error("spec, stage, and kebab-case label are required");
  const manifest = loadVerifyManifestV2(root, spec);
  const check = checksForStage(manifest, stage).find((candidate) => candidate.label === label);
  if (!check || check.kind !== "machine") throw new Error("label must name a machine check declared for this manifest stage");
  const runtime = specRuntimePaths(root, spec);
  mkdirSync(runtime.checks, { recursive: true });
  const startedAt = new Date().toISOString();
  const fingerprintBefore = fingerprintWorktree(root);
  const result = execute(check.argv, root);
  const fingerprintAfter = fingerprintWorktree(root);
  const finishedAt = new Date().toISOString();
  const worktreeChanged = fingerprintBefore !== fingerprintAfter;
  const pass = !result.error && result.status === 0 && !worktreeChanged && timestampValid(startedAt) && timestampValid(finishedAt);
  const evidence = {
    version: 2, spec, stage, label: check.label, kind: check.kind, argv: check.argv, covers: check.covers,
    manifestDigest: manifestDigest(manifest), startedAt, finishedAt, fingerprintBefore, fingerprintAfter,
    exitCode: result.status ?? null, pass, worktreeChanged, error: result.error?.message || null,
  };
  const base = join(runtime.checks, `${stage}-${label}`);
  writeFileSync(`${base}.log`, `${result.stdout || ""}${result.stderr || ""}`);
  writeFileSync(`${base}.json`, `${JSON.stringify(evidence)}\n`);
  writeFileSync(`${base}.status`, pass ? "PASS\n" : "FAIL\n");
  return evidence;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [specFlag, spec, stageFlag, stage, labelFlag, label] = process.argv.slice(2);
  try {
    if (specFlag !== "--spec" || stageFlag !== "--stage" || labelFlag !== "--label" || process.argv.length !== 8) {
      throw new Error("usage: run-check.mjs --spec <id> --stage <baseline|final> --label <label>");
    }
    const evidence = runCheck(process.cwd(), { spec, stage, label });
    process.stdout.write(`---- ${label} (${evidence.pass ? "PASS" : "FAIL"}) ----\n`);
    if (!evidence.pass) process.exitCode = evidence.exitCode || 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
