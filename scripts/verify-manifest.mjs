import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LABEL = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function verifyManifestPath(root, spec) {
  return join(root, ".harness", "specs", spec, "verify.json");
}

export function validateVerifyManifest(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.checks) || !value.checks.length) {
    throw new Error("verify manifest must be version 1 with at least one check");
  }
  const labels = new Set();
  for (const check of value.checks) {
    if (!check || typeof check !== "object" || !LABEL.test(check.label || "") || labels.has(check.label)) {
      throw new Error("verify manifest check labels must be unique kebab-case strings");
    }
    labels.add(check.label);
    if (check.kind === "machine") {
      if (!Array.isArray(check.argv) || !check.argv.length || !check.argv.every((arg) => typeof arg === "string" && arg.length)) {
        throw new Error(`machine check '${check.label}' requires a non-empty argv array`);
      }
    } else if (check.kind === "manual") {
      if (check.argv !== null) throw new Error(`manual check '${check.label}' must use argv: null`);
    } else {
      throw new Error(`check '${check.label}' kind must be machine or manual`);
    }
  }
  return value.checks.map((check) => ({ label: check.label, kind: check.kind, argv: check.argv }));
}

export function loadVerifyManifest(root, spec) {
  const file = verifyManifestPath(root, spec);
  if (!existsSync(file)) throw new Error(`missing verify manifest: ${file}`);
  try {
    return validateVerifyManifest(JSON.parse(readFileSync(file, "utf8")));
  } catch (error) {
    throw new Error(`invalid verify manifest: ${error.message}`);
  }
}
