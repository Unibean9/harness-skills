#!/usr/bin/env node
// PreToolUse scout gate: keeps generated/dependency directories, archived plans, and
// repository-wide globs out of the agent's context. Build/test/tool commands that
// merely touch those directories (npm run build, cargo test, docker build) pass.
//
// Standalone port of the AgentKit `scout-block.cjs` hook - no ak-* lib and no
// vendored `ignore` package. The .ckignore file is replaced by `.hs.json`:
// guardrails.hooks.scout.enabled (default on), guardrails.hooks.scout.allowlist,
// and artifacts.plans.archiveDirectory (default plans/archive).

import path from 'node:path';
import {
    commandPathArguments,
    isHookEnabled,
    isMainModule,
    normalizeToolEvent,
    readHsConfig,
    runGate,
    splitCompoundCommand,
    stripHeredocBodies,
} from './util.mjs';

const BLOCKED_DIRECTORIES = [
    'node_modules', 'dist', 'build', '.next', '.nuxt', 'coverage', 'target',
    'vendor', '.venv', 'venv', '__pycache__', '.git',
];
const DEFAULT_ARCHIVE_DIRECTORY = 'plans/archive';

const BUILD_COMMAND = /^(?:npm|pnpm|yarn|bun)\s+(?:\S+\s+)*(?:run\s+)?(?:build|test|lint|dev|start|install|ci|add|remove|update|publish|pack|init|create|exec)\b/;
const TOOL_COMMAND = /^(?:\.\/)?(?:npx|pnpx|bunx|tsc|esbuild|vite|webpack|rollup|turbo|nx|jest|vitest|mocha|eslint|prettier|go|cargo|make|mvn|mvnw|gradle|gradlew|dotnet|docker|podman|kubectl|helm|terraform|ansible|bazel|cmake|sbt|flutter|swift|ant|ninja|meson|python3?|pip|uv|deno|bundle|rake|gem|php|composer|ruby|mix|elixir|pytest)\b/;
const VENV_EXECUTABLE = /(?:^|[/\\])\.?venv[/\\](?:bin|Scripts)[/\\]/;
const VENV_CREATION = /^(?:python3?|py)\s+(?:-[\w.]+\s+)*-m\s+venv\s+|^uv\s+venv(?:\s|$)|^virtualenv\s+/;
const FILESYSTEM_COMMANDS = new Set([
    'cd', 'ls', 'cat', 'head', 'tail', 'less', 'more', 'rm', 'cp', 'mv', 'find', 'touch',
    'mkdir', 'rmdir', 'stat', 'file', 'du', 'tree', 'wc', 'tee', 'tar', 'zip', 'unzip',
    'bat', 'rsync', 'diff', 'grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'sed', 'awk',
]);
const SHELL_WRAPPER = /^(?:(?:bash|sh|zsh)\s+-c|eval)\s+["'](.+)["']\s*$/;

// Globs that match everything (or every file of a type) when run from a shallow path.
const BROAD_PATTERNS = [
    /^\*\*?$/,
    /^\*\*\/\*$/,
    /^\*\*\/\.\*$/,
    /^\*\.\w+$/,
    /^\*\.\{[^}]+\}$/,
    /^\*\*\/\*\.\w+$/,
    /^\*\*\/[^*/]+\.\w+$/,
    /^\*\*\/\*\.\{[^}]+\}$/,
];

function stripCommandPrefix(command) {
    return command.trim()
        .replace(/^(?:\w+=\S+\s+)+/, '')
        .replace(/^(?:sudo|env|nice|nohup|time|timeout)\s+/, '')
        .replace(/^(?:\w+=\S+\s+)+/, '')
        .trim();
}

export function isAllowedCommand(command) {
    const stripped = stripCommandPrefix(command);
    return BUILD_COMMAND.test(stripped) || TOOL_COMMAND.test(stripped)
        || VENV_EXECUTABLE.test(stripped) || VENV_CREATION.test(stripped);
}

