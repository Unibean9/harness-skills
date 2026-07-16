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
import { loadSettings, projectPath, readStdinJson, findProjectRoot } from "./lib/common.mjs";
import { validateAttestation } from "../scripts/attestation.mjs";

const CURRENT_SPEC_FILE = ".harness/state/current-spec";
const SUMMARY_FILE = ".harness/state/session-summary.md";

// Route to the next phase from what's actually on disk, mirroring the
// decision tree in AGENTS.md ("Required flow"). A suggestion, not a gate —
// the skills still re-check their own preconditions.
function suggestNextPhase(specDir, root) {
  const status = (file) => {
    if (!existsSync(file)) return "missing";
    return readFileSync(file, "utf8").match(/\*\*Status:\*\*\s*(\w+)/)?.[1] || "missing";
  };
  if (status(`${specDir}/spec.md`) !== "approved") return "hs-brainstorm (spec not approved yet)";
  if (status(`${specDir}/plan.md`) !== "approved") return "hs-plan (plan not approved yet)";
  const planned = (readFileSync(`${specDir}/plan.md`, "utf8").match(/^## Task /gm) || []).length;
  const progressFile = `${specDir}/progress.md`;
  const done = existsSync(progressFile) ? (readFileSync(progressFile, "utf8").match(/^- \[x\]/gm) || []).length : 0;
  if (done < planned) return `hs-build (${done}/${planned} tasks done)`;
  let attested = false;
  try { attested = validateAttestation(root); } catch { attested = false; }
  if (!attested) return "hs-verify (no valid attestation for this worktree)";
  const progressText = existsSync(progressFile) ? readFileSync(progressFile, "utf8") : "";
  if (!/^## Review /m.test(progressText)) return "hs-review (recommended, not required) or hs-ship";
  return "hs-ship (attestation valid, reviewed; awaiting human ship confirmation)";
}

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

let digest;
if (!existsSync(currentSpecFile)) {
  digest = [
    "# Harness session summary (auto-generated)",
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
    `- suggested next phase: ${suggestNextPhase(specDir, findProjectRoot(call.cwd || process.cwd()))}`,
  ];
  digest = ["# Harness session summary (auto-generated)", "", ...sections].join("\n");
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
