#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const commands = {
  check: "run-check.mjs",
  attest: "attestation.mjs",
  readiness: "check-ship-ready.mjs",
  init: "init.mjs",
  setup: "setup.mjs",
  doctor: "doctor.mjs",
  agents: "generate-agents.mjs",
  status: "next-skill.mjs",
  audit: "audit-summary.mjs",
};
const [command, ...args] = process.argv.slice(2);
// init/setup CREATE the project markers, so they must act on the directory
// the user is standing in -- walking up from an empty folder would land on
// some parent repo and scaffold there instead. Every other command reads
// existing state, so walking up to the project root is what the user means.
const runsInCwd = new Set(["init", "setup"]);
function projectRoot(start) {
  let current = start;
  for (;;) {
    if (existsSync(join(current, ".git")) || existsSync(join(current, "package.json")) || existsSync(join(current, "hs.settings.json")) || existsSync(join(current, ".harness"))) return current;
    const parent = dirname(current); if (parent === current) return start; current = parent;
  }
}
if (!command || !(command in commands)) {
  console.error("usage: hs <check|attest|readiness|status|audit|init|setup|doctor|agents> ...");
  process.exitCode = 2;
} else {
  const cwd = runsInCwd.has(command) ? process.cwd() : projectRoot(process.cwd());
  const result = spawnSync(process.execPath, [join(root, "scripts", commands[command]), ...args], { cwd, stdio: "inherit", shell: false });
  process.exitCode = result.status ?? 1;
}
