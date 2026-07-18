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
// still there because the phase skills already instruct agents to read .harness/
// before doing anything.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadSettings, projectPath, readStdinJson } from "./lib/common.mjs";
import { computeNextSkill } from "../scripts/next-skill.mjs";

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

const call = await readStdinJson();
const settings = loadSettings(call);
const cfg = settings.sessionState || {};
if (!cfg.enabled) process.exit(0);

const currentSpecFile = projectPath(call, CURRENT_SPEC_FILE);
const summaryFile = projectPath(call, SUMMARY_FILE);

// Computed once, deterministically, so a fresh session doesn't have to infer
// "which skill comes next" from spec.md/plan.md/progress.md prose each time
// -- it's the same decision tree the phase skills describe, just pre-run.
let next;
try {
  next = computeNextSkill(projectPath(call));
} catch {
  next = null;
}
const nextSkillLine = next
  ? `**Next: \`${next.nextSkill}\`** (phase: ${next.phase} — ${next.reason})`
  : "**Next: unable to determine — read `.harness/` and the applicable phase skill manually.**";

let digest;
if (!existsSync(currentSpecFile)) {
  digest = [
    "# Harness session summary (auto-generated)",
    "",
    nextSkillLine,
    "",
    "No active spec yet (.harness/state/current-spec doesn't exist).",
    "Run hs-brainstorm to start one, or check .harness/specs/INDEX.md for prior specs.",
  ].join("\n");
} else {
  const activeSpec = readFileSync(currentSpecFile, "utf8").trim();
  const specDir = projectPath(call, ".harness", "specs", activeSpec);
  const sections = [
    `- active spec: ${activeSpec}`,
    describeFile(`${specDir}/spec.md`),
    describeFile(`${specDir}/plan.md`),
    describeFile(`${specDir}/progress.md`),
    describeFile(`${specDir}/implement-notes.md`),
  ];
  digest = ["# Harness session summary (auto-generated)", "", nextSkillLine, "", ...sections].join("\n");
}

mkdirSync(dirname(summaryFile), { recursive: true });
writeFileSync(summaryFile, digest + "\n");

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: digest,
    },
  })
);
process.exit(0);
