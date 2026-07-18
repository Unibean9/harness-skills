#!/usr/bin/env node
// Audit-trail hook: enforces hs.settings.json's "monitoring" setting.
// Appends one categorized line per tool call to .harness/state/audit.log, so
// there's a record of what actually happened, independent of what any agent
// transcript claims -- then trims that log to the configured retention
// window. An audit trail nobody can open because it grew unbounded for a
// year isn't independent evidence anymore, it's dead weight.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { loadSettings, projectPath, readStdinJson, appendAuditLine, extractCommand, isShipCommand, nowIso } from "./lib/common.mjs";

const LOG_FILE = ".harness/state/audit.log";
const DEFAULT_MAX_LINES = 5000;
const DEFAULT_MAX_AGE_DAYS = 30;

// Fixed, not configurable -- these are the categories every consumer of the
// log (a human grepping it, a future digest script) can rely on existing,
// the same way the log's path itself is a fixed convention.
const WRITE_TOOLS = new Set(["Write", "Edit", "apply_patch", "write_file", "replace"]);
const READ_TOOLS = new Set(["Read", "read_file"]);

function categorize(tool, command) {
  if (tool === "Bash" || tool === "run_shell_command") return isShipCommand(command) ? "ship" : "shell";
  if (WRITE_TOOLS.has(tool)) return "file-write";
  if (READ_TOOLS.has(tool)) return "file-read";
  return "other";
}

// Trims by both age and count so the log stays a bounded operational record
// instead of growing forever -- neither limit alone is enough on its own
// (a quiet project keeps ancient lines forever under a count-only cap; a
// noisy one blows past a time-only cap in a day).
function applyRetention(path, retention = {}) {
  if (!existsSync(path)) return;
  const maxLines = Number.isFinite(retention.maxLines) && retention.maxLines > 0 ? retention.maxLines : DEFAULT_MAX_LINES;
  const maxAgeDays = Number.isFinite(retention.maxAgeDays) && retention.maxAgeDays > 0 ? retention.maxAgeDays : DEFAULT_MAX_AGE_DAYS;
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  const kept = lines
    .filter((line) => {
      try {
        return Date.parse(JSON.parse(line).timestamp) >= cutoff;
      } catch {
        return true; // an unparseable line is a signal something's wrong, not noise to silently drop
      }
    })
    .slice(-maxLines);
  if (kept.length !== lines.length) writeFileSync(path, kept.length ? `${kept.join("\n")}\n` : "");
}

const call = await readStdinJson();
const settings = loadSettings(call);
const cfg = settings.monitoring || {};
if (!cfg.enabled) process.exit(0);
const event = call.hook_event_name || "unknown";
const tool = call.tool_name || "unknown";
const ti = call.tool_input || {};
const command = extractCommand(call);
const rawDetail = ti.command || ti.file_path || ti.path || "";
const detail = String(rawDetail).replace(/(token|password|secret|api[_-]?key)=?[^\s]+/gi, "$1=[REDACTED]");
const category = categorize(tool, command);

const logPath = projectPath(call, LOG_FILE);
appendAuditLine(logPath, JSON.stringify({ timestamp: nowIso(), event, tool, category, detail }));
applyRetention(logPath, cfg.retention);
process.exit(0);
