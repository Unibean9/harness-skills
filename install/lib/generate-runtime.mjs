#!/usr/bin/env node
// Generates one runtime's on-disk format directly from this kit's canonical
// source (agents/, skills/, hooks/) - skills/agents are the single source of
// truth; this file is the code that maps them into each runtime's own
// shape. No static per-runtime mirror is checked into the repo, so
// adding/editing a skill/agent here is immediately reflected in every
// runtime the next time install.ps1/install.sh runs. This kit ships no
// slash-commands for any runtime - every runtime invokes a skill directly
// by matching the task to its SKILL.md description.
//
// CLI: node generate-runtime.mjs --runtime <cursor|codex|copilot|antigravity> --source <dir> --target <dir>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A git clone with core.autocrlf=true (Windows' common default) checks
// source files out with CRLF line endings, which would otherwise break this
// regex outright - normalize before parsing rather than assuming LF.
function splitFrontmatter(rawInput) {
    const raw = rawInput.replace(/\r\n/g, '\n');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error('Source file is missing a frontmatter block.');
    return { frontmatterText: match[1], body: match[2].replace(/^\n+/, '') };
}

function frontmatterField(frontmatterText, field) {
    const m = frontmatterText.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : undefined;
}

function metadataField(frontmatterText, field) {
    let inMetadata = false;
    for (const line of frontmatterText.split('\n')) {
        if (/^metadata:\s*$/.test(line)) {
            inMetadata = true;
            continue;
        }
        if (inMetadata && /^\S/.test(line)) inMetadata = false;
        if (inMetadata) {
            const match = line.match(new RegExp(`^\\s+${field}:\\s*(.+)$`));
            if (match) return match[1].trim();
        }
    }
    return undefined;
}

function readNamedMarkdownFiles(dir, { skip = [] } = {}) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter((name) => name.endsWith('.md') && !skip.includes(name))
        .map((name) => name.replace(/\.md$/, ''))
        .sort()
        .map((name) => {
            const raw = fs.readFileSync(path.join(dir, `${name}.md`), 'utf8');
            return { name, ...splitFrontmatter(raw) };
        });
}

function readSkills(sourceRoot) {
    const skillsDir = path.join(sourceRoot, 'skills');
    return fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name !== '_shared')
        .map((e) => e.name)
        .sort()
        .map((name) => {
            const raw = fs.readFileSync(path.join(skillsDir, name, 'SKILL.md'), 'utf8');
            return { name, ...splitFrontmatter(raw) };
        });
}

function readAgents(sourceRoot) {
    return readNamedMarkdownFiles(path.join(sourceRoot, 'agents'));
}

// Every skill that carries a <HARD-GATE> references the shared canonical
// shape at `../_shared/hard-gate.md` (see skills/_shared/hard-gate.md) with
// its own {scope} and any extra clause inlined in that same sentence.
// `_shared/` is copied into every runtime (copySkillResources), but the gate
// is still inlined here so it reads correctly in the ported skill file on
// its own - scope and extra text still come straight from the source file,
// not a second hardcoded table.
const HARD_GATE_RE = /<HARD-GATE>\nSee `\.\.\/_shared\/hard-gate\.md` for the shared gate shape \(`\{scope\}` = "([^"]+)"\)\.\s*([\s\S]*?)\n<\/HARD-GATE>/;

function inlineHardGate(body) {
    const m = body.match(HARD_GATE_RE);
    if (!m) return body;
    const [, scope, extra] = m;
    const trimmedExtra = extra.trim();
    const inlined = `<HARD-GATE>\nDo NOT write or modify implementation code until ${scope}.\n`
        + 'This applies regardless of perceived task simplicity - unexamined assumptions\n'
        + 'waste the most time on "simple" tasks.\n'
        + 'A user may explicitly override this ordering, but never a required safety,\n'
        + `privacy, or confirmation guard.${trimmedExtra ? ` ${trimmedExtra}` : ''}\n</HARD-GATE>`;
    return body.replace(HARD_GATE_RE, inlined);
}

