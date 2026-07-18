#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { detectLegacySpecState, detectSpecVersion, harnessPaths, readActiveSpec, resolveSpecIdentity, specPaths, specRuntimePaths, validateSpecId } from "./paths.mjs";
export { initializeWorkflow, loadWorkflow, transitionWorkflow, validateWorkflow, workflowRoute } from "./workflow-state.mjs";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Per-check logs (baseline, task-N, verify-*) live under the active spec's own
// v1 state directory until its callers migrate in Task 5. New v2 callers must
// pass an explicit spec to resolveSpecRuntimeDir instead of using selection as
// an execution identity.
export function resolveCheckStateDir(root = process.cwd()) {
  const { state } = harnessPaths(root);
  const active = readActiveSpec(root);
  if (!active) return state;
  return harnessPaths(root, active).legacySpecStateDir;
}

export function resolveSpecRuntimeDir(root = process.cwd(), explicitSpec) {
  return specRuntimePaths(root, explicitSpec).dir;
}

export function reserveSpec(slug, root = process.cwd()) {
  if (!slugPattern.test(slug)) throw new Error("spec slug must be kebab-case");
  const { specs } = harnessPaths(root);
  mkdirSync(specs, { recursive: true });
  for (;;) {
    const max = readdirSync(specs, { withFileTypes: true }).filter((entry) => entry.isDirectory()).reduce((value, entry) => Math.max(value, Number(/^\d+/.exec(entry.name)?.[0] || 0)), 0);
    const identity = `${String(max + 1).padStart(3, "0")}-${slug}`;
    try {
      mkdirSync(join(specs, identity));
      return identity;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }
}

export function selectActiveSpec(identity, root = process.cwd(), { replace = false } = {}) {
  validateSpecId(identity);
  const { specs, state, current, selectionLock } = harnessPaths(root);
  if (!existsSync(join(specs, identity))) throw new Error(`reserved spec does not exist: ${identity}`);
  mkdirSync(state, { recursive: true });
  try {
    mkdirSync(selectionLock);
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("active spec selection is already in progress");
    throw error;
  }
  try {
    const selected = existsSync(current) ? readFileSync(current, "utf8").trim() : "";
    if (selected && selected !== identity && !replace) throw new Error(`active spec is already ${selected}; use an explicit replace selection`);
    const temporary = `${current}.${process.pid}.tmp`;
    writeFileSync(temporary, `${identity}\n`);
    renameSync(temporary, current);
  } finally {
    rmSync(selectionLock, { recursive: true, force: true });
  }
}

export { detectLegacySpecState, detectSpecVersion, harnessPaths, readActiveSpec, resolveSpecIdentity, specPaths, specRuntimePaths, validateSpecId };

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [action, value, option] = process.argv.slice(2);
  try {
    if (action === "reserve" && value && !option) console.log(reserveSpec(value));
    else if (action === "select" && value && (!option || option === "--replace")) selectActiveSpec(value, process.cwd(), { replace: option === "--replace" });
    else throw new Error("usage: state.mjs reserve <kebab-slug> | select <id-slug> [--replace]");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
