#!/usr/bin/env node
// Injects language guidance before each user prompt.
// The assembled instruction is cached for five minutes; it is still emitted on
// every prompt submission. On/off lives in .hs.json -> guardrails.hooks.languagePrompt.enabled.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isHookEnabled, isMainModule, readHsConfig, readStdinJson } from './util.mjs';

export const CACHE_TTL_MS = 5 * 60 * 1000;

function languageLabel(value, fallback) {
    const language = typeof value === 'string' ? value.trim() : '';
    if (!language) return fallback;
    if (/^vi(?:[-_].*)?$/i.test(language)) return 'Vietnamese';
    if (/^en(?:[-_].*)?$/i.test(language)) return 'English';
    return language;
}

function createPrompt(config = {}) {
    const conversation = languageLabel(config?.language?.conversation, 'Vietnamese');
    const thinking = languageLabel(config?.language?.thinking, 'Vietnamese');
    return [
        'Language preferences:',
        '- Respond to the user in ' + conversation + ', unless the user requests another language.',
        '- Use ' + thinking + ' for private reasoning. Do not reveal private chain-of-thought; provide concise conclusions and rationale.',
    ].join('\n');
}

function cacheFilePath(root) {
    const key = createHash('sha256').update(path.resolve(root)).digest('hex');
    return path.join(os.tmpdir(), 'hs-skills-cache', 'language-prompt-' + key + '.json');
}

function getConfigFingerprint(configPath) {
    try {
        const stat = fs.statSync(configPath);
        return stat.mtimeMs + ':' + stat.size;
    } catch {
        return 'missing';
    }
}

function writeCache(cachePath, entry) {
    try {
        fs.mkdirSync(path.dirname(cachePath), { recursive: true, mode: 0o700 });
        fs.writeFileSync(cachePath, JSON.stringify(entry), { encoding: 'utf8', mode: 0o600 });
    } catch {
        // A cache failure must never prevent prompt submission.
    }
}

export function getLanguagePrompt({ cwd = process.cwd(), now = Date.now() } = {}) {
    const { root, config } = readHsConfig(cwd);
    const projectRoot = root ?? path.resolve(cwd);
    const configPath = path.join(projectRoot, '.hs.json');
    const fingerprint = getConfigFingerprint(configPath);
    const cachePath = cacheFilePath(projectRoot);

    try {
        const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        if (cached.fingerprint === fingerprint && cached.expiresAt > now && typeof cached.prompt === 'string') {
            return cached.prompt;
        }
    } catch {
        // Missing, expired, or invalid cache: rebuild from .hs.json.
    }

    const prompt = createPrompt(config);
    writeCache(cachePath, { fingerprint, expiresAt: now + CACHE_TTL_MS, prompt });
    return prompt;
}

export function buildHookOutput({ platform, event = {}, prompt }) {
    if (platform === 'claude' || platform === 'codex') {
        return {
            hookSpecificOutput: {
                hookEventName: 'UserPromptSubmit',
                additionalContext: prompt,
            },
        };
    }
    if (platform === 'copilot') {
        const original = typeof event.transformedPrompt === 'string' ? event.transformedPrompt : '';
        return {
            modifiedTransformedPrompt: original
                ? original + '\n\n' + prompt
                : prompt,
        };
    }
    if (platform === 'antigravity') {
        return { injectSteps: [{ ephemeralMessage: prompt }] };
    }
    return {};
}

if (isMainModule(import.meta.url)) {
    try {
        const event = await readStdinJson();
        const workspacePath = Array.isArray(event.workspacePaths) ? event.workspacePaths.find((value) => typeof value === 'string' && value) : null;
        const cwd = typeof event.cwd === 'string' && event.cwd ? event.cwd : workspacePath || process.cwd();
        const config = readHsConfig(cwd).config;
        if (!isHookEnabled(config, 'languagePrompt')) {
            process.stdout.write('{}\n');
        } else {
            const platformIndex = process.argv.indexOf('--platform');
            const platform = platformIndex === -1 ? 'codex' : process.argv[platformIndex + 1];
            const prompt = getLanguagePrompt({ cwd });
            process.stdout.write(JSON.stringify(buildHookOutput({ platform, event, prompt })) + '\n');
        }
    } catch (error) {
        process.stderr.write('hs-skills language-prompt failed (' + error.message + '); continuing without language guidance.\n');
        process.stdout.write('{}\n');
    }
}
