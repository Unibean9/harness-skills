import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { checksForStage, loadVerifyManifestV2, manifestDigest } from "./verify-manifest.mjs";
import { runCheck } from "./run-check.mjs";

export function executeArgv(argv, { root = process.cwd() } = {}) {
  let executable = argv[0];
  let arguments_ = argv.slice(1);
  if (process.platform === "win32" && argv[0] === "npm") {
    const npmCli = join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
    if (existsSync(npmCli)) {
      executable = process.execPath;
      arguments_ = [npmCli, ...arguments_];
    }
  }
  return spawnSync(executable, arguments_, { cwd: root, encoding: "utf8", shell: false });
}

export function runVerificationStage(root = process.cwd(), spec, stage, { executor = executeArgv, recordEvidence = false } = {}) {
  const document = loadVerifyManifestV2(root, spec);
  const results = checksForStage(document, stage).map((check) => {
    if (check.kind !== "machine") return { label: check.label, kind: check.kind, skipped: "manual" };
    if (recordEvidence) {
      const evidence = runCheck(root, { spec, stage, label: check.label });
      return { label: check.label, kind: check.kind, argv: check.argv, covers: check.covers, exitCode: evidence.exitCode, pass: evidence.pass, output: "" };
    }
    const result = executor(check.argv, { root });
    return { label: check.label, kind: check.kind, argv: check.argv, covers: check.covers, exitCode: result.status ?? 1, pass: result.status === 0, output: `${result.stdout || ""}${result.stderr || ""}` };
  });
  return { version: 2, spec, stage, manifestDigest: manifestDigest(document), checks: results, pass: results.filter((result) => result.kind === "machine").every((result) => result.pass), manualRequired: results.filter((result) => result.kind === "manual").map((result) => result.label) };
}

export const runVerification = runVerificationStage;

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [specFlag, spec, stageFlag, stage] = process.argv.slice(2);
  try {
    if (specFlag !== "--spec" || !spec || stageFlag !== "--stage" || !stage || process.argv.length !== 6) throw new Error("usage: verification-runner.mjs --spec <id> --stage <baseline|final>");
    const result = runVerificationStage(process.cwd(), spec, stage, { recordEvidence: true });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!result.pass) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
