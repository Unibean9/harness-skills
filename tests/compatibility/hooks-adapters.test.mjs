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

test("Claude adapter covers its documented file and audit tools", () => {
  const claude = JSON.parse(read("hooks/hooks.json"));
  assert.match(claude.hooks.PreToolUse[0].matcher, /Read\|Write\|Edit\|Bash/);
  assert.equal(claude.hooks.PostToolUse[0].matcher, ".*");
});

test("Cursor snippet wires ship-gate and privacy-block with failClosed, using confirmed event names", () => {
  const snippet = JSON.parse(read("hooks/cursor/hooks.json.snippet"));
  assert.equal(snippet.version, 1);
  const shellHooks = snippet.hooks.beforeShellExecution;
  assert.ok(shellHooks.some((h) => /privacy-block\.mjs/.test(h.command)));
  assert.ok(shellHooks.some((h) => /ship-gate\.mjs/.test(h.command)));
  assert.ok(shellHooks.every((h) => h.failClosed === true));
  assert.ok(snippet.hooks.beforeReadFile.some((h) => /privacy-block\.mjs/.test(h.command)));
  // session-state/monitoring are deliberately not wired for Cursor yet.
  assert.equal(snippet.hooks.sessionStart, undefined);
  assert.equal(snippet.hooks.afterFileEdit, undefined);
});
