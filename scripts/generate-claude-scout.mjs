#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const agentsDoc = readFileSync(join(root, "docs", "agents.md"), "utf8");
const startIdx = agentsDoc.indexOf("\n## hs-scout");
if (startIdx === -1) throw new Error("docs/agents.md: no '## hs-scout' section found");
const nextIdx = agentsDoc.indexOf("\n## ", startIdx + 1);
const section = agentsDoc.slice(startIdx + 1, nextIdx === -1 ? undefined : nextIdx).trim();
const frontmatter = `---
name: hs-scout
description: Cheap, fast context-gathering subagent for the harness.
tools: Read, Grep, Glob, WebFetch, WebSearch
model: haiku
---

`;
const target = join(root, "agents", "hs-scout.md");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${frontmatter}<!-- GENERATED from docs/agents.md's "## hs-scout" section; run node scripts/generate-claude-scout.mjs -->\n\n${section}\n`);