// "# X Skill" source headers read fine standalone in this kit, but every
// ported runtime already names the file/section after the skill - drop the
// redundant suffix rather than repeating "Skill" in the rule/instructions
// heading too.
function stripSkillSuffix(body) {
    return body.replace(/^# (.+) Skill$/m, '# $1');
}

function transformSkillBody(body) {
    return inlineHardGate(stripSkillSuffix(body));
}

function generateSharedSkills(sourceRoot, targetPath) {
    const skills = readSkills(sourceRoot);
    const skillsRoot = path.join(targetPath, '.agents', 'skills');

    for (const skill of skills) {
        const fm = yamlFrontmatter({
            name: skill.name,
            description: frontmatterField(skill.frontmatterText, 'description'),
            metadata: { category: metadataField(skill.frontmatterText, 'category') },
        });
        writeFile(path.join(skillsRoot, skill.name, 'SKILL.md'), fm + transformSkillBody(skill.body));
    }
    copySkillResources(sourceRoot, skillsRoot);
}

function copyDirIfExists(from, to) {
    if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true });
}

function copySkillResources(sourceRoot, skillsTargetDir) {
    const skillsDir = path.join(sourceRoot, 'skills');
    copyDirIfExists(path.join(skillsDir, '_shared'), path.join(skillsTargetDir, '_shared'));
    for (const skill of readSkills(sourceRoot)) {
        copyDirIfExists(path.join(skillsDir, skill.name, 'references'), path.join(skillsTargetDir, skill.name, 'references'));
    }
}

function yamlFrontmatter(fields) {
    const lines = [];
    for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) continue;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const nested = Object.entries(value).filter(([, v]) => v !== undefined && v !== null);
            if (nested.length === 0) continue;
            lines.push(`${key}:`);
            for (const [nestedKey, nestedValue] of nested) {
                lines.push(`  ${nestedKey}: ${nestedValue}`);
            }
            continue;
        }
        if (Array.isArray(value)) {
            lines.push(`${key}: [${value.map((x) => JSON.stringify(x)).join(', ')}]`);
            continue;
        }
        lines.push(`${key}: ${value}`);
    }
    return `---\n${lines.join('\n')}\n---\n\n`;
}

function toToml(fields) {
    const lines = Object.entries(fields).map(([k, v]) => {
        if (typeof v === 'string' && v.includes('\n')) {
            if (v.includes('"""')) throw new Error(`Cannot TOML-encode field "${k}": body contains a triple-quote sequence.`);
            return `${k} = """\n${v}\n"""`;
        }
        return `${k} = ${JSON.stringify(v)}`;
    });
    return `${lines.join('\n')}\n`;
}

function writeFile(targetPath, contents) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, contents);
}

function writeJson(targetPath, value) {
    writeFile(targetPath, `${JSON.stringify(value, null, 4)}\n`);
}

const KIT_HOOK_SCRIPTS = ['privacy-block.mjs', 'scout-block.mjs', 'descriptive-name.mjs', 'session-init.mjs', 'util.mjs'];

function copyKitHooks(sourceRoot, kitHooksDir) {
    fs.mkdirSync(kitHooksDir, { recursive: true });
    for (const name of KIT_HOOK_SCRIPTS) {
        fs.copyFileSync(path.join(sourceRoot, 'hooks', name), path.join(kitHooksDir, name));
    }
}

function renderOverview({ skills, agents, skillsNote, agentsNote, hookNote, commandsNote }) {
    const skillList = skills.map((s) => `\`${s.name}\``).join(', ');
    const agentList = agents.map((a) => `\`${a.name}\``).join(', ');
    return `# Student Harness Kit

A trimmed-down kit for learning the basic building blocks of "harness
engineering" in agentic coding: skills, agents, hooks.

## What's in the kit

**${skills.length} skills** (${skillsNote}): ${skillList}.

**${agents.length} specialized agents** (${agentsNote}): ${agentList}.

${hookNote}

${commandsNote}

## Working rules

- Do not write or modify implementation code until a plan exists and has
  been reviewed, or the user has explicitly requested implementation
  directly. A user may say "just code it" to skip planning for a trivial
  task, but never skip a required safety, privacy, or confirmation guard.
- Follow the plan; if reality forces a deviation, say so and why, don't
  silently diverge.
- Write a test for logic whose correct behavior isn't obvious from reading
  it; never claim "done" without having actually run a check that proves it.
- Commit each finished task locally only under a commit policy the user
  approved at the start of the build. Treat push, opening a pull request,
  and merge as separately confirmed steps - never chain them automatically.
`;
}

// --- Cursor ---------------------------------------------------------------

