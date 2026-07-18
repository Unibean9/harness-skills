#!/usr/bin/env node
// Scaffolds the .harness/ layout in a project that just installed this
// package, and wires .harness/state/ into .gitignore -- that directory is
// per-worktree runtime evidence (check logs, attestations), not durable
// history, so committing it is meaningless noise at best and a stale-PASS
// trap at worst.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(join(fileURLToPath(import.meta.url), "..", ".."));

const INDEX_TEMPLATE = ["# Spec Index", "", "| ID | Slug | Phase | Updated |", "|---|---|---|---|", ""].join("\n");

function ensureDir(path) {
  if (!existsSync(path)) { mkdirSync(path, { recursive: true }); return `created ${path}`; }
  return null;
}

function ensureFile(path, content) {
  if (!existsSync(path)) { writeFileSync(path, content); return `created ${path}`; }
  return null;
}

function ensureGitignoreEntry(root, entry) {
  const file = join(root, ".gitignore");
  const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (existing.split("\n").map((line) => line.trim()).includes(entry)) return null;
  const next = existing && !existing.endsWith("\n") ? `${existing}\n${entry}\n` : `${existing}${entry}\n`;
  writeFileSync(file, next);
  return `added '${entry}' to .gitignore`;
}

export function initHarness(root = process.cwd()) {
  const actions = [];
  const harness = join(root, ".harness");
  const specs = join(harness, "specs");
  const state = join(harness, "state");
  for (const message of [ensureDir(specs), ensureDir(state), ensureFile(join(specs, "INDEX.md"), INDEX_TEMPLATE)]) {
    if (message) actions.push(message);
  }
  const defaultSettings = join(packageRoot, "hs.settings.json");
  if (existsSync(defaultSettings)) {
    const message = ensureFile(join(root, "hs.settings.json"), readFileSync(defaultSettings, "utf8"));
    if (message) actions.push(message);
  }
  const gitignoreMessage = ensureGitignoreEntry(root, ".harness/state/");
  if (gitignoreMessage) actions.push(gitignoreMessage);
  return actions;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const actions = initHarness(process.cwd());
  if (!actions.length) console.log("already initialized -- nothing to do");
  else actions.forEach((line) => console.log(line));
}
