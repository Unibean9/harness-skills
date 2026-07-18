#!/usr/bin/env node
// PreToolUse hook: enforces hs.settings.json's "shipGate" guardrail.
// Blocks git commit/push/PR-creation-style commands unless
// .harness/state/verify-all.status already says PASS -- the same rule
// hs-ship states in its own instructions, made un-skippable. The status
// file path and required value are a fixed harness convention, not a
// setting -- only *which commands trigger the check* is worth exposing
// in hs.settings.json.
import { loadSettings, projectPath, readStdinJson, block, allow, isShipCommand, extractCommand } from "./lib/common.mjs";
import { evaluateReadiness } from "../scripts/check-ship-ready.mjs";

const call = await readStdinJson();
if (call.__malformedPayload) block("Blocked by shipGate: malformed hook payload.");
const settings = loadSettings(call);
if (settings.__settingsError) block("Blocked by shipGate: malformed hs.settings.json.");
const cfg = settings.shipGate || {};
if (!cfg.enabled) allow();
const command = extractCommand(call);
if (!command) allow();

if (!isShipCommand(command)) allow();

if (!evaluateReadiness(projectPath(call)).ready) {
  block(
    "Blocked by shipGate: this spec lacks a valid verify attestation, an approved plan, or a fully checked-off task list. Run hs-verify (and hs-review, advisory) before hs-ship."
  );
}

allow();
