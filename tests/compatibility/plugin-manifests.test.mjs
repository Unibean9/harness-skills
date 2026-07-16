import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (path) => readFileSync(join(repo, path), "utf8");
const readJson = (path) => JSON.parse(read(path));

test("Claude Code plugin manifest omits skills/hooks so it relies on root-convention auto-discovery", () => {
  const manifest = readJson(".claude-plugin/plugin.json");
  assert.equal(manifest.name, "harness-skills");
  assert.ok(manifest.version);
  assert.equal(manifest.skills, undefined);
  assert.equal(manifest.hooks, undefined);
});

test("Claude Code marketplace manifest points at this repo and matches the plugin version", () => {
  const manifest = readJson(".claude-plugin/plugin.json");
  const marketplace = readJson(".claude-plugin/marketplace.json");
  const entry = marketplace.plugins.find((p) => p.name === "harness-skills");
  assert.ok(entry, "marketplace.json must list the harness-skills plugin");
  assert.equal(entry.version, manifest.version);
  assert.equal(entry.source, "./");
});

test("the vendor-neutral dev marketplace mirrors the Claude Code one", () => {
  const claude = readJson(".claude-plugin/marketplace.json");
  const vendorNeutral = readJson(".agents/plugins/marketplace.json");
  assert.equal(vendorNeutral.plugins[0].name, claude.plugins[0].name);
  assert.equal(vendorNeutral.plugins[0].version, claude.plugins[0].version);
});

test("Codex plugin manifest declares skills and suppresses hook auto-discovery", () => {
  const manifest = readJson(".codex-plugin/plugin.json");
  assert.equal(manifest.skills, "./skills/");
  assert.deepEqual(manifest.hooks, {});
});

test("Cursor plugin manifest declares skill discovery only (no unverified hook wiring)", () => {
  const manifest = readJson(".cursor-plugin/plugin.json");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.hooks, undefined);
});

test("Gemini extension manifest exists, points at GEMINI.md, and matches the plugin version", () => {
  const claude = readJson(".claude-plugin/plugin.json");
  const manifest = readJson("gemini-extension.json");
  assert.equal(manifest.name, "harness-skills");
  assert.equal(manifest.version, claude.version);
  assert.equal(manifest.contextFileName, "GEMINI.md");
});

test("Claude Code's root hooks.json references the plugin-root variable, not the project-root one", () => {
  const hooksJson = read("hooks/hooks.json");
  assert.match(hooksJson, /\$\{CLAUDE_PLUGIN_ROOT\}/);
  assert.doesNotMatch(hooksJson, /CLAUDE_PROJECT_DIR/);
});

// Mirrors the section-extraction logic in scripts/generate-claude-*.mjs, so
// this test catches drift between the generator and its own generated output
// without duplicating the generator's file-writing side effects.
function extractSection(doc, heading) {
  const startIdx = doc.indexOf(`\n${heading}`);
  if (startIdx === -1) return null;
  const nextIdx = doc.indexOf("\n## ", startIdx + 1);
  return doc.slice(startIdx + 1, nextIdx === -1 ? undefined : nextIdx).trim();
}

test("the Claude scout adapter is generated from docs/agents.md's hs-scout section", () => {
  const generator = read("scripts/generate-claude-scout.mjs");
  const adapter = read("agents/hs-scout.md");
  const agentsDoc = read("docs/agents.md");
  const section = extractSection(agentsDoc, "## hs-scout");
  assert.match(generator, /"docs", "agents\.md"/);
  assert.match(adapter, /GENERATED from docs\/agents\.md's "## hs-scout" section/);
  assert.ok(section && adapter.endsWith(`${section}\n`));
});

test("the Claude reviewer adapter is generated from docs/agents.md's hs-reviewer section", () => {
  const generator = read("scripts/generate-claude-reviewer.mjs");
  const adapter = read("agents/hs-reviewer.md");
  const agentsDoc = read("docs/agents.md");
  const section = extractSection(agentsDoc, "## hs-reviewer");
  assert.match(generator, /"docs", "agents\.md"/);
  assert.match(adapter, /GENERATED from docs\/agents\.md's "## hs-reviewer" section/);
  assert.ok(section && adapter.endsWith(`${section}\n`));
});
