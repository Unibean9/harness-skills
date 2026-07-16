#!/usr/bin/env node
// Audit-trail hook: enforces hs.settings.json's "monitoring" setting (just an
// on/off switch -- the log location and which events get recorded are a
// fixed harness convention, so wiring a new event only means adding one line
// to the agent's hook config, not touching hs.settings.json).
// Appends one line per tool call to .harness/state/audit.log, so there's a
// record of what actually happened, independent of what any agent transcript
// claims.
import { loadSettings, projectPath, readStdinJson, appendAuditLine, nowIso } from "./lib/common.mjs";

const LOG_FILE = ".harness/state/audit.log";

const call = await readStdinJson();
const settings = loadSettings(call);
const cfg = settings.monitoring || {};
if (!cfg.enabled) process.exit(0);
const event = call.hook_event_name || "unknown";
const tool = call.tool_name || "unknown";
const ti = call.tool_input || {};
const rawDetail = ti.command || ti.file_path || ti.path || "";
const detail = String(rawDetail).replace(/(token|password|secret|api[_-]?key)=?[^\s]+/gi, "$1=[REDACTED]");

appendAuditLine(projectPath(call, LOG_FILE), JSON.stringify({ timestamp: nowIso(), event, tool, detail }));
process.exit(0);
