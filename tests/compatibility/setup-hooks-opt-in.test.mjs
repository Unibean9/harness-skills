import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setupAgent } from "../../scripts/setup.mjs";

test("setup installs portable Codex skills and subagents without the hook companion by default", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-setup-portable-"));
  const lines = setupAgent("codex", root);
  assert.ok(existsSync(join(root, ".codex", "skills", "hs-verify", "SKILL.md")));
  assert.ok(existsSync(join(root, ".codex", "agents", "hs-scout.toml")));
  assert.equal(existsSync(join(root, ".codex", "hooks.json")), false);
  assert.equal(existsSync(join(root, ".codex", "hooks")), false);
  assert.ok(lines.some((line) => line.includes("hooks   -> skipped")));
});

test("setup installs the Codex hook companion only with explicit opt-in", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-setup-hooks-"));
  const lines = setupAgent("codex", root, { withHooks: true });
  assert.ok(existsSync(join(root, ".codex", "hooks.json")));
  assert.ok(existsSync(join(root, ".codex", "hooks", "ship-gate.mjs")));
  assert.ok(existsSync(join(root, ".codex", "scripts", "check-ship-ready.mjs")));
  assert.ok(existsSync(join(root, "hs.settings.json")));
  assert.ok(lines.some((line) => line.includes("hooks-wiring")));
});

test("setup never fabricates an Antigravity hook adapter", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-setup-antigravity-"));
  const lines = setupAgent("antigravity", root, { withHooks: true });
  assert.equal(existsSync(join(root, ".agents", "hooks")), false);
  assert.ok(lines.some((line) => line.includes("hooks   -> unavailable")));
});
