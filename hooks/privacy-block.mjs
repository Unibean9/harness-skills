#!/usr/bin/env node
// PreToolUse privacy gate: stops the agent reading or writing likely secret files
// (.env, private keys, credentials) and editing .hs.json without the user's say-so.
//
// Standalone port of the AgentKit `privacy-block.cjs` hook - no ak-* lib
// dependency. The APPROVED: path prefix is replaced by the runtime's own
// approval: Claude Code shows a permission prompt, other platforms hard-block.
// On/off lives in `.hs.json` -> guardrails.hooks.privacy.enabled (default on);
// the .hs.json guard itself is never configurable.

import path from 'node:path';
import {
    commandPathArguments,
    isHookEnabled,
    isMainModule,
    normalizeToolEvent,
    readHsConfig,
    runGate,
    stripCommitMessage,
} from './util.mjs';

// Documentation/template files are exempt.
const SAFE_PATTERNS = [/\.example$/i, /\.sample$/i, /\.template$/i];

const PRIVACY_PATTERNS = [
    /^\.env$/,
    /^\.env\./,
    /\.env$/,
    /\/\.env\./,
    /credentials/i,
    /secrets?\.ya?ml$/i,
    /\.(?:pem|key|p12|pfx)$/i,
    /id_(?:rsa|ed25519|ecdsa|dsa)/,
    /(?:^|\/)\.(?:npmrc|netrc|pypirc|git-credentials)$/,
];

const CONFIG_FILE = /(?:^|[\\/])\.hs\.json$/i;
const CONFIG_WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const PATH_KEYS = ['file_path', 'path', 'pattern', 'notebook_path'];

function normalize(testPath) {
    let normalized = String(testPath).replace(/\\/g, '/');
    try {
        normalized = decodeURIComponent(normalized); // catches %2e-style obfuscation
    } catch {
        // invalid encoding, keep as-is
    }
    return normalized;
}

export function isSafeFile(testPath) {
    return SAFE_PATTERNS.some((pattern) => pattern.test(path.posix.basename(normalize(testPath))));
}

export function isPrivacySensitive(testPath) {
    if (!testPath) return false;
    const normalized = normalize(testPath);
    if (isSafeFile(normalized)) return false;
    const basename = path.posix.basename(normalized);
    return PRIVACY_PATTERNS.some((pattern) => pattern.test(basename) || pattern.test(normalized));
}

function isRuntimeEnvReference(token) {
    return /(?:process|Deno|Bun|import\.meta)(?:\.|\?\.)env\b/.test(token);
}

// Bash arguments are checked only for dotenv-style paths and key files. Prose words
// such as "credentials" in an echo or commit message are not file access.
function extractCommandPaths(command) {
    return commandPathArguments(command)
        .map(({ value }) => value)
        .filter((value) => !isRuntimeEnvReference(value))
        .filter((value) => value.includes('.env') || /\.(?:pem|key|p12|pfx)$/i.test(value) || /id_(?:rsa|ed25519|ecdsa|dsa)/.test(value));
}

// Grep's pattern is a content regex, not a path; its glob filter is.
export function extractPaths(toolInput, toolName = '') {
    if (!toolInput || typeof toolInput !== 'object') return [];
    const keys = toolName === 'Grep' ? ['path', 'glob'] : PATH_KEYS;
    const paths = keys.map((key) => toolInput[key]).filter((value) => typeof value === 'string' && value);
    if (typeof toolInput.command === 'string') paths.push(...extractCommandPaths(toolInput.command));
    return paths;
}

function mentionsConfigFile(toolName, toolInput) {
    if (CONFIG_WRITE_TOOLS.has(toolName)) {
        return PATH_KEYS.some((key) => typeof toolInput?.[key] === 'string' && CONFIG_FILE.test(toolInput[key]));
    }
    // Any Bash mention counts: node -e, sed -i, git checkout -- all write past a denylist.
    return toolName === 'Bash' && typeof toolInput?.command === 'string'
        && /(?:^|[\\/\s'"`])\.hs\.json(?=$|[\\/\s'"`])/i.test(stripCommitMessage(toolInput.command));
}

const CONFIG_REASON = 'hs-skills privacy guard: .hs.json controls the guard rails themselves, so the agent may not edit it unattended. Approve only if you asked for this change. Agent: if the user has not already chosen this edit, cancel and use AskUserQuestion first, naming the rule that misfires and why. On platforms without an interactive prompt this is a hard block - a human must edit .hs.json directly.';

function privacyReason(filePath) {
    const basename = path.posix.basename(normalize(filePath));
    return `hs-skills privacy guard: "${basename}" may contain secrets (API keys, passwords, tokens). Approve only if you want the agent to access it this time. Agent: if the user has not already approved, cancel and use AskUserQuestion ("I need to read ${basename}, which may contain secrets. Approve?"). Even when approved, never print raw secret values - report variable names or [redacted]. On platforms without an interactive prompt this is a hard block.`;
}

export function evaluatePrivacy(event, config = readHsConfig(event?.cwd).config) {
    const { toolName, toolInput } = normalizeToolEvent(event);

    if (mentionsConfigFile(toolName, toolInput)) return { action: 'ask', reason: CONFIG_REASON };
    if (!isHookEnabled(config, 'privacy')) return { action: 'allow' };

    const sensitive = extractPaths(toolInput, toolName).find(isPrivacySensitive);
    return sensitive ? { action: 'ask', reason: privacyReason(sensitive) } : { action: 'allow' };
}

if (isMainModule(import.meta.url)) {
    runGate('privacy guard', (event) => evaluatePrivacy(event)).then((exitCode) => { process.exitCode = exitCode; });
}
