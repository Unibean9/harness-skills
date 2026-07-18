#!/usr/bin/env node
// PreToolUse hook: enforces hs.settings.json's "privacyBlock" guardrail.
// Blocks a tool call that reads or references a path matching denyList,
// unless that path also matches allowList. Config-driven -- change what's
// blocked by editing hs.settings.json, not this file.
import { loadSettings, readStdinJson, matchesAny, block, allow, extractCommand, extractCursorPath } from "./lib/common.mjs";

function extractPaths(call) {
  const ti = call.tool_input || {};
  const paths = [];
  for (const key of ["file_path", "path", "target_file", "notebook_path", "absolute_path"]) {
    if (ti[key]) paths.push(ti[key]);
  }
  // Cursor's beforeReadFile/afterFileEdit payloads put file_path at the top
  // level instead of nesting it under tool_input.
  const cursorPath = extractCursorPath(call);
  if (cursorPath) paths.push(cursorPath);
  const command = extractCommand(call);
  // Codex's apply_patch sends the patch envelope in tool_input.command (same
  // field as Bash), not a separate "patch" field -- parse the envelope's own
  // file-operation headers rather than tokenizing the whole diff body, which
  // would treat every word of added/removed code as a candidate path.
  if (/^\*\*\* Begin Patch/m.test(command)) {
    for (const match of command.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)) paths.push(match[1].trim());
    for (const match of command.matchAll(/^\*\*\* Move to: (.+)$/gm)) paths.push(match[1].trim());
  } else if (command) {
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
