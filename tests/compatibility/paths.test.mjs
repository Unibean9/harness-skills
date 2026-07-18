import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { specPaths, specRuntimePaths } from "../../scripts/paths.mjs";

test("runtime paths require an explicit valid spec and stay outside durable history", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-runtime-path-"));
  mkdirSync(join(root, ".harness", "specs", "001-one"), { recursive: true });
  assert.equal(specRuntimePaths(root, "001-one").dir, join(root, ".harness", "state", "specs", "001-one"));
  assert.equal(specPaths(root, "001-one").spec, join(root, ".harness", "specs", "001-one", "spec.md"));
  assert.equal(specRuntimePaths(root, "001-one").checks, join(root, ".harness", "state", "specs", "001-one", "checks"));
  assert.throws(() => specRuntimePaths(root, "bad"), /invalid spec identity/);
  assert.throws(() => specRuntimePaths(root, "002-missing"), /does not exist/);
});
