#!/usr/bin/env node
// Answers "did this install correctly?" without the user having to run a
// phase and hit the failure mid-task. Checks are informational (WARN) unless
// something would actually break a skill's exit condition (FAIL).
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateSkills } from "./validate-skills.mjs";

const packageRoot = resolve(join(fileURLToPath(import.meta.url), "..", ".."));

function check(label, fn) {
  try {
    const result = fn();
    return { label, status: result === false ? "FAIL" : result === null ? "WARN" : "OK", detail: typeof result === "string" ? result : null };
  } catch (error) {
    return { label, status: "FAIL", detail: error.message };
  }
}

export function runDoctor(root = process.cwd()) {
  const checks = [];

  checks.push(check("Node.js >= 22", () => {
    const major = Number(process.version.slice(1).split(".")[0]);
    return major >= 22 ? `running ${process.version}` : false;
  }));

  checks.push(check("skills/ well-formed", () => {
    validateSkills(packageRoot);
    return "all skills pass validate-skills";
  }));

  checks.push(check(".harness/ scaffold", () => {
    const specs = join(root, ".harness", "specs");
    const state = join(root, ".harness", "state");
    if (!existsSync(specs) || !existsSync(state)) return null;
    return "specs/ and state/ present";
  }));

  checks.push(check("hs.settings.json", () => {
    const file = join(root, "hs.settings.json");
    if (!existsSync(file)) return null;
    const settings = JSON.parse(readFileSync(file, "utf8"));
    const enabled = Object.entries(settings).filter(([, value]) => value?.enabled).map(([key]) => key);
    return enabled.length ? `hooks enabled: ${enabled.join(", ")}` : "present, no hooks enabled";
  }));

  checks.push(check(".gitignore excludes .harness/state/", () => {
    const file = join(root, ".gitignore");
    if (!existsSync(file)) return null;
    return readFileSync(file, "utf8").split("\n").some((line) => line.trim() === ".harness/state/") ? "excluded" : null;
  }));

  // Claude Code checks .claude/agents/ first (the convention `hs agents
  // --target claude` writes to in a consumer project) and falls back to
  // agents/ at the project root (this repo's own bundled dev-mode copy) --
  // either one means the subagents are actually wired.
  const subagentLocations = {
    "Claude Code": { dirs: [".claude/agents", "agents"], files: ["hs-scout.md", "hs-reviewer.md"] },
    "Codex CLI": { dirs: [".codex/agents"], files: ["hs-scout.toml", "hs-reviewer.toml"] },
    "Cursor (tier 2)": { dirs: [".cursor/agents"], files: ["hs-scout.md", "hs-reviewer.md"] },
    "Antigravity CLI (tier 2)": { dirs: [".agents/agents"], files: ["hs-scout.md", "hs-reviewer.md"] },
  };
  for (const [agent, { dirs, files }] of Object.entries(subagentLocations)) {
    checks.push(check(`${agent} subagents`, () => {
      for (const dir of dirs) {
        const present = files.filter((name) => existsSync(join(root, dir, name)));
        if (present.length === files.length) return `hs-scout + hs-reviewer present (${dir}/)`;
      }
      const partial = dirs.flatMap((dir) => files.filter((name) => existsSync(join(root, dir, name))).map((name) => `${dir}/${name}`));
      return partial.length ? `partial: ${partial.join(", ")}` : null;
    }));
  }

  return checks;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const checks = runDoctor(process.cwd());
  for (const { label, status, detail } of checks) {
    console.log(`[${status}] ${label}${detail ? ` -- ${detail}` : ""}`);
  }
  process.exitCode = checks.some((entry) => entry.status === "FAIL") ? 1 : 0;
}
