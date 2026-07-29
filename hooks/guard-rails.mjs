#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findProjectRoot } from './util.mjs';

const DEFAULT_HOOKS = Object.freeze({ privacy: true, scout: true });
const DEFAULT_ARCHIVE_DIRECTORY = 'plans/archive';
const SENSITIVE_PATH = /(^|[\\/\s'"`])(?:\.env(?:\.[^\\/]+)?|\.npmrc|\.netrc|\.pypirc|\.git-credentials|auth\.json|kubeconfig|id_[a-z0-9_-]*|credentials(?:\.[a-z0-9_-]+)?|secrets?(?:\.[a-z0-9_-]+)?|[^\\/]+\.(?:pem|key|p12|pfx))(?=$|[\\/\s'"`])/i;
const HEAVY_DIRECTORY = /(^|[\\/\s'"`])(node_modules|dist|build|\.next|\.nuxt|coverage|target|vendor|\.venv|venv|__pycache__|\.git)(?=$|[\\/\s'"`])/i;
const ROOT_GLOB = /(?:^|[\s'"`])\*\*\/(?:\*|\*\.[a-z0-9_-]+)(?=$|[\\/\s'"`])/i;
const PARENT_TRAVERSAL = /(?:^|[\\/\s'"`])\.\.(?=$|[\\/])/;
const SAFE_BASH = /^\s*(?:npm\s+(?:run\s+)?(?:build|test)|pnpm\s+(?:run\s+)?(?:build|test)|yarn\s+(?:build|test)|bun\s+(?:run\s+)?(?:build|test)|pytest\b|dotnet\s+test\b|cargo\s+test\b|go\s+test\b|make\b|docker\s+build\b)[\w\s./:=@,\-]*$/i;
// Keys that hold file bodies rather than paths - matching guard-rail patterns inside these
// produces false positives (e.g. a "../db/rooms.js" import line, or "node_modules" in a comment).
const CONTENT_KEYS = new Set([
    'content', 'old_string', 'new_string', 'new_source', 'file_text', 'body',
    'oldText', 'newText', 'old_text', 'new_text', 'text', 'contents',
    'description',
]);
// A commit message is prose about the change, not a path the command touches: a message that
// mentions .hs.json, or "the target project", describes work rather than reading or writing it.
// Only the message payload is stripped, so a write chained after the commit is still scanned.
const GIT_COMMIT = /^\s*git\s+(?:-\S+\s+)*commit\b/;
const HEREDOC_BODY = /<<-?\s*(['"]?)([A-Za-z_]\w*)\1[\s\S]*?\n\s*\2\s*$/m;
const COMMIT_MESSAGE_ARGUMENT = /(?:^|\s)(?:-[A-Za-z]*[mF]|--message|--file)(?:=|\s+)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\S+)/g;
// Tools that never touch the filesystem - their inputs are prose (questions, previews, task
// descriptions), not paths, so scanning them for path patterns only produces false positives.
const NON_FILESYSTEM_TOOLS = new Set([
    'AskUserQuestion',
    'TodoWrite',
    'Task',
    'TaskCreate',
    'TaskUpdate',
    'TaskGet',
    'TaskList',
    'TaskOutput',
    'TaskStop',
    'EnterPlanMode',
    'ExitPlanMode',
    'ScheduleWakeup',
    'SendMessage',
    'WebFetch',
    'WebSearch',
]);
// .hs.json is what privacy/scout read their on/off state from. If an agent could write it
// unattended, it could silently disable its own guard rails. This check is NOT configurable
// through .hs.json (unlike privacy/scout) and always applies. Any Bash command that even
// mentions .hs.json is treated as a potential write, not just ones matching a write-indicator
// denylist - node -e/python -c/git checkout --/truncate/perl -pi style commands can all write
// past a naive denylist undetected. Reads of .hs.json aren't sensitive, so this over-blocks
// `cat .hs.json`-style commands too - the Read tool still works for inspection, and a narrower
// write-only detector is just a smaller, still-incomplete denylist, the same class of gap this
// closes.
// On Claude Code this decision surfaces as a real permissionDecision:'ask' prompt (see main()'s
// platform branch) - Claude Code's own UI gates it, not this script. Codex has no equivalent (its
// PreToolUse hook silently ignores 'ask'), so there it is always a hard block requiring the human
// to edit .hs.json directly, outside the session.
const CONFIG_PATH = /(^|[\\/\s'"`])\.hs\.json(?=$|[\\/\s'"`])/i;
const CONFIG_WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const CONFIG_GUARD_REASON = 'hs-skills config guard: .hs.json controls the guard rails themselves, so the agent may not edit it unattended - even to relax an over-eager rule. Approve this only if you asked for the change. Agent: if the user has not already chosen this edit, cancel and use AskUserQuestion first - state the specific rule that is misfiring and why, then offer concrete options (e.g. "fix the pattern in guard-rails.mjs" vs "disable this hook in .hs.json" vs "leave as-is"). On Codex, or any platform without an interactive prompt, this is a hard block instead: a human must edit .hs.json directly, outside this session.';

// Project-specific directories the user has explicitly cleared for reading (e.g. a vendored
// dependency they actually maintain). Only relaxes the heavy-directory check, never privacy/config.
function readScoutAllowlist(configuredHooks) {
    const allowlist = configuredHooks?.scout?.allowlist;
    if (!Array.isArray(allowlist)) return [];
    return allowlist
        .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
        .map((entry) => entry.trim().replace(/^[\\/]+|[\\/]+$/g, '').toLowerCase());
}

function normalizeArchiveDirectory(value) {
    if (typeof value !== 'string') return DEFAULT_ARCHIVE_DIRECTORY;
    const normalized = value.trim().replace(/\\/g, '/').replace(/^(?:\.\/)+/, '').replace(/^\/+|\/+$/g, '');
    return normalized.length > 0 ? normalized : DEFAULT_ARCHIVE_DIRECTORY;
}

// archiveDirectory is read verbatim from the project's own .hs.json and, under the exit-code
// contract, lands directly in stderr text that Claude Code surfaces to the model as the block
// explanation - a hostile or careless .hs.json could inject instruction-shaped text into that
// reason string. Cap the length and strip anything that isn't a plausible path character before
// it's ever interpolated into a reason string.
function sanitizeArchiveDirectoryForDisplay(archiveDirectory) {
    return archiveDirectory.slice(0, 80).replace(/[^A-Za-z0-9_./\\-]/g, '');
}

// Escapes regex metacharacters, then builds the same boundary wrapper HEAVY_DIRECTORY/CONFIG_PATH
// use - can't be a static top-level RegExp since the directory is user-configurable per project.
// Memoized since evaluateGuardrails runs on every PreToolUse and archiveDirectory rarely changes.
const archiveDirectoryPatternCache = new Map();
function buildArchiveDirectoryPattern(archiveDirectory) {
    const cached = archiveDirectoryPatternCache.get(archiveDirectory);
    if (cached) return cached;
    const escaped = archiveDirectory
        .split('/')
        .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('[\\\\/]');
    const pattern = new RegExp(`(^|[\\\\/\\s'"\`])(${escaped})(?=$|[\\\\/\\s'"\`])`, 'i');
    archiveDirectoryPatternCache.set(archiveDirectory, pattern);
    return pattern;
}

export function readHookConfig(startDirectory = process.cwd()) {
    const root = findProjectRoot(startDirectory);
    if (!root) return { ...DEFAULT_HOOKS, scoutAllowlist: [], archiveDirectory: DEFAULT_ARCHIVE_DIRECTORY };

    try {
        const config = JSON.parse(fs.readFileSync(path.join(root, '.hs.json'), 'utf8'));
        const configuredHooks = config?.guardrails?.hooks;
        return {
            privacy: configuredHooks?.privacy?.enabled ?? DEFAULT_HOOKS.privacy,
            scout: configuredHooks?.scout?.enabled ?? DEFAULT_HOOKS.scout,
            scoutAllowlist: readScoutAllowlist(configuredHooks),
            archiveDirectory: normalizeArchiveDirectory(config?.artifacts?.plans?.archiveDirectory),
        };
    } catch {
        return { ...DEFAULT_HOOKS, scoutAllowlist: [], archiveDirectory: DEFAULT_ARCHIVE_DIRECTORY };
    }
}

function stripCommitMessage(command) {
    if (!GIT_COMMIT.test(command)) return command;
    return command.replace(HEREDOC_BODY, ' ').replace(COMMIT_MESSAGE_ARGUMENT, ' ');
}

function stringifyToolInput(input, depth = 0) {
    if (depth > 8 || input == null) return '';
    if (typeof input === 'string') return input;
    if (typeof input === 'number' || typeof input === 'boolean') return String(input);
    if (Array.isArray(input)) return input.map((value) => stringifyToolInput(value, depth + 1)).join(' ');
    if (typeof input === 'object') {
        return Object.entries(input)
            .filter(([key]) => !CONTENT_KEYS.has(key))
            .map(([, value]) => stringifyToolInput(value, depth + 1))
            .join(' ');
    }
    return '';
}

function block(hook, reason) {
    return { hook, action: 'block', reason };
}

function ask(hook, reason) {
    return { hook, action: 'ask', reason };
}

export function evaluateGuardrails(event, hookConfig = readHookConfig(event?.cwd)) {
    const toolName = event?.tool_name ?? '';
    if (NON_FILESYSTEM_TOOLS.has(toolName)) return { action: 'allow' };

    const rawInput = event?.tool_input ?? event;
    const scannedInput = toolName === 'Bash' && typeof rawInput?.command === 'string'
        ? { ...rawInput, command: stripCommitMessage(rawInput.command) }
        : rawInput;
    const toolInput = stringifyToolInput(scannedInput);
    const isSafeBash = toolName === 'Bash' && SAFE_BASH.test(toolInput);

    if (CONFIG_PATH.test(toolInput)) {
        const isDirectWrite = CONFIG_WRITE_TOOLS.has(toolName);
        const isBashMention = toolName === 'Bash';
        if (isDirectWrite || isBashMention) {
            return ask('config', CONFIG_GUARD_REASON);
        }
    }

    if (hookConfig.privacy && SENSITIVE_PATH.test(toolInput)) {
        return block('privacy', 'Blocked by hs-skills privacy guard: do not read secret files through the agent.');
    }

    if (hookConfig.scout && !isSafeBash) {
        const heavyMatch = HEAVY_DIRECTORY.exec(toolInput);
        if (heavyMatch && !(hookConfig.scoutAllowlist ?? []).includes(heavyMatch[2].toLowerCase())) {
            return ask('scout', `hs-skills scout guard: "${heavyMatch[2]}" looks like a generated or dependency directory - blocked. On Claude Code, approve this once via the prompt if you meant to read it; to allow it permanently, or on platforms without an interactive prompt, a human must add it to guardrails.scout.allowlist in .hs.json directly, outside this session.`);
        }
        const archiveDirectory = hookConfig.archiveDirectory ?? DEFAULT_ARCHIVE_DIRECTORY;
        const archiveBasename = archiveDirectory.split('/').pop().toLowerCase();
        const allowlistEntries = (hookConfig.scoutAllowlist ?? []).map((entry) => entry.replace(/\\/g, '/'));
        const archiveAllowed = allowlistEntries.includes(archiveBasename) || allowlistEntries.includes(archiveDirectory.toLowerCase());
        if (!archiveAllowed && buildArchiveDirectoryPattern(archiveDirectory).test(toolInput)) {
            return ask('scout', `hs-skills scout guard: "${sanitizeArchiveDirectoryForDisplay(archiveDirectory)}" holds finished/archived plans - blocked. On Claude Code, approve this once via the prompt if you meant to read it; to allow it permanently, or on platforms without an interactive prompt, a human must add it to guardrails.scout.allowlist in .hs.json directly, outside this session.`);
        }
        if (ROOT_GLOB.test(toolInput)) {
            return ask('scout', 'hs-skills scout guard: this is a repository-wide glob - blocked. Narrow it to a subdirectory first.');
        }
        if (PARENT_TRAVERSAL.test(toolInput)) {
            return ask('scout', 'hs-skills scout guard: this path traverses above the project root - blocked.');
        }
    }

    return { action: 'allow' };
}

// The exact 6 platforms this kit wires guard-rails into. A wiring file that
// passes anything else (typo, stale copy-paste, unsupported runtime) must
// fail closed rather than silently falling through to allow/default
// behavior - see plan.md Architecture Decision A2 / Red Team finding #2.
const KNOWN_PLATFORMS = new Set(['claude', 'cursor', 'codex', 'copilot', 'kiro', 'antigravity']);

function parseArguments(argv) {
    const index = argv.indexOf('--platform');
    return index === -1 ? 'codex' : argv[index + 1];
}

async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    return raw ? JSON.parse(raw) : {};
}

// Exit-code contract (ClaudeKit-aligned): 0 = allow, 2 = block, 1 = error-but-proceed.
// A transport failure (can't read/parse stdin) fails OPEN (exit 1, tool proceeds, error
// surfaced) rather than fail-closed, matching ClaudeKit's default behavior. This does NOT
// extend to evaluateGuardrails() itself: a crash while judging a specific tool call still
// fails CLOSED (exit 2), because that failure mode is reachable on demand via crafted
// tool_input and would otherwise be an attacker-controlled bypass, not a resilience feature.
//
// The config guard (decision.hook === 'config') has an in-session recovery path under Claude
// Code: it emits the JSON hookSpecificOutput permissionDecision:'ask' contract instead of a
// hard exit-2 block, so Claude Code's own permission UI can let the user approve an exception
// in-session rather than forcing an out-of-session .hs.json edit. Codex's PreToolUse hook
// parses but silently ignores both 'ask' and 'allow' in JSON output - only 'deny' does
// anything - so sending 'ask' to Codex would silently let the write through, worse than the
// hard block it replaces. Codex therefore keeps the hard exit-2 block for these decisions.
// The same reasoning extends the 'ask' path to hook === 'scout' on Claude Code too, so a
// heavy-directory or archived-plan read the user actually wants (e.g. a vendored dependency
// they maintain themselves) has an in-session recovery path as well.
export async function main(argv = process.argv.slice(2)) {
    const platform = parseArguments(argv);
    if (!KNOWN_PLATFORMS.has(platform)) {
        process.stderr.write(`hs-skills guard rail: unrecognized --platform "${platform}" - failing closed (blocking).\n`);
        return 2;
    }
    let event;
    try {
        event = await readStdin();
    } catch (error) {
        process.stderr.write(`hs-skills guard rail could not read/parse its input (${error.message}). Failing open: allowing the tool to proceed.\n`);
        return 1;
    }
    let decision;
    try {
        decision = evaluateGuardrails(event);
    } catch (error) {
        process.stderr.write(`hs-skills guard rail crashed while evaluating this tool call (${error.message}). Failing closed: blocking the tool.\n`);
        return 2;
    }
    if (decision.action === 'allow') return 0;
    if (decision.action === 'ask' && platform === 'claude') {
        process.stdout.write(`${JSON.stringify({
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'ask',
                permissionDecisionReason: decision.reason,
            },
        })}\n`);
        return 0;
    }
    // 'ask' has no exit-code equivalent on Codex (config and scout guards included); per the
    // approved alignment decision it collapses to a hard block there.
    process.stderr.write(`${decision.reason}\n`);
    return 2;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
    main().then((exitCode) => { process.exitCode = exitCode; }).catch((error) => {
        process.stderr.write(`hs-skills guard rail failed outside its normal error handling: ${error.message}\n`);
        process.exitCode = 1; // was 2 - under the exit-code contract that would mean "block", which is wrong for an unexpected internal failure
    });
}
