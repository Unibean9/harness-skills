#!/usr/bin/env node
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
const specs = join(process.cwd(), ".harness", "specs");
mkdirSync(specs, { recursive: true });
const max = readdirSync(specs, { withFileTypes: true }).filter((e) => e.isDirectory()).reduce((value, entry) => Math.max(value, Number(/^\d+/.exec(entry.name)?.[0] || 0)), 0);
console.log(String(max + 1).padStart(3, "0"));
