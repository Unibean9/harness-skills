#!/usr/bin/env node
// Optional evidence helper. It never runs checks or changes phase state.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function fingerprintWorktree(root = process.cwd()) {
  const git = (args) => spawnSync("git", args, { cwd: root, encoding: null });
  const product = ["--", ".", ":(exclude).harness", ":(exclude).harness/**"];
  const head = git(["rev-parse", "HEAD"]);
  const status = git(["status", "--porcelain=v1", "-z", "-uall", ...product]);
  const diff = git(["diff", "HEAD", "--binary", ...product]);
  if (head.status !== 0 || status.status !== 0 || diff.status !== 0) throw new Error("cannot fingerprint git worktree");

  const hash = createHash("sha256");
  hash.update(`${Buffer.from(head.stdout || []).toString("utf8").trim()}\n`);
  hash.update(status.stdout || Buffer.alloc(0));
  hash.update(diff.stdout || Buffer.alloc(0));
  const untracked = Buffer.from(status.stdout || []).toString("utf8").split("\0")
    .filter((line) => line.startsWith("?? ")).map((line) => line.slice(3)).sort();
  for (const file of untracked) {
    try { hash.update(`\0${file}\0${readFileSync(join(root, file))}`); }
    catch { hash.update(`\0${file}\0<unreadable>`); }
  }
  return hash.digest("hex");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try { console.log(fingerprintWorktree()); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
