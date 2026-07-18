#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function validateSkills(root = process.cwd()) {
  const skills = join(root, "skills");
  const failures = [];
  for (const entry of readdirSync(skills, { withFileTypes: true }).filter((item) => item.isDirectory())) {
    const file = join(skills, entry.name, "SKILL.md");
    const text = readFileSync(file, "utf8"); const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatter) { failures.push(`${entry.name}: missing frontmatter`); continue; }
    const keys = [...frontmatter[1].matchAll(/^([a-z_]+):/gm)].map((match) => match[1]);
    if (keys.join(",") !== "name,description") failures.push(`${entry.name}: frontmatter must contain only name and description`);
    if (!frontmatter[1].match(new RegExp(`^name: ${entry.name}$`, "m"))) failures.push(`${entry.name}: name mismatch`);
    if (!frontmatter[1].match(/^description: .+/m)) failures.push(`${entry.name}: missing description`);
    if (!text.includes("npm exec -- hs")) failures.push(`${entry.name}: must use portable hs CLI`);
    if (!text.includes("## Process") || !text.includes("## Exit condition")) failures.push(`${entry.name}: missing workflow sections`);
  }
  if (failures.length) throw new Error(failures.join("\n"));
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try { validateSkills(); console.log("skills valid"); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
