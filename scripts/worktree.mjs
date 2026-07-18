import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

export function fingerprintWorktree(root = process.cwd()) {
  const run = (args) => spawnSync("git", args, { cwd: root, encoding: null });
  const head = run(["rev-parse", "HEAD"]);
  const productPathspec = ["--", ".", ":(exclude).harness", ":(exclude).harness/**"];
  const status = run(["status", "--porcelain=v1", "-z", "-uall", ...productPathspec]);
  const diff = run(["diff", "HEAD", "--binary", ...productPathspec]);
  if (head.status !== 0 || status.status !== 0 || diff.status !== 0) {
    throw new Error("cannot fingerprint git worktree");
  }

  const hash = createHash("sha256");
  const headText = Buffer.from(head.stdout || []).toString("utf8").trim();
  const statusText = Buffer.from(status.stdout || []).toString("utf8");
  hash.update(`${headText}\n`);
  hash.update(status.stdout || Buffer.alloc(0));
  hash.update(diff.stdout || Buffer.alloc(0));
  const untracked = statusText
    .split("\0")
    .filter((record) => record.startsWith("?? "))
    .map((record) => record.slice(3))
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
