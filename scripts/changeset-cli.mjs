#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { capturePlanChangeset, comparePlanChangeset } from "./changeset.mjs";

const [action, specFlag, spec, ...paths] = process.argv.slice(2);
try {
  if (specFlag !== "--spec" || !spec) throw new Error("usage: changeset-cli.mjs capture|inspect --spec <id> [pre-existing paths...]");
  if (action === "inspect" && !paths.length) console.log(JSON.stringify(comparePlanChangeset(process.cwd(), spec), null, 2));
  else if (action === "capture") console.log(JSON.stringify(capturePlanChangeset(process.cwd(), spec, { preexistingPaths: paths }), null, 2));
  else throw new Error("usage: changeset-cli.mjs capture|inspect --spec <id> [pre-existing paths...]");
} catch (error) { console.error(error.message); process.exitCode = 1; }

if (process.argv[1] && fileURLToPath(import.meta.url) !== resolve(process.argv[1])) process.exitCode = 1;
