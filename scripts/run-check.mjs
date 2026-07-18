#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { resolveCheckStateDir } from "./state.mjs";
import { fingerprintWorktree } from "./worktree.mjs";

const [label, separator, ...command] = process.argv.slice(2);
if (!label || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(label) || separator !== "--" || !command.length) {
  console.error("usage: node scripts/run-check.mjs <label> -- <command...>");
  process.exit(2);
}
const root = process.cwd();
const current = join(root, ".harness", "state", "current-spec");
const spec = existsSync(current) ? readFileSync(current, "utf8").trim() : null;
const state = resolveCheckStateDir(root);
mkdirSync(state, { recursive: true });
const startedAt = new Date().toISOString();
let fingerprintBefore = null;
let fingerprintAfter = null;
let fingerprintError = null;
if (spec) {
  try {
    fingerprintBefore = fingerprintWorktree(root);
  } catch (error) {
    fingerprintError = error.message;
  }
}

let executable = command[0];
let arguments_ = command.slice(1);
if (process.platform === "win32" && command[0] === "npm") {
  const npmCli = join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  if (existsSync(npmCli)) {
    executable = process.execPath;
    arguments_ = [npmCli, ...arguments_];
  }
}
const result = spawnSync(executable, arguments_, { encoding: "utf8", shell: false });

if (spec && !fingerprintError) {
  try {
    fingerprintAfter = fingerprintWorktree(root);
  } catch (error) {
    fingerprintError = error.message;
  }
}
const output = `${result.stdout || ""}${result.stderr || ""}`;
const worktreeChanged = spec ? fingerprintBefore !== fingerprintAfter : false;
const pass = !result.error && result.status === 0 && !fingerprintError && !worktreeChanged;
const finishedAt = new Date().toISOString();
writeFileSync(join(state, `${label}.log`), output);
writeFileSync(join(state, `${label}.status`), pass ? "PASS\n" : "FAIL\n");
writeFileSync(join(state, `${label}.json`), `${JSON.stringify({ version: 1, spec, label, argv: command, exitCode: result.status ?? null, pass, startedAt, finishedAt, fingerprintBefore, fingerprintAfter, worktreeChanged, fingerprintError })}\n`);
process.stdout.write(`---- ${label} (${pass ? "PASS" : "FAIL"}) ----\n${output.split("\n").slice(-40).join("\n")}\n`);
process.exit(pass ? 0 : result.status || 1);
