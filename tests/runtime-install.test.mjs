import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const generator = join(repo, 'install', 'lib', 'generate-runtime.mjs');
const source = repo;
const runtimes = ['codex', 'cursor', 'copilot', 'antigravity'];
const skills = readdirSync(join(repo, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== '_shared')
    .map((entry) => entry.name)
    .sort();

test('all non-Claude runtimes receive the shared native Agent Skills layout', () => {
    const root = mkdtempSync(join(tmpdir(), 'harness-runtime-layout-'));
    try {
        for (const skill of skills) {
            const canonical = readFileSync(join(source, 'skills', skill, 'SKILL.md'), 'utf8');
            assert.doesNotMatch(canonical, /^category:/m, `${skill}: category must not be top-level`);
            assert.match(canonical, /^metadata:\n  category: (?:domain|workflow)$/m, `${skill}: missing metadata.category`);
        }

        for (const runtime of runtimes) {
            const target = join(root, runtime);
            execFileSync(process.execPath, [generator, '--runtime', runtime, '--source', source, '--target', target], {
                cwd: repo,
                stdio: 'pipe',
            });

            for (const skill of skills) {
                assert.ok(existsSync(join(target, '.agents', 'skills', skill, 'SKILL.md')), `${runtime}: missing ${skill}`);
            }
        }

        assert.ok(!existsSync(join(root, 'cursor', '.cursor', 'rules')));
        assert.ok(!existsSync(join(root, 'copilot', '.github', 'instructions')));
        assert.ok(!existsSync(join(root, 'antigravity', '.agents', 'hs-skills')));

        const sharedPlan = readFileSync(join(root, 'codex', '.agents', 'skills', 'hs-plan', 'SKILL.md'), 'utf8');
        assert.doesNotMatch(sharedPlan, /^category:/m);
        assert.match(sharedPlan, /^metadata:\n  category: workflow$/m);

        const copilotHooks = JSON.parse(readFileSync(join(root, 'copilot', '.github', 'hooks', 'hooks.json'), 'utf8'));
        assert.equal(copilotHooks.version, 1);
        assert.ok(Array.isArray(copilotHooks.hooks.preToolUse));
        for (const hook of copilotHooks.hooks.preToolUse) {
            assert.equal(hook.type, 'command');
            assert.equal(typeof hook.bash, 'string');
            assert.equal(typeof hook.powershell, 'string');
            assert.doesNotMatch(hook.powershell, /\$\(git /);
            assert.equal(hook.timeoutSec, 10);
        }

        const antigravityOverview = readFileSync(join(root, 'antigravity', '.agents', 'rules', 'kit-overview.md'), 'utf8');
        assert.match(antigravityOverview, /SessionStart.*session-init.*unsupported/i);
        const antigravityHooks = JSON.parse(readFileSync(join(root, 'antigravity', '.agents', 'hooks.json'), 'utf8'));
        assert.equal(antigravityHooks.SessionStart, undefined);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('the removed Kiro runtime is rejected by the generator', () => {
    const result = spawnSync(process.execPath, [generator, '--runtime', 'kiro', '--source', source, '--target', join(tmpdir(), 'harness-kiro-should-fail')], {
        cwd: repo,
        encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unknown runtime|failed/);
});

test('Claude keeps hook wiring in settings.json only', { skip: process.platform !== 'win32' }, () => {
    const root = mkdtempSync(join(tmpdir(), 'harness-claude-layout-'));
    try {
        execFileSync('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-File', join(repo, 'install.ps1'),
            '-Claude',
            '-TargetPath', root,
        ], { cwd: repo, stdio: 'pipe' });

        assert.ok(existsSync(join(root, '.claude', 'settings.json')));
        assert.ok(existsSync(join(root, '.claude', 'hooks', 'session-init.mjs')));
        assert.equal(existsSync(join(root, '.claude', 'hooks', 'hooks.json')), false);
        const claudeHookFiles = readdirSync(join(root, '.claude', 'hooks'));
        assert.ok(claudeHookFiles.every((name) => /\.(?:mjs|js|cjs|ps1|sh)$/.test(name)));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
