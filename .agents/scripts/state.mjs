#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const identityPattern = /^\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function paths(root) {
  const state = join(root, ".harness", "state");
  return { specs: join(root, ".harness", "specs"), state, current: join(state, "current-spec"), lock: join(state, ".active-spec.lock") };
}

export function reserveSpec(slug, root = process.cwd()) {
  if (!slugPattern.test(slug)) throw new Error("spec slug must be kebab-case");
  const { specs } = paths(root);
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
  if (!identityPattern.test(identity)) throw new Error("invalid spec identity");
  const { specs, state, current, lock } = paths(root);
  if (!existsSync(join(specs, identity))) throw new Error(`reserved spec does not exist: ${identity}`);
  mkdirSync(state, { recursive: true });
  try {
    mkdirSync(lock);
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
    rmSync(lock, { recursive: true, force: true });
  }
}

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
