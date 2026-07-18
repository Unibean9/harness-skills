import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fingerprintWorktree } from "./worktree.mjs";
import { resolveSpecIdentity, specPaths } from "./paths.mjs";

const productPathspec = ["--", ".", ":(exclude).harness", ":(exclude).harness/**"];
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: null });
  if (result.status !== 0) throw new Error(`git command failed: ${args.join(" ")}`);
  return Buffer.from(result.stdout || []);
}

function parseNameStatus(buffer, kind) {
  const values = buffer.toString("utf8").split("\0").filter(Boolean);
  const entries = [];
  for (let index = 0; index < values.length; index += 1) {
    const status = values[index];
    if (status.startsWith("R") || status.startsWith("C")) {
      const originalPath = values[++index]; const path = values[++index];
      if (!originalPath || !path) throw new Error("malformed rename/copy status output");
      entries.push({ status, kind, path, originalPath });
    } else {
      const path = values[++index];
      if (!path) throw new Error("malformed name-status output");
      entries.push({ status, kind, path, originalPath: null });
    }
  }
  return entries;
}

function literal(path) { return `:(literal)${path}`; }
function patchDigest(root, args, entry) {
  const paths = [literal(entry.path)];
  if (entry.originalPath) paths.push(literal(entry.originalPath));
  return digest(git(root, [...args, "--", ...paths]));
}
function decorate(root, entries, patchArgs) {
  return entries.map((entry) => ({ ...entry, digest: patchDigest(root, patchArgs, entry) }))
    .sort((left, right) => `${left.path}\0${left.status}`.localeCompare(`${right.path}\0${right.status}`));
}
function untracked(root) {
  const paths = git(root, ["ls-files", "--others", "--exclude-standard", "-z", ...productPathspec]).toString("utf8").split("\0").filter(Boolean).sort();
  return paths.map((path) => {
    const result = spawnSync("git", ["hash-object", "--", path], { cwd: root, encoding: "utf8" });
    if (result.status !== 0 || !result.stdout.trim()) throw new Error(`cannot hash untracked product file: ${path}`);
    return { status: "??", kind: "untracked", path, originalPath: null, digest: `sha256:${result.stdout.trim()}` };
  });
}

export function inspectProductSnapshot(root = process.cwd()) {
  const baseCommit = git(root, ["rev-parse", "--verify", "HEAD"]).toString("utf8").trim();
  const staged = decorate(root, parseNameStatus(git(root, ["diff", "--cached", "--name-status", "-z", "--find-renames", "HEAD", ...productPathspec]), "staged"), ["diff", "--cached", "--binary", "HEAD"]);
  const unstaged = decorate(root, parseNameStatus(git(root, ["diff", "--name-status", "-z", "--find-renames", ...productPathspec]), "unstaged"), ["diff", "--binary"]);
  const untrackedEntries = untracked(root);
  const snapshotId = digest(JSON.stringify({ baseCommit, staged, unstaged, untracked: untrackedEntries }));
  return { version: 1, baseCommit, fingerprint: fingerprintWorktree(root), capturedAt: new Date().toISOString(), staged, unstaged, untracked: untrackedEntries, snapshotId };
}

export function capturePlanChangeset(root = process.cwd(), explicitSpec, { expectedBaseCommit, preexistingPaths = [], source = "captured-before-build", overwrite = false } = {}) {
  const spec = resolveSpecIdentity(root, explicitSpec);
  const snapshot = inspectProductSnapshot(root);
  if (expectedBaseCommit && snapshot.baseCommit !== expectedBaseCommit) throw new Error("current HEAD does not match the expected plan base commit");
  const { changeset } = specPaths(root, spec);
  if (existsSync(changeset) && !overwrite) throw new Error("changeset snapshot already exists; refuse to overwrite it");
  const value = { ...snapshot, spec, source, preexistingPaths: [...new Set(preexistingPaths)].sort() };
  mkdirSync(dirname(changeset), { recursive: true });
  const temporary = `${changeset}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value)}\n`);
  if (overwrite && existsSync(changeset)) rmSync(changeset, { force: true });
  renameSync(temporary, changeset);
  return value;
}

export function loadPlanChangeset(root = process.cwd(), explicitSpec) {
  const spec = resolveSpecIdentity(root, explicitSpec); const { changeset } = specPaths(root, spec);
  if (!existsSync(changeset)) throw new Error(`missing changeset snapshot: ${changeset}`);
  try {
    const value = JSON.parse(readFileSync(changeset, "utf8"));
    if (value?.version !== 1 || value.spec !== spec || typeof value.snapshotId !== "string") throw new Error("invalid changeset snapshot");
    return value;
  } catch (error) { throw new Error(`invalid changeset snapshot: ${error.message}`); }
}

const allEntries = (value) => [...value.staged, ...value.unstaged, ...value.untracked];
export function comparePlanChangeset(root = process.cwd(), explicitSpec) {
  const initial = loadPlanChangeset(root, explicitSpec); const current = inspectProductSnapshot(root);
  const initialByKey = new Map(allEntries(initial).map((entry) => [`${entry.kind}\0${entry.path}`, entry]));
  const currentByKey = new Map(allEntries(current).map((entry) => [`${entry.kind}\0${entry.path}`, entry]));
  const unchanged = []; const changed = []; const missing = [];
  for (const path of initial.preexistingPaths) {
    const before = allEntries(initial).filter((entry) => entry.path === path); const after = allEntries(current).filter((entry) => entry.path === path);
    if (!after.length) missing.push(path);
    else if (before.length !== after.length || before.some((entry) => !after.some((candidate) => candidate.kind === entry.kind && candidate.digest === entry.digest))) changed.push(path);
    else unchanged.push(path);
  }
  const introducedPaths = [...currentByKey].filter(([key]) => !initialByKey.has(key)).map(([, entry]) => entry.path).sort();
  const reviewPaths = [...new Set([...introducedPaths, ...changed])].sort();
  const changesetId = digest(JSON.stringify({ spec: initial.spec, baseCommit: initial.baseCommit, initialSnapshotId: initial.snapshotId, currentSnapshotId: current.snapshotId, fingerprint: current.fingerprint }));
  return { baseCommit: initial.baseCommit, headCommit: current.baseCommit, headMatchesBase: initial.baseCommit === current.baseCommit, currentSnapshotId: current.snapshotId, changesetId, preExisting: { unchanged, changed, missing }, introducedPaths, reviewPaths, safeForReview: !changed.length && !missing.length, fingerprint: current.fingerprint };
}

export const currentChangesetIdentity = comparePlanChangeset;
export const captureChangeset = inspectProductSnapshot;
export const writeChangeset = capturePlanChangeset;
export const loadChangeset = loadPlanChangeset;
