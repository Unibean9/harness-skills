#!/usr/bin/env node
import { evaluateReadiness } from "./readiness.mjs";
const [flag, spec] = process.argv.slice(2);
if (flag !== "--spec" || !spec || process.argv.length !== 4) {
  console.error("usage: check-ship-ready.mjs --spec <id>");
  process.exit(2);
}
const result = evaluateReadiness(process.cwd(), spec);
for (const error of result.errors) console.log(`NOT READY: ${error}`);
console.log(result.ready ? "READY" : "NOT READY");
process.exit(result.ready ? 0 : 1);
