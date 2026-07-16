import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";

// Lints every skills/*/SKILL.md against this repo's skill anatomy, so a
// future edit can't silently drop the frontmatter contract or one of the
// sections the harness's behavior depends on.

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillsDir = join(repo, "skills");
const skillNames = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_SKILL_LINES = 500;
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// The description must say when to trigger, not just what the skill does.
const DESCRIPTION_TRIGGER = /\buse (this )?(when|whenever|once|after|right after|before|during)\b/i;
const REQUIRED_SECTIONS = ["## Why this phase exists", "## Process", "## Exit condition", "## Common failure modes", "## Common rationalizations"];

test("every skill passes the anatomy lint", () => {
  assert.ok(skillNames.length >= 5, "expected the five harness skills");
  for (const name of skillNames) {
    const file = join(skillsDir, name, "SKILL.md");
    assert.ok(existsSync(file), `${name}: SKILL.md missing`);
    const text = readFileSync(file, "utf8");

    assert.match(name, KEBAB_CASE, `${name}: directory must be kebab-case`);
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatter, `${name}: YAML frontmatter missing`);
    const fmName = frontmatter[1].match(/^name:\s*(\S+)/m)?.[1];
    assert.equal(fmName, name, `${name}: frontmatter name must match directory`);
    const description = frontmatter[1].match(/^description:\s*(.+(?:\n(?![a-z-]+:).+)*)/m)?.[1];
    assert.ok(description, `${name}: frontmatter description missing`);
    assert.ok(description.length <= MAX_DESCRIPTION_LENGTH, `${name}: description exceeds ${MAX_DESCRIPTION_LENGTH} chars`);
    assert.match(description, DESCRIPTION_TRIGGER, `${name}: description must include a "use when"-style trigger`);

    for (const section of REQUIRED_SECTIONS) {
      assert.ok(text.includes(section), `${name}: missing required section "${section}"`);
    }
    const lines = text.split("\n").length;
    assert.ok(lines <= MAX_SKILL_LINES, `${name}: ${lines} lines exceeds the ${MAX_SKILL_LINES}-line budget`);
  }
});
