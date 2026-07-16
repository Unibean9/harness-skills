#!/usr/bin/env node
// SessionStart hook: enforces hs.settings.json's "sessionState" setting (just
// an on/off switch -- which files feed the digest is a fixed harness
// convention: whatever spec is active, per .harness/state/current-spec).
//
// Builds a short digest -- which spec is active, its spec/plan approval
// status, last progress and implementation-note entries -- and writes it to
// .harness/state/session-summary.md, so a fresh session (or a different
// agent entirely) doesn't have to re-read and re-derive where things stand.
// On Claude Code, also injects the digest directly into the new session via
// additionalContext; on agents without that field, the digest file itself is
// still there because AGENTS.md already instructs skills to read .harness/
// before doing anything.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadSettings, readStdinJson } from "./lib/common.mjs";

const CURRENT_SPEC_FILE = ".harness/state/current-spec";
const SUMMARY_FILE = ".harness/state/session-summary.md";

function describeFile(file) {
  if (!existsSync(file)) return `- ${file}: missing`;
  const text = readFileSync(file, "utf8");
  const statusMatch = text.match(/\*\*Status:\*\*\s*(\w+)/);
  if (statusMatch) return `- ${file}: Status = ${statusMatch[1]}`;
  const tail = text.trim().split("\n").filter(Boolean).slice(-5);
  if (!tail.length) return `- ${file}: present, empty`;
  return [`- ${file}: last entries`, ...tail.map((l) => `    ${l}`)].join("\n");
}

const settings = loadSettings();
const cfg = settings.sessionState || {};
if (!cfg.enabled) process.exit(0);

await readStdinJson(); // drain stdin; SessionStart payload isn't needed here

let digest;
if (!existsSync(CURRENT_SPEC_FILE)) {
  digest = [
    "# Harness session summary (auto-generated)",
    "",
    "No active spec yet (.harness/state/current-spec doesn't exist).",
    "Run hs-brainstorm to start one, or check .harness/specs/INDEX.md for prior specs.",
  ].join("\n");
} else {
  const activeSpec = readFileSync(CURRENT_SPEC_FILE, "utf8").trim();
  const specDir = `.harness/specs/${activeSpec}`;
  const sections = [
    `- active spec: ${activeSpec}`,
    describeFile(`${specDir}/spec.md`),
    describeFile(`${specDir}/plan.md`),
    describeFile(`${specDir}/progress.md`),
    describeFile(`${specDir}/implement-notes.md`),
  ];
  digest = ["# Harness session summary (auto-generated)", "", ...sections].join("\n");
}

mkdirSync(dirname(SUMMARY_FILE), { recursive: true });
writeFileSync(SUMMARY_FILE, digest + "\n");

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: digest,
    },
  })
);
process.exit(0);
