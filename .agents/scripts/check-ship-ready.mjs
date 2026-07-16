#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
const root = process.cwd(); const state = join(root, ".harness", "state"); let fail = false;
const current = join(state, "current-spec");
if (!existsSync(current)) { console.log("MISSING: .harness/state/current-spec"); process.exit(1); }
const progress = join(root, ".harness", "specs", readFileSync(current, "utf8").trim(), "progress.md");
if (!existsSync(progress)) { console.log(`MISSING: ${progress}`); fail = true; } else if (/^- \[ \]/m.test(readFileSync(progress, "utf8"))) { console.log("INCOMPLETE: unchecked tasks remain"); fail = true; }
const verify = join(state, "verify-all.status");
if (!existsSync(verify) || readFileSync(verify, "utf8").trim() !== "PASS") { console.log("NOT GREEN: verify-all.status"); fail = true; }
console.log(fail ? "NOT READY" : "READY"); process.exit(fail ? 1 : 0);
