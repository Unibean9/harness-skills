#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findProjectRoot } from './util.mjs';

const DEFAULT_RULES_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dev-rules-reminder.md');

export function readDevRulesReminderConfig(startDirectory = process.cwd()) {
    const root = findProjectRoot(startDirectory);
    if (!root) return { enabled: false, root: null, rulesFile: DEFAULT_RULES_FILE };

    try {
        const config = JSON.parse(fs.readFileSync(path.join(root, '.hs.json'), 'utf8'));
        const devRulesReminder = config?.guardrails?.hooks?.devRulesReminder;
        const rulesFile = typeof devRulesReminder?.rulesFile === 'string' && devRulesReminder.rulesFile.trim().length > 0
            ? path.resolve(root, devRulesReminder.rulesFile)
            : DEFAULT_RULES_FILE;
        return { enabled: devRulesReminder?.enabled === true, root, rulesFile };
    } catch {
        return { enabled: false, root, rulesFile: DEFAULT_RULES_FILE };
    }
}

export function readDevRules(rulesFile) {
    try {
        return fs.readFileSync(rulesFile, 'utf8').trim();
    } catch {
        return '';
    }
}

const TTL_MS = 5 * 60 * 1000;
// A dedicated, restrictively-permissioned subdirectory - not os.tmpdir() directly - so the
// TTL file's name and location aren't predictable/shared with every other process on the
// machine (a predictable path in a world-writable temp dir is a symlink-clobber target).
const STATE_DIR = path.join(os.tmpdir(), 'hs-skills-dev-rules');

// The key (session_id, or a cwd fallback) is untrusted input from hook stdin. Hash it rather
// than interpolating it into a path directly - closes the path-traversal primitive (an
// unsanitized `../../../etc/x` style value can no longer escape stateDir once it's been
// through a fixed-length hex digest).
function stateFileFor(key, stateDir) {
    const digest = crypto.createHash('sha256').update(String(key)).digest('hex').slice(0, 32);
    return path.join(stateDir, `${digest}.json`);
}

// Pure predicate - no side effects. stateDir defaults to STATE_DIR but is overridable
// so tests don't read/write the real OS temp directory and repeated/parallel test runs collide.
export function isDue(key, now = Date.now(), ttlMs = TTL_MS, stateDir = STATE_DIR) {
    try {
        const { lastInjected } = JSON.parse(fs.readFileSync(stateFileFor(key, stateDir), 'utf8'));
        // Guard against a corrupted/hostile future-dated state file wedging reinjection off forever.
        if (typeof lastInjected === 'number' && lastInjected > 0 && lastInjected <= now && now - lastInjected < ttlMs) {
            return false;
        }
    } catch {
        // no state file yet, or unreadable - treat as due
    }
    return true;
}

// Only called after a successful injection, so a suppressed/failed injection never marks
// the TTL as satisfied.
export function markInjected(key, now = Date.now(), stateDir = STATE_DIR) {
    try {
        fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
        // Write via a temp file + rename rather than a direct writeFileSync to a predictable
        // name, avoiding a plain open-and-follow-symlink write.
        const target = stateFileFor(key, stateDir);
        const tmp = `${target}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify({ lastInjected: now }), { flag: 'wx' });
        fs.renameSync(tmp, target);
    } catch {
        // Best-effort: if we can't persist state, the next call just re-evaluates isDue()
        // from scratch (which defaults to "due") - never let a state-write failure block
        // or crash this context-injection hook.
    }
}

function reinjectKeyFor(event) {
    // Prefer session_id (present for UserPromptSubmit). Falls back to a hashed cwd, NOT
    // unconditional injection - cross-session collisions on cwd just mean two sessions in the
    // same project share a 5-minute window, which is the intended cost/benefit tradeoff for a
    // reminder feature.
    return event?.session_id || event?.cwd || 'unknown';
}

async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    return raw ? JSON.parse(raw) : {};
}

export async function main() {
    const event = await readStdin();
    const { enabled, rulesFile } = readDevRulesReminderConfig(event?.cwd);
    if (!enabled) return 0;

    const key = reinjectKeyFor(event);
    if (!isDue(key)) return 0;

    const additionalContext = readDevRules(rulesFile);
    if (!additionalContext) return 0; // do NOT mark injected - nothing was actually sent

    process.stdout.write(`${JSON.stringify({
        hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext },
    })}\n`);
    markInjected(key);
    return 0;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
    main().then((exitCode) => { process.exitCode = exitCode; }).catch((error) => {
        process.stderr.write(`hs-skills dev-rules-reminder hook failed: ${error.message}\n`);
        process.exitCode = 0; // context-injection hook: never block the prompt on failure
    });
}
