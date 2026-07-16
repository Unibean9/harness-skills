#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const [label, separator, ...command] = process.argv.slice(2);
if (!label || separator !== "--" || !command.length) {
  console.error("usage: node .agents/scripts/run-check.mjs <label> -- <command...>");
  process.exit(2);
}
const state = join(process.cwd(), ".harness", "state");
mkdirSync(state, { recursive: true });
const result = spawnSync(command[0], command.slice(1), { encoding: "utf8", shell: false });
const output = `${result.stdout || ""}${result.stderr || ""}`;
const pass = !result.error && result.status === 0;
writeFileSync(join(state, `${label}.log`), output);
writeFileSync(join(state, `${label}.status`), pass ? "PASS\n" : "FAIL\n");
process.stdout.write(`---- ${label} (${pass ? "PASS" : "FAIL"}) ----\n${output.split("\n").slice(-40).join("\n")}\n`);
process.exit(pass ? 0 : result.status || 1);
