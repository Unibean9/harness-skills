import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findProjectRoot, findSettingsPath, projectPath } from "../../hooks/lib/common.mjs";

function projectFixture() {
  const root = mkdtempSync(join(tmpdir(), "harness-compat-"));
  mkdirSync(join(root, "nested", "package"), { recursive: true });
  writeFileSync(join(root, "hs.settings.json"), "{}");
  return { root, cwd: join(root, "nested", "package") };
}

test("resolves harness state from a nested Claude payload cwd", () => {
  const { root, cwd } = projectFixture();
  const call = { cwd, hook_event_name: "SessionStart", source: "startup" };
  assert.equal(findProjectRoot(call.cwd), root);
  assert.equal(findSettingsPath(call), join(root, "hs.settings.json"));
  assert.equal(projectPath(call, ".harness", "state", "audit.log"), join(root, ".harness", "state", "audit.log"));
});

test("resolves harness state from representative Codex and Gemini payloads", () => {
  const { root, cwd } = projectFixture();
  for (const call of [
    { cwd, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "git status" } },
    { cwd, hook_event_name: "BeforeTool", tool_name: "run_shell_command", tool_input: { command: "git status" } },
  ]) {
    assert.equal(findProjectRoot(call.cwd), root);
    assert.equal(projectPath(call, ".harness", "state", "verify-all.status"), join(root, ".harness", "state", "verify-all.status"));
  }
});
