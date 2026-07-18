#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const commands = {
  state: "state.mjs",
  check: "run-check.mjs",
  verify: "verification-runner.mjs",
  attest: "attestation.mjs",
  manual: "manual-evidence.mjs",
  readiness: "check-ship-ready.mjs",
  changeset: "changeset-cli.mjs",
  "plan-review": "plan-review.mjs",
};
const [command, ...args] = process.argv.slice(2);
function projectRoot(start) {
  let current = start;
  for (;;) {
    if (existsSync(join(current, ".git")) || existsSync(join(current, "package.json")) || existsSync(join(current, "hs.settings.json")) || existsSync(join(current, ".harness"))) return current;
    const parent = dirname(current); if (parent === current) return start; current = parent;
  }
}
if (!command || !(command in commands)) {
  console.error("usage: hs <state|plan-review|changeset|check|verify|attest|manual|readiness> ...");
  process.exitCode = 2;
} else {
  const result = spawnSync(process.execPath, [join(root, "scripts", commands[command]), ...args], { cwd: projectRoot(process.cwd()), stdio: "inherit", shell: false });
  process.exitCode = result.status ?? 1;
}
