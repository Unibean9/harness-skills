#!/usr/bin/env node
// One-command standard structure per agent: `hs setup --target <agent>`.
// Produces skills and subagents by default. Hooks are a companion plugin
// capability, so they are copied only after an explicit `--with-hooks` opt-in
// and only for providers with a shipped, confirmed adapter.
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
const HOOK_SCRIPT_DEPS = ["check-ship-ready.mjs", "attestation.mjs", "paths.mjs", "worktree.mjs", "next-skill.mjs"];

const CURSOR_RULE = `---
description: Harness Skills — spec-driven dev flow (hs-brainstorm -> hs-plan -> hs-build -> hs-verify -> hs-review -> hs-ship)
alwaysApply: true
---
Use the hs-* skills as proportionate guidance for nontrivial changes:
clarify intent, choose useful checks, report evidence and limits honestly,
and get approval before external actions.
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

function installHookCompanion(target, agentDir, root, log) {
  if (target === "claude") {
    copyHooksBundle(agentDir, log);
    writeIfMissing(join(agentDir, "settings.json"), claudeSettingsJson(), log, "hooks-wiring");
    copySettings(root, log);
    return;
  }
  if (target === "codex") {
    copyHooksBundle(agentDir, log);
    writeIfMissing(join(agentDir, "hooks.json"), rewrittenSnippet("hooks/codex/hooks.json.snippet", ".codex"), log, "hooks-wiring");
    copySettings(root, log);
    return;
  }
  if (target === "cursor") {
    copyHooksBundle(agentDir, log);
    writeIfMissing(join(agentDir, "hooks.json"), rewrittenSnippet("hooks/cursor/hooks.json.snippet", ".cursor"), log, "hooks-wiring");
    copySettings(root, log);
    log("note    -> companion coverage is partial: ship-gate + privacy-block only; session-state and monitoring have no Cursor adapter yet.");
    return;
  }
  log("hooks   -> unavailable: no confirmed Antigravity hook adapter is shipped; portable skills remain installed.");
}

const TARGETS = {
  claude: (root, log, options) => {
    const agentDir = join(root, ".claude");
    copySkills(agentDir, log);
    generateAgents({ target: "claude", outDir: join(agentDir, "agents") }).forEach((file) => log(`agent   -> ${file}`));
    if (options.withHooks) installHookCompanion("claude", agentDir, root, log);
    else log("hooks   -> skipped (optional companion; rerun with --with-hooks to install)");
  },
  codex: (root, log, options) => {
    const agentDir = join(root, ".codex");
    copySkills(agentDir, log);
    generateAgents({ target: "codex", outDir: join(agentDir, "agents") }).forEach((file) => log(`agent   -> ${file}`));
    if (options.withHooks) installHookCompanion("codex", agentDir, root, log);
    else log("hooks   -> skipped (optional companion; rerun with --with-hooks to install)");
  },
  cursor: (root, log, options) => {
    const agentDir = join(root, ".cursor");
    copySkills(agentDir, log);
    generateAgents({ target: "cursor", outDir: join(agentDir, "agents") }).forEach((file) => log(`agent   -> ${file}`));
    mkdirSync(join(agentDir, "rules"), { recursive: true });
    writeIfMissing(join(agentDir, "rules", "harness-skills.mdc"), CURSOR_RULE, log, "rule");
    if (options.withHooks) installHookCompanion("cursor", agentDir, root, log);
    else log("hooks   -> skipped (optional companion; rerun with --with-hooks to install)");
  },
  antigravity: (root, log, options) => {
    const agentDir = join(root, ".agents");
    copySkills(agentDir, log);
    generateAgents({ target: "antigravity", outDir: join(agentDir, "agents") }).forEach((file) => log(`agent   -> ${file}`));
    if (options.withHooks) installHookCompanion("antigravity", agentDir, root, log);
    else log("hooks   -> unavailable: no confirmed Antigravity hook adapter is shipped.");
    log("note    -> TIER 2 (experimental): '.agents/skills' + '.agents/agents' match the confirmed mid-2026 Antigravity CLI convention; portable skills and subagents are installed without hooks.");
  },
};

export function setupAgent(target, root = process.cwd(), { withHooks = false } = {}) {
  const run = TARGETS[target];
  if (!run) throw new Error(`unknown setup target: ${target} (expected ${Object.keys(TARGETS).join("|")})`);
  const lines = [];
  run(root, (line) => lines.push(line), { withHooks });
  return lines;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf("--target");
  try {
    const target = targetIndex !== -1 ? args[targetIndex + 1] : null;
    if (!target) throw new Error("usage: setup.mjs --target <claude|codex|cursor|antigravity> [--with-hooks]");
    for (const line of setupAgent(target, process.cwd(), { withHooks: args.includes("--with-hooks") })) console.log(line);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
