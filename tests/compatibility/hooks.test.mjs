import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isShipCommand } from "../../hooks/lib/common.mjs";

test("ship command classifier handles supported git options and gh PR creation", () => {
  for (const command of ["git commit -m x", "git -C repo commit -m x", "git --no-pager push", "gh pr create --fill"]) assert.equal(isShipCommand(command), true);
  for (const command of ["git status", "git checkout main", "gh pr list", "echo git commit"]) assert.equal(isShipCommand(command), false);
});

test("privacy hook blocks denied patch paths and malformed payloads", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-hook-"));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  writeFileSync(join(root, "hs.settings.json"), JSON.stringify({ privacyBlock: { enabled: true, denyList: [".env"], allowList: [] } }));
  const hook = fileURLToPath(new URL("../../hooks/privacy-block.mjs", import.meta.url));
  const run = (command) => spawnSync(process.execPath, [hook], { cwd: root, input: JSON.stringify({ tool_input: { command } }), encoding: "utf8" });

  // Codex's real apply_patch payload puts the envelope in tool_input.command.
  const denied = run("*** Begin Patch\n*** Update File: .env\n@@\n-old\n+new\n*** End Patch\n");
  assert.equal(denied.status, 2);

  // Renaming a file onto a denied path must be caught via "*** Move to:".
  const renamedIntoDenied = run("*** Begin Patch\n*** Update File: config.txt\n*** Move to: .env\n@@\n-old\n+new\n*** End Patch\n");
  assert.equal(renamedIntoDenied.status, 2);

  // A word matching the deny pattern inside the diff BODY (not a file header)
  // must not false-positive -- only envelope path headers count.
  const bodyMentionOnly = run('*** Begin Patch\n*** Update File: notes.txt\n@@\n-old\n+"see .env for setup"\n*** End Patch\n');
  assert.equal(bodyMentionOnly.status, 0);

  const malformed = spawnSync(process.execPath, [hook], { cwd: root, input: "{", encoding: "utf8" });
  assert.equal(malformed.status, 2);
});

test("monitoring emits redacted JSON lines", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-audit-"));
  writeFileSync(join(root, "hs.settings.json"), JSON.stringify({ monitoring: { enabled: true } }));
  const hook = fileURLToPath(new URL("../../hooks/monitoring.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [hook], { cwd: root, input: JSON.stringify({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: "curl token=supersecret" } }), encoding: "utf8" });
  assert.equal(result.status, 0);
  const line = JSON.parse(readFileSync(join(root, ".harness", "state", "audit.log"), "utf8"));
  assert.match(line.detail, /REDACTED/); assert.doesNotMatch(line.detail, /supersecret/);
});
