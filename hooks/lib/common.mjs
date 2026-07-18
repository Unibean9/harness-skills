// Shared helpers for the harness's hook scripts. Not a hook itself -- nothing
// here is wired to an agent event directly, it's just what the actual hook
// entry points (privacy-block.mjs, ship-gate.mjs, session-state.mjs,
// monitoring.mjs) import so each of them stays a few lines of concern-specific
// logic instead of re-implementing stdin/JSON/glob handling four times.
import { existsSync, readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", ".."); // hooks/lib -> hooks -> repo root

export function findProjectRoot(cwd = process.cwd()) {
  let candidate = resolve(cwd);
  while (true) {
    if (existsSync(join(candidate, "hs.settings.json")) || existsSync(join(candidate, ".git"))) {
      return candidate;
    }
    const parent = dirname(candidate);
    if (parent === candidate) return REPO_ROOT;
    candidate = parent;
  }
}

export function findSettingsPath(call = {}) {
  return join(findProjectRoot(call.cwd || process.cwd()), "hs.settings.json");
}

export function loadSettings(call = {}) {
  const path = findSettingsPath(call);
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return { __settingsError: true }; }
}

export function projectPath(call, ...segments) {
  return join(findProjectRoot(call?.cwd || process.cwd()), ...segments);
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
        resolve({ __malformedPayload: true });
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

export function isShipCommand(command) {
  const tokens = String(command || "").trim().split(/\s+/);
  const first = tokens[0];
  if (first === "git") {
    let action;
    for (let i = 1; i < tokens.length; i += 1) {
      if (["-C", "-c", "--git-dir", "--work-tree"].includes(tokens[i])) { i += 1; continue; }
      if (!tokens[i].startsWith("-")) { action = tokens[i]; break; }
    }
    return action === "commit" || action === "push";
  }
  return first === "gh" && tokens.slice(1).filter((token) => !token.startsWith("-")).slice(0, 2).join(" ") === "pr create";
}

export function extractCommand(call) {
  const ti = call.tool_input || {};
  // Claude/Codex nest the command in tool_input; Cursor's beforeShellExecution
  // puts it at the payload's top level instead -- check both shapes.
  return ti.command || ti.cmd || call.command || "";
}

// Cursor's beforeReadFile/afterFileEdit payloads put the path at the top
// level (`file_path`), not nested under tool_input like Claude/Codex.
export function extractCursorPath(call) {
  return call.file_path || "";
}

export function appendAuditLine(logFile, line) {
  mkdirSync(dirname(logFile), { recursive: true });
  appendFileSync(logFile, line + "\n");
}

export function nowIso() {
  return new Date().toISOString();
}

// Exit code 2 = block on Claude Code, Codex, and Cursor alike (Cursor's docs
// state exit 2 is equivalent to `permission: "deny"`) -- the stdout JSON is
// purely additive: Cursor reads it for user_message/agent_message, Claude and
// Codex ignore unrecognized stdout fields on a block (they act on the exit
// code and stderr text instead), so one shape works for all three.
export function block(reason) {
  process.stdout.write(JSON.stringify({ permission: "deny", user_message: reason, agent_message: reason }) + "\n");
  process.stderr.write(reason + "\n");
  process.exit(2);
}

export function allow() {
  process.stdout.write(JSON.stringify({ permission: "allow" }) + "\n");
  process.exit(0);
}
