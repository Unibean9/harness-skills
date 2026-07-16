#!/usr/bin/env node
// PreToolUse hook: enforces hs.settings.json's "shipGate" guardrail.
// Blocks git commit/push/PR-creation-style commands unless
// .harness/state/verify-all.status already says PASS -- the same rule
// hs-ship states in its own instructions, made un-skippable. The status
// file path and required value are a fixed harness convention, not a
// setting -- only *which commands trigger the check* is worth exposing
// in hs.settings.json.
import { existsSync, readFileSync } from "node:fs";
import { loadSettings, readStdinJson, block, allow } from "./lib/common.mjs";

const STATUS_FILE = ".harness/state/verify-all.status";
const REQUIRED = "PASS";

function extractCommand(call) {
  const ti = call.tool_input || {};
  return ti.command || ti.cmd || "";
}

const settings = loadSettings();
const cfg = settings.shipGate || {};
if (!cfg.enabled) allow();

const call = await readStdinJson();
const command = extractCommand(call);
if (!command) allow();

const triggers = cfg.blockCommands || [];
if (!triggers.some((t) => command.includes(t))) allow();

const actual = existsSync(STATUS_FILE) ? readFileSync(STATUS_FILE, "utf8").trim() : null;

if (actual !== REQUIRED) {
  block(
    `Blocked by shipGate: ${STATUS_FILE} is ${JSON.stringify(actual)}, need ${JSON.stringify(
      REQUIRED
    )}. Run hs-verify, then hs-ship, before shipping.`
  );
}

allow();
