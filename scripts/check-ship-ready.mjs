#!/usr/bin/env node
import { evaluateReadiness } from "./readiness.mjs";
const result = evaluateReadiness(process.cwd());
for (const error of result.errors) console.log(`NOT READY: ${error}`);
console.log(result.ready ? "READY" : "NOT READY");
process.exit(result.ready ? 0 : 1);
