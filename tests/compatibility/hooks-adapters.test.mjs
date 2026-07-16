import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("Codex hooks use current tool matchers and stable commands", () => {
  const snippet = JSON.parse(read("hooks/codex/hooks.json.snippet"));
  assert.match(snippet.PreToolUse[0].matcher, /Bash/);
  assert.match(snippet.PreToolUse[0].matcher, /apply_patch/);
  assert.doesNotMatch(JSON.stringify(snippet), /"shell"/);
  assert.match(snippet.PostToolUse[0].hooks[0].command, /git rev-parse --show-toplevel/);
  assert.ok(snippet.PostToolUse[0].hooks[0].commandWindows);
});

test("Claude and Gemini adapters cover their documented file and audit tools", () => {
  const claude = JSON.parse(read("hooks/claude-code/settings.snippet.json"));
  const gemini = JSON.parse(read("hooks/gemini/settings.snippet.json"));
  assert.match(claude.hooks.PreToolUse[0].matcher, /Read\|Write\|Edit\|Bash/);
  assert.equal(claude.hooks.PostToolUse[0].matcher, ".*");
  assert.match(gemini.hooks.BeforeTool[0].matcher, /read_file\|write_file\|replace\|run_shell_command/);
  assert.equal(gemini.hooks.AfterTool[0].matcher, ".*");
});
