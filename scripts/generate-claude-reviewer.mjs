#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const agentsDoc = readFileSync(join(root, "docs", "agents.md"), "utf8");
const startIdx = agentsDoc.indexOf("\n## hs-reviewer");
if (startIdx === -1) throw new Error("docs/agents.md: no '## hs-reviewer' section found");
const nextIdx = agentsDoc.indexOf("\n## ", startIdx + 1);
const section = agentsDoc.slice(startIdx + 1, nextIdx === -1 ? undefined : nextIdx).trim();
const frontmatter = `---
name: hs-reviewer
description: Independent code-review subagent for the harness — evaluates a diff against a spec across correctness, security, performance, quality, and test coverage.
tools: Read, Grep, Glob, Bash
---

`;
const target = join(root, "agents", "hs-reviewer.md");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${frontmatter}<!-- GENERATED from docs/agents.md's "## hs-reviewer" section; run node scripts/generate-claude-reviewer.mjs -->\n\n${section}\n`);
