import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCheckStateDir } from "./state.mjs";

const maxAgeMs = 24 * 60 * 60 * 1000;
const statePath = (root) => join(root, ".harness", "state");
const activeSpec = (root) => readFileSync(join(statePath(root), "current-spec"), "utf8").trim();
function fingerprint(root) {
  const run = (args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  const head = run(["rev-parse", "HEAD"]); const status = run(["status", "--porcelain"]);
  if (head.status !== 0 || status.status !== 0) throw new Error("cannot fingerprint git worktree");
  return createHash("sha256").update(`${head.stdout.trim()}\n${status.stdout}`).digest("hex");
}
export function createAttestation(root = process.cwd(), checks = []) {
  const spec = activeSpec(root);
  if (!existsSync(join(root, ".harness", "specs", spec))) throw new Error("active spec is missing");
  const record = { version: 1, spec, createdAt: new Date().toISOString(), fingerprint: fingerprint(root), checks };
  writeFileSync(join(statePath(root), "verify-all.json"), `${JSON.stringify(record)}\n`);
  writeFileSync(join(statePath(root), "verify-all.status"), "PASS\n");
  return record;
}
export function validateAttestation(root = process.cwd()) {
  const file = join(statePath(root), "verify-all.json");
  try {
    const value = JSON.parse(readFileSync(file, "utf8"));
    if (value.version !== 1 || value.spec !== activeSpec(root) || !Array.isArray(value.checks) || !value.checks.length) return false;
    if (Date.now() - Date.parse(value.createdAt) > maxAgeMs) return false;
    return value.fingerprint === fingerprint(root);
  } catch { return false; }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [action, ...checks] = process.argv.slice(2);
  try {
    if (action === "attest" && checks.length) {
      const checkDir = resolveCheckStateDir(process.cwd());
      const failed = checks.filter((label) => readFileSync(join(checkDir, `${label}.status`), "utf8").trim() !== "PASS");
      if (failed.length) throw new Error(`cannot attest, not PASS: ${failed.join(", ")}`);
      const record = createAttestation(process.cwd(), checks);
      console.log(`attested ${record.spec}: ${checks.join(", ")}`);
    } else if (action === "validate") {
      const ok = validateAttestation(process.cwd());
      console.log(ok ? "VALID" : "INVALID");
      if (!ok) process.exitCode = 1;
    } else {
      throw new Error("usage: attestation.mjs attest <check-label...> | validate");
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
