#!/usr/bin/env node
// One-command standard structure per agent: `hs setup --target <agent>`.
// Produces a self-contained config tree (skills + subagents + hooks where the
// agent's hook schema is actually supported) inside the agent's own dot-dir,
// so a new user gets the exact per-agent convention without hand-copying
// files or reading four setup docs first.
//
// Hooks are copied together with the runtime scripts they import
// (ship-gate -> check-ship-ready -> attestation -> paths/worktree), preserving
// the hooks/../scripts/ relative layout -- copying hooks alone would break
// those imports.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateAgents } from "./generate-agents.mjs";

const packageRoot = resolve(join(fileURLToPath(import.meta.url), "..", ".."));

const HOOK_FILES = ["privacy-block.mjs", "ship-gate.mjs", "session-state.mjs", "monitoring.mjs"];
const HOOK_SCRIPT_DEPS = ["check-ship-ready.mjs", "attestation.mjs", "paths.mjs", "worktree.mjs", "run-check.mjs", "next-skill.mjs", "bookkeeping.mjs"];

const CURSOR_RULE = `---
description: Harness Skills — spec-driven dev flow (hs-brainstorm -> hs-plan -> hs-build -> hs-verify -> hs-review -> hs-ship)
alwaysApply: true
---
Follow AGENTS.md and the hs-* skills for any nontrivial change: spec first,
small verifiable tasks, real verify evidence before "done", human approval
before shipping.
`;

function copySkills(agentDir, log) {
  const source = join(packageRoot, "skills");
  const target = join(agentDir, "skills");
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("hs-")) continue;
    cpSync(join(source, entry.name), join(target, entry.name), { recursive: true });
  }
  log(`skills  -> ${target}`);
}

function copyHooksBundle(agentDir, log) {
  const hooksDir = join(agentDir, "hooks");
  mkdirSync(join(hooksDir, "lib"), { recursive: true });
  for (const file of HOOK_FILES) cpSync(join(packageRoot, "hooks", file), join(hooksDir, file));
  cpSync(join(packageRoot, "hooks", "lib", "common.mjs"), join(hooksDir, "lib", "common.mjs"));
  const scriptsDir = join(agentDir, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  for (const file of HOOK_SCRIPT_DEPS) cpSync(join(packageRoot, "scripts", file), join(scriptsDir, file));
  log(`hooks   -> ${hooksDir} (+ ${agentDir}/scripts for their imports)`);
}

function writeIfMissing(file, content, log, label) {
  if (existsSync(file)) {
    log(`skip    -> ${file} already exists; merge ${label} manually if needed`);
    return;
  }
  writeFileSync(file, content);
  log(`${label} -> ${file}`);
}

function copySettings(root, log) {
  const target = join(root, "hs.settings.json");
  if (!existsSync(target)) {
    cpSync(join(packageRoot, "hs.settings.json"), target);
    log(`config  -> ${target}`);
  }
}

function claudeSettingsJson() {
  const hook = (name) => ({ type: "command", command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${name}"` });
  return `${JSON.stringify({
    hooks: {
      SessionStart: [{ hooks: [hook("session-state.mjs")] }],
      PreToolUse: [
        { matcher: "Read|Write|Edit|Bash", hooks: [hook("privacy-block.mjs")] },
        { matcher: "Bash", hooks: [hook("ship-gate.mjs")] },
      ],
      PostToolUse: [{ matcher: ".*", hooks: [hook("monitoring.mjs")] }],
    },
  }, null, 2)}\n`;
}

function rewrittenSnippet(snippetPath, agentDirName) {
  return readFileSync(join(packageRoot, snippetPath), "utf8")
    .replaceAll("/hooks/", `/${agentDirName}/hooks/`)
    .replaceAll("\\\\hooks\\\\", `\\\\${agentDirName}\\\\hooks\\\\`);
}

const TARGETS = {
  claude: (root, log) => {
    const agentDir = join(root, ".claude");
    copySkills(agentDir, log);
    generateAgents({ target: "claude", outDir: join(agentDir, "agents") }).forEach((file) => log(`agent   -> ${file}`));
    copyHooksBundle(agentDir, log);
    writeIfMissing(join(agentDir, "settings.json"), claudeSettingsJson(), log, "hooks-wiring");
    copySettings(root, log);
  },
  codex: (root, log) => {
    const agentDir = join(root, ".codex");
    copySkills(agentDir, log);
    generateAgents({ target: "codex", outDir: join(agentDir, "agents") }).forEach((file) => log(`agent   -> ${file}`));
    copyHooksBundle(agentDir, log);
    writeIfMissing(join(agentDir, "hooks.json"), rewrittenSnippet("hooks/codex/hooks.json.snippet", ".codex"), log, "hooks-wiring");
    copySettings(root, log);
  },
  cursor: (root, log) => {
    const agentDir = join(root, ".cursor");
    copySkills(agentDir, log);
    generateAgents({ target: "cursor", outDir: join(agentDir, "agents") }).forEach((file) => log(`agent   -> ${file}`));
    mkdirSync(join(agentDir, "rules"), { recursive: true });
    writeIfMissing(join(agentDir, "rules", "harness-skills.mdc"), CURSOR_RULE, log, "rule");
    copyHooksBundle(agentDir, log);
    writeIfMissing(join(agentDir, "hooks.json"), rewrittenSnippet("hooks/cursor/hooks.json.snippet", ".cursor"), log, "hooks-wiring");
    copySettings(root, log);
    log("note    -> TIER 2 (partial): ship-gate + privacy-block ARE wired (beforeShellExecution/beforeReadFile) -- session-state and monitoring are NOT (their Cursor event/output shape isn't adapted yet, see docs/cursor-setup.md).");
  },
  antigravity: (root, log) => {
    const agentDir = join(root, ".agents");
    copySkills(agentDir, log);
    generateAgents({ target: "antigravity", outDir: join(agentDir, "agents") }).forEach((file) => log(`agent   -> ${file}`));
    copySettings(root, log);
    log("note    -> TIER 2 (experimental): '.agents/skills' + '.agents/agents' match the confirmed mid-2026 Antigravity CLI convention (see docs/antigravity-setup.md for sources); this repo's root AGENTS.md is natively read by Antigravity CLI v1.20.3+ already. Hooks not wired: no confirmed Antigravity hook config path exists yet.");
  },
};

export function setupAgent(target, root = process.cwd()) {
  const run = TARGETS[target];
  if (!run) throw new Error(`unknown setup target: ${target} (expected ${Object.keys(TARGETS).join("|")})`);
  const lines = [];
  run(root, (line) => lines.push(line));
  return lines;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf("--target");
  try {
    const target = targetIndex !== -1 ? args[targetIndex + 1] : null;
    if (!target) throw new Error("usage: setup.mjs --target <claude|codex|cursor|antigravity>");
    for (const line of setupAgent(target, process.cwd())) console.log(line);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
