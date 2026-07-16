import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAttestation, validateAttestation } from "../../scripts/attestation.mjs";

test("attestation binds verification to the selected spec and worktree", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-attest-"));
  mkdirSync(join(root, ".harness", "state"), { recursive: true });
  mkdirSync(join(root, ".harness", "specs", "001-test"), { recursive: true });
  writeFileSync(join(root, ".harness", "state", "current-spec"), "001-test\n");
  execFileSync("git", ["init"], { cwd: root }); writeFileSync(join(root, ".gitignore"), ".harness/\n"); writeFileSync(join(root, "a.txt"), "a"); execFileSync("git", ["add", "."], { cwd: root }); execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "init"], { cwd: root });
  createAttestation(root, ["tests"]); assert.equal(validateAttestation(root), true);
  writeFileSync(join(root, "a.txt"), "changed"); assert.equal(validateAttestation(root), false);
});
