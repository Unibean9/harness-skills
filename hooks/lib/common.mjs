// Shared helpers for the harness's hook scripts. Not a hook itself -- nothing
// here is wired to an agent event directly, it's just what the actual hook
// entry points (privacy-block.mjs, ship-gate.mjs, session-state.mjs,
// monitoring.mjs) import so each of them stays a few lines of concern-specific
// logic instead of re-implementing stdin/JSON/glob handling four times.
import { existsSync, readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", ".."); // hooks/lib -> hooks -> repo root

export function findSettingsPath() {
  const cwdCandidate = join(process.cwd(), "hs.settings.json");
  if (existsSync(cwdCandidate)) return cwdCandidate;
  // Fallback for testing this hook straight from the harness repo, outside
  // any installed project -- real installs run with cwd at the project root.
  return join(REPO_ROOT, "hs.settings.json");
}

export function loadSettings() {
  const path = findSettingsPath();
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8"));
}

export function readStdinJson() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      if (!data.trim()) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + escaped + "$");
}

export function matchesAny(value, patterns) {
  const base = basename(value);
  return patterns.some((p) => {
    const re = globToRegExp(p);
    return re.test(value) || re.test(base) || value.includes(p);
  });
}

export function appendAuditLine(logFile, line) {
  mkdirSync(dirname(logFile), { recursive: true });
  appendFileSync(logFile, line + "\n");
}

export function nowIso() {
  return new Date().toISOString();
}

export function block(reason) {
  process.stderr.write(reason + "\n");
  process.exit(2);
}

export function allow() {
  process.exit(0);
}
