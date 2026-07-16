import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { selectActiveSpec } from "../../scripts/state.mjs";

const repo = new URL("../..", import.meta.url).pathname.slice(1);
const reserve = join(repo, "scripts/next-spec-id.mjs");

test("concurrent reservations receive distinct identities without changing active selection", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-state-"));
  mkdirSync(join(root, ".harness", "specs", "001-existing"), { recursive: true });
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), "001-existing\n");
  const results = Array.from({ length: 6 }, () => spawnSync(process.execPath, [reserve, "parallel-work"], { cwd: root, encoding: "utf8" }));
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
