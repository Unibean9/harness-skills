#!/usr/bin/env node
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function commandMap(root) {
  const source = readFileSync(join(root, "bin", "hs.mjs"), "utf8");
  const block = source.match(/const commands = \{([\s\S]*?)\};/);
  if (!block) throw new Error("bin/hs.mjs: could not find its command map");
  return new Set([...block[1].matchAll(/(?:"([a-z-]+)"|([a-z-]+))\s*:/g)].map((match) => match[1] || match[2]));
}

export function validateSkills(root = process.cwd()) {
  const skills = join(root, "skills");
  const failures = [];
  const commands = commandMap(root);
  for (const entry of readdirSync(skills, { withFileTypes: true }).filter((item) => item.isDirectory())) {
    const dir = join(skills, entry.name);
    const file = join(dir, "SKILL.md");
    const text = readFileSync(file, "utf8"); const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatter) { failures.push(`${entry.name}: missing frontmatter`); continue; }
    const keys = [...frontmatter[1].matchAll(/^([a-z_]+):/gm)].map((match) => match[1]);
    if (keys.join(",") !== "name,description") failures.push(`${entry.name}: frontmatter must contain only name and description`);
    if (!frontmatter[1].match(new RegExp(`^name: ${entry.name}$`, "m"))) failures.push(`${entry.name}: name mismatch`);
    if (!frontmatter[1].match(/^description: .+/m)) failures.push(`${entry.name}: missing description`);
    if (!text.includes("npm exec -- hs")) failures.push(`${entry.name}: must use portable hs CLI`);
    if (!text.includes("## Process") || !text.includes("## Exit condition")) failures.push(`${entry.name}: missing workflow sections`);
    if (/\bnode scripts\//.test(text)) failures.push(`${entry.name}: references the internal 'node scripts/*.mjs' path instead of the portable 'npm exec -- hs' CLI`);
    for (const match of text.matchAll(/--\s*hs\s+([a-z][a-z0-9-]*)/g)) {
      if (!commands.has(match[1])) failures.push(`${entry.name}: 'hs ${match[1]}' is not a command bin/hs.mjs defines`);
    }
    for (const match of text.matchAll(/`references\/([\w.-]+)`/g)) {
      if (!existsSync(join(dir, "references", match[1]))) failures.push(`${entry.name}: references/${match[1]} is mentioned but does not exist`);
    }
  }
  if (failures.length) throw new Error(failures.join("\n"));
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try { validateSkills(); console.log("skills valid"); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
