#!/usr/bin/env node
// Generates the hs-scout / hs-reviewer subagent definitions for whichever
// agent CLI is asking, from the single source of truth in docs/agents.md.
// Editing docs/agents.md and regenerating is how these stay in sync across
// four incompatible file formats -- never hand-edit a generated file, it's
// overwritten on the next run.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(join(fileURLToPath(import.meta.url), "..", ".."));

// `lightweight: true` means "run this on the cheapest model that can still
// read and summarize" -- only Claude gets a concrete model id (haiku) because
// model names are vendor-specific; other CLIs get a comment telling the user
// to pick their own lightweight tier instead of inheriting a Claude model id.
const SUBAGENTS = {
  "hs-scout": {
    description: "Cheap, fast context-gathering subagent for the harness.",
    claudeTools: "Read, Grep, Glob, WebFetch, WebSearch",
    lightweight: true,
    claudeModel: "haiku",
  },
  "hs-reviewer": {
    description: "Independent code-review subagent for the harness — evaluates a diff against a spec across correctness, security, performance, quality, and test coverage.",
    claudeTools: "Read, Grep, Glob, Bash",
    lightweight: false,
    claudeModel: null,
  },
};

const LIGHTWEIGHT_NOTE = "pick your CLI's cheapest model that can still read and summarize; hs-scout is retrieval-only";

function extractSection(agentsDoc, name) {
  const startIdx = agentsDoc.indexOf(`\n## ${name}`);
  if (startIdx === -1) throw new Error(`docs/agents.md: no '## ${name}' section found`);
  const nextIdx = agentsDoc.indexOf("\n## ", startIdx + 1);
  return agentsDoc.slice(startIdx + 1, nextIdx === -1 ? undefined : nextIdx).trim();
}

function writeGenerated(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}

function renderClaude(name, section, info) {
  const lines = ["---", `name: ${name}`, `description: ${info.description}`, `tools: ${info.claudeTools}`];
  if (info.claudeModel) lines.push(`model: ${info.claudeModel}`);
  lines.push("---", "");
  return `${lines.join("\n")}\n<!-- GENERATED from docs/agents.md's "## ${name}" section; run \`npm exec -- hs agents --target claude\` -->\n\n${section}\n`;
}

function renderGemini(name, section, info) {
  const lines = ["---", `name: ${name}`, `description: ${info.description}`];
  lines.push("---", "");
  const note = info.lightweight ? `<!-- model intentionally unset: ${LIGHTWEIGHT_NOTE} -->\n` : "";
  return `${lines.join("\n")}\n<!-- GENERATED from docs/agents.md's "## ${name}" section; run \`npm exec -- hs agents --target gemini\` -->\n${note}\n${section}\n`;
}

function renderCursor(name, section, info) {
  const lines = ["---", `name: ${name}`, `description: ${info.description}`, "readonly: true"];
  lines.push("---", "");
  const note = info.lightweight ? `<!-- model intentionally unset: ${LIGHTWEIGHT_NOTE} -->\n` : "";
  return `${lines.join("\n")}\n<!-- GENERATED from docs/agents.md's "## ${name}" section; run \`npm exec -- hs agents --target cursor\` -->\n${note}\n${section}\n`;
}

function tomlString(text) {
  return text.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');
}

function renderCodex(name, section, info) {
  const lines = [`name = "${name}"`, `description = "${info.description.replace(/"/g, '\\"')}"`];
  if (info.lightweight) lines.push(`# model intentionally unset: ${LIGHTWEIGHT_NOTE}`);
  lines.push('developer_instructions = """', tomlString(section), '"""');
  return `${lines.join("\n")}\n`;
}

const RENDERERS = {
  claude: { render: renderClaude, extension: "md", defaultOut: () => join(process.cwd(), ".claude", "agents") },
  gemini: { render: renderGemini, extension: "md", defaultOut: () => join(process.cwd(), ".gemini", "agents") },
  cursor: { render: renderCursor, extension: "md", defaultOut: () => join(process.cwd(), ".cursor", "agents") },
  codex: { render: renderCodex, extension: "toml", defaultOut: () => join(process.cwd(), ".codex", "agents") },
};

export function generateAgents({ target = "all", outDir } = {}) {
  const agentsDoc = readFileSync(join(packageRoot, "docs", "agents.md"), "utf8");
  const targets = target === "all" ? Object.keys(RENDERERS) : [target];
  const written = [];
  for (const key of targets) {
    const renderer = RENDERERS[key];
    if (!renderer) throw new Error(`unknown agent target: ${key}`);
    const dir = outDir || renderer.defaultOut();
    for (const [name, info] of Object.entries(SUBAGENTS)) {
      const section = extractSection(agentsDoc, name);
      const content = renderer.render(name, section, info);
      written.push(writeGenerated(join(dir, `${name}.${renderer.extension}`), content));
    }
  }
  return written;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf("--target");
  const outIndex = args.indexOf("--out");
  try {
    const target = targetIndex !== -1 ? args[targetIndex + 1] : "all";
    const outDir = outIndex !== -1 ? resolve(args[outIndex + 1]) : undefined;
    for (const path of generateAgents({ target, outDir })) console.log(`wrote ${path}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
