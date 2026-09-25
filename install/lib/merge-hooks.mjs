#!/usr/bin/env node
// Merge generated harness hook wiring into an existing runtime config while
// preserving hooks owned by the project.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANAGED_SCRIPTS = /(?:kit-hooks|\.claude[\\/]hooks)[\\/](?:privacy-block|scout-block|descriptive-name|session-init|language-prompt)\.mjs/i;

function isManaged(value) {
    return MANAGED_SCRIPTS.test(JSON.stringify(value));
}

function stripManagedEntries(entries) {
    return entries.flatMap((entry) => {
        if (entry && typeof entry === 'object' && Array.isArray(entry.hooks)) {
            const hooks = entry.hooks.filter((hook) => !isManaged(hook));
            return hooks.length ? [{ ...entry, hooks }] : [];
        }
        return isManaged(entry) ? [] : [entry];
    });
}

function mergeEventMaps(existing = {}, generated = {}) {
    const merged = { ...existing };
    for (const [event, additions] of Object.entries(generated)) {
        if (!Array.isArray(additions)) continue;
        const current = Array.isArray(merged[event]) ? merged[event] : [];
        merged[event] = [...stripManagedEntries(current), ...additions];
    }
    return merged;
}

export function mergeHookConfigs(runtime, generated, existing = {}) {
    const result = { ...existing };
    if (runtime === 'antigravity') {
        for (const [name, definition] of Object.entries(generated)) {
            const current = existing[name] && typeof existing[name] === 'object' ? existing[name] : {};
            const { enabled, ...events } = definition;
            result[name] = {
                ...current,
                ...('enabled' in current ? { enabled: current.enabled } : ('enabled' in definition ? { enabled } : {})),
                ...mergeEventMaps(current, events),
            };
        }
        return result;
    }

    if (!generated.hooks || typeof generated.hooks !== 'object') {
        throw new Error(`Generated ${runtime} hook config has no hooks object.`);
    }
    result.hooks = mergeEventMaps(existing.hooks ?? {}, generated.hooks);
    if (!('version' in result) && 'version' in generated) result.version = generated.version;
    return result;
}

function parseArgs(argv) {
    const args = {};
    for (let index = 0; index < argv.length; index += 2) {
        const key = argv[index];
        if (!key?.startsWith('--') || !argv[index + 1]) throw new Error('Expected --runtime, --source, and --target arguments.');
        args[key.slice(2)] = argv[index + 1];
    }
    return args;
}

function main() {
    const { runtime, source, target } = parseArgs(process.argv.slice(2));
    if (!['claude', 'cursor', 'codex', 'copilot', 'antigravity'].includes(runtime) || !source || !target) {
        throw new Error('Usage: merge-hooks.mjs --runtime <claude|cursor|codex|copilot|antigravity> --source <file> --target <file>');
    }

    const generated = JSON.parse(fs.readFileSync(source, 'utf8'));
    const targetExists = fs.existsSync(target);
    const existing = targetExists ? JSON.parse(fs.readFileSync(target, 'utf8')) : {};
    const merged = mergeHookConfigs(runtime, generated, existing);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temporary = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(merged, null, 4)}\n`, 'utf8');
    fs.renameSync(temporary, target);
    process.stdout.write(`${targetExists ? 'Merged' : 'Installed'} ${runtime} hook wiring -> ${target}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
    try {
        main();
    } catch (error) {
        process.stderr.write(`merge-hooks.mjs failed: ${error.message}\n`);
        process.exitCode = 1;
    }
}
