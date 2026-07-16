#!/usr/bin/env node
// PreToolUse hook: enforces hs.settings.json's "shipGate" guardrail.
// Blocks git commit/push/PR-creation-style commands unless
// .harness/state/verify-all.status already says PASS -- the same rule
// hs-ship states in its own instructions, made un-skippable. The status
// file path and required value are a fixed harness convention, not a
// setting -- only *which commands trigger the check* is worth exposing
// in hs.settings.json.
import { loadSettings, projectPath, readStdinJson, block, allow, isShipCommand, extractCommand } from "./lib/common.mjs";
import { validateAttestation } from "../scripts/attestation.mjs";

const STATUS_FILE = ".harness/state/verify-all.status";

const call = await readStdinJson();
if (call.__malformedPayload) block("Blocked by shipGate: malformed hook payload.");
const settings = loadSettings(call);
if (settings.__settingsError) block("Blocked by shipGate: malformed hs.settings.json.");
const cfg = settings.shipGate || {};
if (!cfg.enabled) allow();
const command = extractCommand(call);
if (!command) allow();

if (!isShipCommand(command)) allow();

if (!validateAttestation(projectPath(call))) {
  block(
    `Blocked by shipGate: ${STATUS_FILE} lacks a valid attestation for this spec and worktree. Run hs-verify, then hs-ship, before shipping.`
  );
}

allow();
