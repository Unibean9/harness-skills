import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { selectActiveSpec } from "../../scripts/state.mjs";
import { specPaths, specRuntimePaths } from "../../scripts/paths.mjs";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const stateCli = join(repo, "scripts/state.mjs");

test("concurrent reservations receive distinct identities without changing active selection", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-state-"));
  mkdirSync(join(root, ".harness", "specs", "001-existing"), { recursive: true });
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), "001-existing\n");
  const results = Array.from({ length: 6 }, () => spawnSync(process.execPath, [stateCli, "reserve", "parallel-work"], { cwd: root, encoding: "utf8" }));
  assert.ok(results.every((result) => result.status === 0));
  const identities = results.map((result) => result.stdout.trim());
  assert.equal(new Set(identities).size, identities.length);
  assert.ok(identities.every((identity) => /^\d{3,}-parallel-work$/.test(identity) && existsSync(join(root, ".harness", "specs", identity))));
  assert.equal(readFileSync(join(root, ".harness", "state", "current-spec"), "utf8"), "001-existing\n");
});

test("active selection validates identity and refuses silent replacement", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-active-"));
  mkdirSync(join(root, ".harness", "specs", "001-one"), { recursive: true });
  mkdirSync(join(root, ".harness", "specs", "002-two"), { recursive: true });
  selectActiveSpec("001-one", root);
  assert.equal(readFileSync(join(root, ".harness", "state", "current-spec"), "utf8"), "001-one\n");
  assert.throws(() => selectActiveSpec("002-two", root), /already 001-one/);
  assert.throws(() => selectActiveSpec("bad", root), /invalid/);
  selectActiveSpec("002-two", root, { replace: true });
  assert.equal(readFileSync(join(root, ".harness", "state", "current-spec"), "utf8"), "002-two\n");
});

test("runtime paths require an explicit valid spec and stay outside durable history", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-runtime-path-"));
  mkdirSync(join(root, ".harness", "specs", "001-one"), { recursive: true });
  assert.equal(specRuntimePaths(root, "001-one").dir, join(root, ".harness", "state", "specs", "001-one"));
  assert.equal(specPaths(root, "001-one").spec, join(root, ".harness", "specs", "001-one", "spec.md"));
  assert.equal(specRuntimePaths(root, "001-one").checks, join(root, ".harness", "state", "specs", "001-one", "checks"));
  assert.throws(() => specRuntimePaths(root, "bad"), /invalid spec identity/);
  assert.throws(() => specRuntimePaths(root, "002-missing"), /does not exist/);
});

test("explicit runtime identity is stable when active selection changes", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-explicit-runtime-"));
  mkdirSync(join(root, ".harness", "specs", "001-one"), { recursive: true });
  mkdirSync(join(root, ".harness", "specs", "002-two"), { recursive: true });
  selectActiveSpec("001-one", root);
  const one = specRuntimePaths(root, "001-one").dir;
  selectActiveSpec("002-two", root, { replace: true });
  assert.equal(specRuntimePaths(root, "001-one").dir, one);
  assert.notEqual(specRuntimePaths(root, "002-two").dir, one);
});
