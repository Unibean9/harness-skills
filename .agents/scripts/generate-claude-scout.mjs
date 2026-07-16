#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const canonical = readFileSync(join(root, ".agents", "agents", "hs-scout.md"), "utf8");
const frontmatter = `---
name: hs-scout
description: Cheap, fast context-gathering subagent for the harness.
tools: Read, Grep, Glob, WebFetch, WebSearch
model: haiku
---

`;
const target = join(root, ".claude", "agents", "hs-scout.md");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${frontmatter}<!-- GENERATED from .agents/agents/hs-scout.md; run node .agents/scripts/generate-claude-scout.mjs -->\n\n${canonical}`);
