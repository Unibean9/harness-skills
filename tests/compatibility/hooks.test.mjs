import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isShipCommand } from "../../hooks/lib/common.mjs";

test("ship command classifier handles supported git options and gh PR creation", () => {
  for (const command of ["git commit -m x", "git -C repo commit -m x", "git --no-pager push", "gh pr create --fill"]) assert.equal(isShipCommand(command), true);
  for (const command of ["git status", "git checkout main", "gh pr list", "echo git commit"]) assert.equal(isShipCommand(command), false);
});

test("privacy hook blocks denied patch paths and malformed payloads", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-hook-"));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  writeFileSync(join(root, "hs.settings.json"), JSON.stringify({ privacyBlock: { enabled: true, denyList: [".env"], allowList: [] } }));
  const hook = new URL("../../hooks/privacy-block.mjs", import.meta.url).pathname.slice(1);
  const denied = spawnSync(process.execPath, [hook], { cwd: root, input: JSON.stringify({ tool_input: { patch: "*** Update File: .env\n" } }), encoding: "utf8" });
  assert.equal(denied.status, 2);
  const malformed = spawnSync(process.execPath, [hook], { cwd: root, input: "{", encoding: "utf8" });
  assert.equal(malformed.status, 2);
});

test("monitoring emits redacted JSON lines", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-audit-"));
  writeFileSync(join(root, "hs.settings.json"), JSON.stringify({ monitoring: { enabled: true } }));
  const hook = new URL("../../hooks/monitoring.mjs", import.meta.url).pathname.slice(1);
  const result = spawnSync(process.execPath, [hook], { cwd: root, input: JSON.stringify({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: "curl token=supersecret" } }), encoding: "utf8" });
  assert.equal(result.status, 0);
  const line = JSON.parse(readFileSync(join(root, ".harness", "state", "audit.log"), "utf8"));
  assert.match(line.detail, /REDACTED/); assert.doesNotMatch(line.detail, /supersecret/);
});
