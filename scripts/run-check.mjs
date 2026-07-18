#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSpecIdentity, specRuntimePaths } from "./paths.mjs";
import { fingerprintWorktree } from "./worktree.mjs";

const labelPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export function runCheck(root = process.cwd(), explicitSpec, label, argv) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  if (!labelPattern.test(label || "")) throw new Error("label must be a kebab-case string");
  if (!Array.isArray(argv) || !argv.length) throw new Error("a command to run is required after --");
  const runtime = specRuntimePaths(root, spec);
  mkdirSync(runtime.checks, { recursive: true });
  const startedAt = new Date().toISOString();
  const fingerprintBefore = fingerprintWorktree(root);
  const result = execute(argv, root);
  const fingerprintAfter = fingerprintWorktree(root);
  const finishedAt = new Date().toISOString();
  const worktreeChanged = fingerprintBefore !== fingerprintAfter;
  const pass = !result.error && result.status === 0 && !worktreeChanged;
  const evidence = {
    spec, label, kind: "machine", argv, startedAt, finishedAt, fingerprintBefore, fingerprintAfter,
    exitCode: result.status ?? null, pass, worktreeChanged, error: result.error?.message || null,
  };
  const base = join(runtime.checks, label);
  writeFileSync(`${base}.log`, `${result.stdout || ""}${result.stderr || ""}`);
  writeFileSync(`${base}.json`, `${JSON.stringify(evidence)}\n`);
  writeFileSync(`${base}.status`, pass ? "PASS\n" : "FAIL\n");
  return evidence;
}

// The companion runtime can record evidence for a small change without an
// active spec. Evidence lives under .harness/state/trivial/.
export function runTrivialCheck(root = process.cwd(), label, argv) {
  if (!labelPattern.test(label || "")) throw new Error("label must be a kebab-case string");
  if (!Array.isArray(argv) || !argv.length) throw new Error("a command to run is required after --");
  const checksDir = join(root, ".harness", "state", "trivial", "checks");
  mkdirSync(checksDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const fingerprintBefore = fingerprintWorktree(root);
  const result = execute(argv, root);
  const fingerprintAfter = fingerprintWorktree(root);
  const finishedAt = new Date().toISOString();
  const worktreeChanged = fingerprintBefore !== fingerprintAfter;
  const pass = !result.error && result.status === 0 && !worktreeChanged;
  const evidence = {
    label, kind: "machine", argv, startedAt, finishedAt, fingerprintBefore, fingerprintAfter,
    exitCode: result.status ?? null, pass, worktreeChanged, error: result.error?.message || null,
  };
  const base = join(checksDir, label);
  writeFileSync(`${base}.log`, `${result.stdout || ""}${result.stderr || ""}`);
  writeFileSync(`${base}.json`, `${JSON.stringify(evidence)}\n`);
  writeFileSync(`${base}.status`, pass ? "PASS\n" : "FAIL\n");
  return evidence;
}

export function runManualCheck(root = process.cwd(), explicitSpec, label, verdict, note) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  if (!labelPattern.test(label || "")) throw new Error("label must be a kebab-case string");
  if (verdict !== "PASS" && verdict !== "FAIL") throw new Error("manual verdict must be PASS or FAIL");
  if (!note || !note.trim()) throw new Error("a --note explaining the manual verdict is required");
  const runtime = specRuntimePaths(root, spec);
  mkdirSync(runtime.checks, { recursive: true });
  const evidence = {
    spec, label, kind: "manual", verdict, note: note.trim(),
    confirmedAt: new Date().toISOString(), fingerprint: fingerprintWorktree(root),
  };
  const base = join(runtime.checks, label);
  writeFileSync(`${base}.json`, `${JSON.stringify(evidence)}\n`);
  writeFileSync(`${base}.status`, `${verdict}\n`);
  return evidence;
}

// A check can FAIL for two very different reasons: the command itself
// exited non-zero (a real bug), or the command exited 0 but left the
// worktree different than before it ran (an untracked side-effect file --
// a coverage report, a build cache -- not gitignored). Both print the same
// bare "FAIL" otherwise, and the second one is easy to mistake for the first.
function explainFailure(evidence) {
  if (evidence.pass || !evidence.worktreeChanged) return;
  console.error(
    `note: exit code was ${evidence.exitCode}, but the worktree changed during the run -- ` +
    "this command has a side effect (wrote a file git doesn't already ignore). " +
    "Either gitignore that output or make the command not write it; a verify command must leave the worktree exactly as it found it."
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  try {
    if (args[0] === "--manual") {
      const [, label, verdict, noteFlag, ...noteParts] = args;
      if (!label || !verdict || noteFlag !== "--note" || !noteParts.length) {
        throw new Error("usage: run-check.mjs --manual <label> <PASS|FAIL> --note \"<reason>\"");
      }
      const evidence = runManualCheck(process.cwd(), null, label, verdict, noteParts.join(" "));
      console.log(`---- ${label} (${evidence.verdict}) [manual] ----`);
      if (evidence.verdict !== "PASS") process.exitCode = 1;
    } else if (args[0] === "--trivial") {
      const [, label, separator, ...command] = args;
      if (!label || separator !== "--" || !command.length) {
        throw new Error("usage: run-check.mjs --trivial <label> -- <command...>");
      }
      const evidence = runTrivialCheck(process.cwd(), label, command);
      process.stdout.write(`---- ${label} (${evidence.pass ? "PASS" : "FAIL"}) [trivial] ----\n`);
      explainFailure(evidence);
      if (!evidence.pass) process.exitCode = evidence.exitCode || 1;
    } else {
      const [label, separator, ...command] = args;
      if (!label || separator !== "--" || !command.length) {
        throw new Error("usage: run-check.mjs <label> -- <command...>");
      }
      const evidence = runCheck(process.cwd(), null, label, command);
      process.stdout.write(`---- ${label} (${evidence.pass ? "PASS" : "FAIL"}) ----\n`);
      explainFailure(evidence);
      if (!evidence.pass) process.exitCode = evidence.exitCode || 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
