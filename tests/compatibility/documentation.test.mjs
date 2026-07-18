import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (path) => readFileSync(join(repo, path), "utf8");

test("README publishes the four-agent compatibility contract and portable commands", () => {
  const readme = read("README.md");
  for (const agent of ["Claude Code", "Codex CLI", "Gemini CLI", "Cursor"]) assert.match(readme, new RegExp(`\\|\\s*${agent}\\s*\\|`));
  assert.match(readme, /npm exec -- hs/);
  assert.match(readme, /Node-native/);
  assert.match(readme, /plugin marketplace add/);
  assert.match(readme, /privacy is a guardrail, not a complete privacy boundary/);
});

test("hook documentation agrees with shipped adapter event and matcher names", () => {
  const docs = read("hooks/README.md");
  const codex = read("hooks/codex/hooks.json.snippet");
  const gemini = read("hooks/gemini/settings.snippet.json");
  assert.match(docs, /Bash\|apply_patch/);
  assert.match(docs, /read_file\|write_file\|replace\|run_shell_command/);
  assert.match(docs, /Node\.js on `PATH`/);
  assert.match(docs, /Git on `PATH`/);
  assert.match(codex, /Bash\|apply_patch/);
  assert.match(gemini, /read_file\|write_file\|replace\|run_shell_command/);
});

test("all agent entry points delegate to the canonical project instructions", () => {
  assert.match(read("CLAUDE.md"), /AGENTS\.md/);
  assert.match(read("GEMINI.md"), /AGENTS\.md/);
  assert.match(read("AGENTS.md"), /Skills work fully\s+without hooks/);
});