function generateCursor(sourceRoot, targetPath) {
    const agents = readAgents(sourceRoot);
    const cursorRoot = path.join(targetPath, '.cursor');

    generateSharedSkills(sourceRoot, targetPath);
    for (const agent of agents) {
        const fm = yamlFrontmatter({ name: agent.name, description: frontmatterField(agent.frontmatterText, 'description'), model: 'inherit' });
        writeFile(path.join(cursorRoot, 'agents', `${agent.name}.md`), fm + agent.body);
    }
    writeJson(path.join(cursorRoot, 'hooks.json'), {
        version: 1,
        hooks: {
            beforeShellExecution: [
                { command: 'node "$CURSOR_PROJECT_DIR/.cursor/kit-hooks/privacy-block.mjs" --platform cursor', timeout: 10 },
                { command: 'node "$CURSOR_PROJECT_DIR/.cursor/kit-hooks/scout-block.mjs" --platform cursor', timeout: 10 },
            ],
            beforeReadFile: [
                { command: 'node "$CURSOR_PROJECT_DIR/.cursor/kit-hooks/privacy-block.mjs" --platform cursor', timeout: 10 },
                { command: 'node "$CURSOR_PROJECT_DIR/.cursor/kit-hooks/scout-block.mjs" --platform cursor', timeout: 10 },
            ],
        },
    });
    copyKitHooks(sourceRoot, path.join(cursorRoot, 'kit-hooks'));
}

// --- Codex CLI --------------------------------------------------------------

function generateCodex(sourceRoot, targetPath) {
    const agents = readAgents(sourceRoot);

    generateSharedSkills(sourceRoot, targetPath);
    for (const agent of agents) {
        const description = frontmatterField(agent.frontmatterText, 'description');
        const toml = toToml({ name: agent.name, description, developer_instructions: agent.body.trim() });
        writeFile(path.join(targetPath, '.codex', 'agents', `${agent.name}.toml`), toml);
    }
    writeJson(path.join(targetPath, '.codex', 'hooks.json'), {
        hooks: {
            SessionStart: [{ matcher: 'startup|resume|clear|compact', hooks: [
                { type: 'command', command: 'node "$(git rev-parse --show-toplevel)/.codex/kit-hooks/session-init.mjs"', timeout: 10 },
            ] }],
            PreToolUse: [
                { matcher: '.*', hooks: [
                    { type: 'command', command: 'node "$(git rev-parse --show-toplevel)/.codex/kit-hooks/privacy-block.mjs" --platform codex', timeout: 10 },
                    { type: 'command', command: 'node "$(git rev-parse --show-toplevel)/.codex/kit-hooks/scout-block.mjs" --platform codex', timeout: 10 },
                ] },
                { matcher: 'Write', hooks: [
                    { type: 'command', command: 'node "$(git rev-parse --show-toplevel)/.codex/kit-hooks/descriptive-name.mjs"', timeout: 10 },
                ] },
            ],
        },
    });
    copyKitHooks(sourceRoot, path.join(targetPath, '.codex', 'kit-hooks'));
}

// --- GitHub Copilot ---------------------------------------------------------

function generateCopilot(sourceRoot, targetPath) {
    const skills = readSkills(sourceRoot);
    const agents = readAgents(sourceRoot);
    const githubRoot = path.join(targetPath, '.github');

    writeFile(path.join(githubRoot, 'copilot-instructions.md'), renderOverview({
        skills, agents,
        skillsNote: '`.agents/skills/<name>/SKILL.md`',
        agentsNote: '`.github/agents/*.agent.md`',
        hookNote: '**2 hooks** (`.github/hooks/*.json` + `.github/kit-hooks/*.mjs`, confirmed for Copilot cloud agent + Copilot CLI - VS Code Chat hook support is NOT confirmed by official docs): `privacy-block` and `scout-block` on `preToolUse`. `session-init` and `descriptive-name` are not wired - Copilot hooks are not confirmed to inject context.',
        commandsNote: 'No prompt files are shipped - this kit has no slash-command layer for any runtime. Copilot loads the shared Agent Skills bundle from `.agents/skills/<name>/SKILL.md` when relevant.',
    }));

    generateSharedSkills(sourceRoot, targetPath);
    for (const agent of agents) {
        const fm = yamlFrontmatter({ name: agent.name, description: frontmatterField(agent.frontmatterText, 'description') });
        writeFile(path.join(githubRoot, 'agents', `${agent.name}.agent.md`), fm + agent.body);
    }
    writeJson(path.join(githubRoot, 'hooks', 'hooks.json'), {
        version: 1,
        hooks: {
            preToolUse: [
                {
                    type: 'command',
                    matcher: '.*',
                    bash: 'node ".github/kit-hooks/privacy-block.mjs" --platform copilot',
                    powershell: 'node ".github/kit-hooks/privacy-block.mjs" --platform copilot',
                    timeoutSec: 10,
                },
                {
                    type: 'command',
                    matcher: '.*',
                    bash: 'node ".github/kit-hooks/scout-block.mjs" --platform copilot',
                    powershell: 'node ".github/kit-hooks/scout-block.mjs" --platform copilot',
                    timeoutSec: 10,
                },
            ],
        },
    });
    copyKitHooks(sourceRoot, path.join(githubRoot, 'kit-hooks'));
}

