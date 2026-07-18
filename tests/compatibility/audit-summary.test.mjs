import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { summarizeAudit, sanitizeForTerminal } from "../../scripts/audit-summary.mjs";

test("summarizeAudit reports 'no log' distinctly from 'empty log' distinctly from real entries", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-audit-summary-"));
  const missing = summarizeAudit(root);
  assert.equal(missing.exists, false);

  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  writeFileSync(join(root, ".harness", "state", "audit.log"), "");
  const empty = summarizeAudit(root);
  assert.equal(empty.exists, true);
  assert.equal(empty.empty, true);
});

test("summarizeAudit categorizes counts, skips malformed lines without dropping the rest, and orders recent entries", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-audit-summary-"));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  const lines = [
    { timestamp: "2026-07-18T10:00:00.000Z", event: "PreToolUse", tool: "Bash", category: "shell", detail: "ls" },
    { timestamp: "2026-07-18T10:01:00.000Z", event: "PreToolUse", tool: "Bash", category: "ship", detail: "git commit -m x" },
    { timestamp: "2026-07-18T10:02:00.000Z", event: "PreToolUse", tool: "Read", category: "file-read", detail: "a.txt" },
  ];
  const content = [JSON.stringify(lines[0]), "{not json", JSON.stringify(lines[1]), JSON.stringify(lines[2])].join("\n") + "\n";
  writeFileSync(join(root, ".harness", "state", "audit.log"), content);

  const summary = summarizeAudit(root, { tail: 2 });
  assert.equal(summary.total, 3);
  assert.equal(summary.malformed, 1);
  assert.deepEqual(summary.byCategory, { shell: 1, ship: 1, "file-read": 1 });
  assert.equal(summary.firstTimestamp, "2026-07-18T10:00:00.000Z");
  assert.equal(summary.lastTimestamp, "2026-07-18T10:02:00.000Z");
  assert.equal(summary.recent.length, 2);
  assert.equal(summary.recent[1].detail, "a.txt");
});

test("sanitizeForTerminal strips ANSI/control characters so a malicious tool-call detail can't inject terminal escapes", () => {
  assert.equal(sanitizeForTerminal("plain text"), "plain text");
  assert.equal(sanitizeForTerminal("\x1b[31mred\x1b[0m"), "[31mred[0m");
  assert.equal(sanitizeForTerminal("a\x07b\x00c"), "abc");
  assert.equal(sanitizeForTerminal(undefined), "");
  assert.equal(sanitizeForTerminal("tab\tand\nnewline stay"), "tab\tand\nnewline stay");
});