function readScoutSettings(config) {
    const allowlist = config?.guardrails?.hooks?.scout?.allowlist;
    const archive = config?.artifacts?.plans?.archiveDirectory;
    const normalizeEntry = (entry) => entry.trim().replace(/\\/g, '/').replace(/^(?:\.\/)+/, '').replace(/^\/+|\/+$/g, '').toLowerCase();
    return {
        allowlist: Array.isArray(allowlist)
            ? allowlist.filter((entry) => typeof entry === 'string' && entry.trim()).map(normalizeEntry)
            : [],
        archiveDirectory: typeof archive === 'string' && archive.trim() ? normalizeEntry(archive) : DEFAULT_ARCHIVE_DIRECTORY,
    };
}

// Absolute paths are made project-relative so a checkout living under e.g. ~/build/
// is not blocked by its own parent folders.
function toSegments(rawPath, baseDirectory) {
    let value = String(rawPath).replace(/\\/g, '/');
    if (baseDirectory && path.isAbsolute(value)) {
        const relative = path.relative(baseDirectory, value).replace(/\\/g, '/');
        if (!relative.startsWith('..') && !path.isAbsolute(relative)) value = relative;
    }
    return value.split('/').filter((segment) => segment && segment !== '.').map((segment) => segment.toLowerCase());
}

export function findBlockedDirectory(rawPath, settings, baseDirectory) {
    const segments = toSegments(rawPath, baseDirectory);
    const joined = `/${segments.join('/')}/`;
    const archive = settings.archiveDirectory;
    const archiveAllowed = settings.allowlist.includes(archive) || settings.allowlist.includes(archive.split('/').pop());
    if (!archiveAllowed && joined.includes(`/${archive}/`)) return archive;
    return segments.find((segment) => BLOCKED_DIRECTORIES.includes(segment) && !settings.allowlist.includes(segment)) ?? null;
}

export function isBroadGlob(pattern, searchPath, baseDirectory) {
    if (typeof pattern !== 'string' || !BROAD_PATTERNS.some((regex) => regex.test(pattern.trim()))) return false;
    return !searchPath || toSegments(searchPath, baseDirectory).length <= 1;
}

// A bare directory name ("ls dist") only counts for filesystem commands; elsewhere
// ("echo build", "git checkout build") an argument must look like a path.
function commandPaths(command) {
    const unwrapped = command.trim().match(SHELL_WRAPPER)?.[1] ?? command;
    const segments = splitCompoundCommand(stripHeredocBodies(unwrapped)).filter((segment) => !isAllowedCommand(segment));
    return commandPathArguments(segments.join('\n'))
        .filter(({ executable, value }) => FILESYSTEM_COMMANDS.has(executable) || /[\\/]/.test(value))
        .map(({ value }) => value);
}

export function evaluateScout(event, config = readHsConfig(event?.cwd).config, baseDirectory = event?.cwd) {
    if (!isHookEnabled(config, 'scout')) return { action: 'allow' };
    const { toolName, toolInput } = normalizeToolEvent(event);
    const settings = readScoutSettings(config);

    if (toolName === 'Glob' && isBroadGlob(toolInput.pattern, toolInput.path, baseDirectory)) {
        return { action: 'ask', reason: `hs-skills scout guard: "${toolInput.pattern}" from the project root pulls every matching file into context. Scope it to a subdirectory (e.g. src/${toolInput.pattern}) instead.` };
    }

    const candidates = ['file_path', 'path', 'notebook_path', ...(toolName === 'Glob' ? ['pattern'] : [])]
        .map((key) => toolInput[key])
        .filter((value) => typeof value === 'string' && value);
    if (toolName === 'Bash' && typeof toolInput.command === 'string') candidates.push(...commandPaths(toolInput.command));

    for (const candidate of candidates) {
        const blocked = findBlockedDirectory(candidate, settings, baseDirectory);
        if (blocked) {
            const shown = blocked.slice(0, 80).replace(/[^A-Za-z0-9_./-]/g, '');
            return { action: 'ask', reason: `hs-skills scout guard: "${shown}" is a generated, dependency, or archived-plan directory. Approve once if you really need it; to allow it permanently a human adds it to guardrails.hooks.scout.allowlist in .hs.json. On platforms without an interactive prompt this is a hard block.` };
        }
    }
    return { action: 'allow' };
}

if (isMainModule(import.meta.url)) {
    runGate('scout guard', (event) => evaluateScout(event)).then((exitCode) => { process.exitCode = exitCode; });
}
