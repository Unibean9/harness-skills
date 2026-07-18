import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

export function fingerprintWorktree(root = process.cwd()) {
  const run = (args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  const head = run(["rev-parse", "HEAD"]);
  const status = run(["status", "--porcelain", "-uall"]);
  const diff = run(["diff", "HEAD", "--binary"]);
  if (head.status !== 0 || status.status !== 0 || diff.status !== 0) {
    throw new Error("cannot fingerprint git worktree");
  }

  const hash = createHash("sha256");
  hash.update(`${head.stdout.trim()}\n${status.stdout}\n${diff.stdout}`);
  const untracked = status.stdout
    .split("\n")
    .filter((line) => line.startsWith("?? "))
    .map((line) => line.slice(3).trim())
    .sort();
  for (const file of untracked) {
    try {
      hash.update(`\0${file}\0${readFileSync(join(root, file))}`);
    } catch {
      hash.update(`\0${file}\0<unreadable>`);
    }
  }
  return hash.digest("hex");
}
