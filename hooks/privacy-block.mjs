#!/usr/bin/env node
// PreToolUse hook: enforces hs.settings.json's "privacyBlock" guardrail.
// Blocks a tool call that reads or references a path matching denyList,
// unless that path also matches allowList. Config-driven -- change what's
// blocked by editing hs.settings.json, not this file.
import { loadSettings, readStdinJson, matchesAny, block, allow } from "./lib/common.mjs";

function extractCommand(call) {
  const ti = call.tool_input || {};
  return ti.command || ti.cmd || "";
}

function extractPaths(call) {
  const ti = call.tool_input || {};
  const paths = [];
  for (const key of ["file_path", "path", "target_file", "notebook_path"]) {
    if (ti[key]) paths.push(ti[key]);
  }
  const command = extractCommand(call);
  const patch = ti.patch || "";
  for (const match of patch.matchAll(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/gm)) paths.push(match[1].trim());
  if (command) {
    for (const token of command.split(/\s+/)) {
      if (token && !token.startsWith("-")) {
        paths.push(token.replace(/^["']|["']$/g, ""));
      }
    }
  }
  return paths;
}

const call = await readStdinJson();
if (call.__malformedPayload) block("Blocked by privacyBlock: malformed hook payload.");
const settings = loadSettings(call);
if (settings.__settingsError) block("Blocked by privacyBlock: malformed hs.settings.json.");
const cfg = settings.privacyBlock || {};
if (!cfg.enabled) allow();
const deny = cfg.denyList || [];
const allowList = cfg.allowList || [];

for (const path of extractPaths(call)) {
  if (matchesAny(path, deny) && !matchesAny(path, allowList)) {
    block(
      `Blocked by privacyBlock: '${path}' matches a denied pattern in hs.settings.json and isn't in allowList.`
    );
  }
}

allow();
