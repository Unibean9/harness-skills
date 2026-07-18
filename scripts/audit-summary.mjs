#!/usr/bin/env node
// Reads .harness/state/audit.log (written by hooks/monitoring.mjs) and
// summarizes it -- category counts, time range, most recent entries. Exists
// because a log nobody ever reads isn't evidence, it's a write-only cost:
// this is the consumer that makes turning `monitoring` on worth the disk
// writes, not just a promise that someone might grep it someday.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LOG_PATH = ".harness/state/audit.log";

// Log entries come from tool-call payloads (commands, file paths) -- an
// entry containing raw ANSI escapes or other control characters would be
// emitted verbatim to the terminal otherwise. Strip anything that isn't
// printable ASCII/whitespace before it ever reaches console.log.
export function sanitizeForTerminal(value) {
  return String(value ?? "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function parseLines(text) {
  const parsed = [];
  let malformed = 0;
  for (const line of text.split("\n").filter(Boolean)) {
    try {
      parsed.push(JSON.parse(line));
    } catch {
      malformed += 1;
    }
  }
  return { parsed, malformed };
}

export function summarizeAudit(root = process.cwd(), { tail = 10 } = {}) {
  const logPath = join(root, LOG_PATH);
  if (!existsSync(logPath)) {
    return { exists: false, message: `no audit log at ${LOG_PATH} -- monitoring may be off, or nothing has been logged yet` };
  }
  const { parsed, malformed } = parseLines(readFileSync(logPath, "utf8"));
  if (!parsed.length) {
    return { exists: true, empty: true, malformed, message: "audit log exists but has no parseable entries" };
  }
  const byCategory = {};
  for (const entry of parsed) byCategory[entry.category || "unknown"] = (byCategory[entry.category || "unknown"] || 0) + 1;
  const timestamps = parsed.map((e) => e.timestamp).filter(Boolean).sort();
  return {
    exists: true,
    total: parsed.length,
    malformed,
    byCategory,
    firstTimestamp: timestamps[0] || null,
    lastTimestamp: timestamps[timestamps.length - 1] || null,
    recent: parsed.slice(-tail),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const tailIndex = args.indexOf("--tail");
  const tail = tailIndex !== -1 ? Number(args[tailIndex + 1]) || 10 : 10;
  const summary = summarizeAudit(process.cwd(), { tail });
  if (!summary.exists || summary.empty) {
    console.log(summary.message);
  } else {
    console.log(`${summary.total} entries (${summary.malformed} malformed/skipped), ${summary.firstTimestamp} -> ${summary.lastTimestamp}`);
    for (const [category, count] of Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${category}: ${count}`);
    }
    console.log(`\nlast ${summary.recent.length}:`);
    for (const entry of summary.recent) {
      const line = `[${entry.timestamp}] ${entry.category} ${entry.tool} ${entry.detail || ""}`.trim();
      console.log(`  ${sanitizeForTerminal(line)}`);
    }
  }
}
