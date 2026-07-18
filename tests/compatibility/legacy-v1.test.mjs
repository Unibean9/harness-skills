import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inspectVerifyManifest } from "../../scripts/verify-manifest.mjs";
import { validateAttestationV2 } from "../../scripts/attestation.mjs";
import { detectSpecVersion } from "../../scripts/paths.mjs";

test("legacy v1 history is readable but cannot become v2 evidence", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-legacy-")); const spec = "001-legacy"; const dir = join(root, ".harness", "specs", spec);
  mkdirSync(join(dir, "state"), { recursive: true });
  writeFileSync(join(dir, "verify.json"), JSON.stringify({ version: 1, checks: [{ label: "verify-tests", kind: "machine", argv: ["node", "--version"] }] }));
  writeFileSync(join(dir, "state", "verify-tests.status"), "PASS\n");
  const manifest = inspectVerifyManifest(root, spec);
  assert.equal(manifest.kind, "legacy-v1"); assert.match(manifest.instruction, /read-only/);
  assert.equal(detectSpecVersion(root, spec).evidenceTrusted, false);
  assert.equal(validateAttestationV2(root, spec), false);
});