// --- Antigravity --------------------------------------------------------------

function generateAntigravity(sourceRoot, targetPath) {
    const skills = readSkills(sourceRoot);
    const agents = readAgents(sourceRoot);
    const agentsRoot = path.join(targetPath, '.agents');

    writeFile(path.join(agentsRoot, 'rules', 'kit-overview.md'), renderOverview({
        skills, agents,
        skillsNote: '`.agents/skills/<name>/SKILL.md`',
        agentsNote: '`.agents/agents/*.md`, `subagent: true`',
        hookNote: '**2 hooks** (`.agents/hooks.json` + `.agents/kit-hooks/*.mjs`) on `PreToolUse`: `privacy-block` blocks reading/writing sensitive files like `.env`, `.pem`, `credentials*` and protects `.hs.json` from unattended edits; `scout-block` blocks scans of generated/dependency directories and repository-wide globs. `SessionStart`/`session-init` is **unsupported** and is not wired because Antigravity has no confirmed semantically equivalent context-injection event; `descriptive-name` is also not wired.',
        commandsNote: 'Commands are not ported in this pass - Antigravity\'s workflow file path under `.agents/` is not confirmed by official docs beyond UI-driven creation, so no workflow files are shipped rather than guessing a path.',
    }));

    generateSharedSkills(sourceRoot, targetPath);
    for (const agent of agents) {
        const fm = yamlFrontmatter({ name: agent.name, description: frontmatterField(agent.frontmatterText, 'description'), subagent: true });
        writeFile(path.join(agentsRoot, 'agents', `${agent.name}.md`), fm + agent.body);
    }
    writeJson(path.join(agentsRoot, 'hooks.json'), {
        'privacy-block': {
            enabled: true,
            PreToolUse: [{ matcher: '.*', hooks: [{ type: 'command', command: 'node "$(git rev-parse --show-toplevel)/.agents/kit-hooks/privacy-block.mjs" --platform antigravity', timeout: 10 }] }],
        },
        'scout-block': {
            enabled: true,
            PreToolUse: [{ matcher: '.*', hooks: [{ type: 'command', command: 'node "$(git rev-parse --show-toplevel)/.agents/kit-hooks/scout-block.mjs" --platform antigravity', timeout: 10 }] }],
        },
    });
    copyKitHooks(sourceRoot, path.join(agentsRoot, 'kit-hooks'));
}

const GENERATORS = {
    cursor: generateCursor,
    codex: generateCodex,
    copilot: generateCopilot,
    antigravity: generateAntigravity,
};

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 2) {
        args[argv[i].replace(/^--/, '')] = argv[i + 1];
    }
    return args;
}

export function generate(runtime, sourceRoot, targetPath) {
    const generator = GENERATORS[runtime];
    if (!generator) throw new Error(`Unknown runtime: ${runtime}`);
    generator(sourceRoot, targetPath);
}

function main() {
    const { runtime, source, target } = parseArgs(process.argv.slice(2));
    if (!runtime || !source || !target) {
        process.stderr.write('Usage: generate-runtime.mjs --runtime <cursor|codex|copilot|antigravity> --source <dir> --target <dir>\n');
        return 1;
    }
    try {
        generate(runtime, source, target);
    } catch (error) {
        process.stderr.write(`generate-runtime.mjs failed for runtime "${runtime}": ${error.message}\n`);
        return 1;
    }
    process.stdout.write(`Generated ${runtime} runtime content at ${target}\n`);
    return 0;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
    process.exitCode = main();
}
