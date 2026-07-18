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

test("privacy hook blocks a Cursor-shaped beforeReadFile payload (top-level file_path, not nested)", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-hook-cursor-"));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  writeFileSync(join(root, "hs.settings.json"), JSON.stringify({ privacyBlock: { enabled: true, denyList: [".env"], allowList: [] } }));
  const hook = fileURLToPath(new URL("../../hooks/privacy-block.mjs", import.meta.url));
  const payload = { cwd: root, file_path: join(root, ".env"), hook_event_name: "beforeReadFile" };
  const result = spawnSync(process.execPath, [hook], { cwd: root, input: JSON.stringify(payload), encoding: "utf8" });
  assert.equal(result.status, 2);
  const out = JSON.parse(result.stdout.trim());
  assert.equal(out.permission, "deny");
  assert.match(out.agent_message, /privacyBlock/);
});

test("ship gate blocks a Cursor-shaped beforeShellExecution git commit without a valid attestation, allows a non-ship command", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-hook-cursor-ship-"));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  writeFileSync(join(root, "hs.settings.json"), JSON.stringify({ shipGate: { enabled: true } }));
  const hook = fileURLToPath(new URL("../../hooks/ship-gate.mjs", import.meta.url));
  const fire = (command) => spawnSync(process.execPath, [hook], { cwd: root, input: JSON.stringify({ cwd: root, command, hook_event_name: "beforeShellExecution" }), encoding: "utf8" });

  const blocked = fire("git commit -m test");
  assert.equal(blocked.status, 2);
  assert.equal(JSON.parse(blocked.stdout.trim()).permission, "deny");

  const allowed = fire("ls -la");
  assert.equal(allowed.status, 0);
  assert.equal(JSON.parse(allowed.stdout.trim()).permission, "allow");
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

test("monitoring categorizes tool calls into fixed buckets", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-audit-cat-"));
  writeFileSync(join(root, "hs.settings.json"), JSON.stringify({ monitoring: { enabled: true } }));
  const hook = fileURLToPath(new URL("../../hooks/monitoring.mjs", import.meta.url));
  const logPath = join(root, ".harness", "state", "audit.log");
  const fire = (tool_name, tool_input) => spawnSync(process.execPath, [hook], { cwd: root, input: JSON.stringify({ hook_event_name: "PostToolUse", tool_name, tool_input }), encoding: "utf8" });

  fire("Bash", { command: "git commit -m x" });
  fire("Bash", { command: "ls -la" });
  fire("Write", { file_path: "a.txt" });
  fire("Read", { file_path: "a.txt" });
  fire("Task", {});

  const categories = readFileSync(logPath, "utf8").trim().split("\n").map((line) => JSON.parse(line).category);
  assert.deepEqual(categories, ["ship", "shell", "file-write", "file-read", "other"]);
});

test("monitoring retention trims old and excess lines", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-audit-retain-"));
  writeFileSync(join(root, "hs.settings.json"), JSON.stringify({ monitoring: { enabled: true, retention: { maxLines: 3, maxAgeDays: 1 } } }));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  const logPath = join(root, ".harness", "state", "audit.log");
  const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // well past maxAgeDays
  const recent = new Date().toISOString();
  const seedLines = [
    { timestamp: old, event: "PostToolUse", tool: "Read", category: "file-read", detail: "old-1" },
    { timestamp: recent, event: "PostToolUse", tool: "Read", category: "file-read", detail: "recent-1" },
    { timestamp: recent, event: "PostToolUse", tool: "Read", category: "file-read", detail: "recent-2" },
  ];
  writeFileSync(logPath, seedLines.map((l) => JSON.stringify(l)).join("\n") + "\n");

  const hook = fileURLToPath(new URL("../../hooks/monitoring.mjs", import.meta.url));
  // Firing four more recent events should: drop the one stale line by age,
  // then cap the remainder to maxLines (3) by count.
  for (let i = 0; i < 4; i += 1) {
    spawnSync(process.execPath, [hook], { cwd: root, input: JSON.stringify({ hook_event_name: "PostToolUse", tool_name: "Read", tool_input: { file_path: `new-${i}.txt` } }), encoding: "utf8" });
  }

  const kept = readFileSync(logPath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(kept.length, 3);
  assert.ok(kept.every((line) => line.detail !== "old-1"), "stale line past maxAgeDays must be dropped");
  assert.deepEqual(kept.map((l) => l.detail), ["new-1.txt", "new-2.txt", "new-3.txt"]);
});
