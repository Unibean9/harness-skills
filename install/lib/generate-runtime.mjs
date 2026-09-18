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
// CLI: node generate-runtime.mjs --runtime <cursor|codex|copilot|kiro|antigravity> --source <dir> --target <dir>

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

function frontmatterListField(frontmatterText, field) {
    const value = frontmatterField(frontmatterText, field);
    if (!value) return [];
    return value.split(',').map((s) => s.trim()).filter(Boolean);
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

// Skill bodies and references point at their resources with paths relative to
// the skill directory (`references/x.md`, `../_shared/y.md`,
// `../hs-other/references/z.md`). Runtimes that keep a directory per skill
// (Codex) get those folders copied beside SKILL.md, so the paths work as-is.
// Runtimes that flatten a skill into one rule/instructions/steering file get
// the folders copied under a workspace-relative `resourcesRel` instead, and
// every such path is rewritten to point there.
const SKILL_RELATIVE_PATH_RE = /`((?:\.\.\/)+[^`\s]+|references\/[^`\s]+)`/g;
const REFERENCE_RELATIVE_PATH_RE = /`((?:\.\.\/)+[^`\s]+|SKILL\.md)`/g;

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

function rewriteFlatSkillPaths(body, skillName, resourcesRel) {
    return body.replace(SKILL_RELATIVE_PATH_RE, (_, rel) => `\`${path.posix.join(resourcesRel, skillName, rel)}\``);
}

// Copies references + _shared under targetPath/resourcesRel and rewrites the
// copied reference files so their own links resolve from the workspace root.
// skillFileRel(name) is the flattened skill file a reference's `SKILL.md` means.
function portFlatSkillResources(sourceRoot, targetPath, resourcesRel, skillFileRel) {
    const resourcesDir = path.join(targetPath, resourcesRel);
    copySkillResources(sourceRoot, resourcesDir);
    for (const skill of readSkills(sourceRoot)) {
        const refsDir = path.join(resourcesDir, skill.name, 'references');
        if (!fs.existsSync(refsDir)) continue;
        const base = path.posix.join(resourcesRel, skill.name, 'references');
        for (const file of fs.readdirSync(refsDir).filter((f) => f.endsWith('.md'))) {
            const filePath = path.join(refsDir, file);
            const raw = fs.readFileSync(filePath, 'utf8');
            fs.writeFileSync(filePath, raw.replace(REFERENCE_RELATIVE_PATH_RE, (_, rel) => (
                rel === 'SKILL.md' ? `\`${skillFileRel(skill.name)}\`` : `\`${path.posix.join(base, rel)}\``
            )));
        }
    }
}

function yamlFrontmatter(fields) {
    const lines = Object.entries(fields)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => {
            if (Array.isArray(v)) return `${k}: [${v.map((x) => JSON.stringify(x)).join(', ')}]`;
            return `${k}: ${v}`;
        });
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
    const skills = readSkills(sourceRoot);
    const agents = readAgents(sourceRoot);
    const cursorRoot = path.join(targetPath, '.cursor');

    for (const skill of skills) {
        const fm = yamlFrontmatter({ description: frontmatterField(skill.frontmatterText, 'description'), alwaysApply: false });
        writeFile(path.join(cursorRoot, 'rules', `${skill.name}.mdc`), fm + rewriteFlatSkillPaths(transformSkillBody(skill.body), skill.name, '.cursor/hs-skills'));
    }
    portFlatSkillResources(sourceRoot, targetPath, '.cursor/hs-skills', (name) => `.cursor/rules/${name}.mdc`);
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
    const skills = readSkills(sourceRoot);
    const agents = readAgents(sourceRoot);

    for (const skill of skills) {
        const fm = yamlFrontmatter({ name: skill.name, description: frontmatterField(skill.frontmatterText, 'description') });
        writeFile(path.join(targetPath, '.agents', 'skills', skill.name, 'SKILL.md'), fm + transformSkillBody(skill.body));
    }
    copySkillResources(sourceRoot, path.join(targetPath, '.agents', 'skills'));
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
        skillsNote: '`.github/instructions/*.instructions.md`',
        agentsNote: '`.github/agents/*.agent.md`',
        hookNote: '**2 hooks** (`.github/hooks/*.json` + `.github/kit-hooks/*.mjs`, confirmed for Copilot cloud agent + Copilot CLI - VS Code Chat hook support is NOT confirmed by official docs, see `docs/RUNTIME-MAPPING.md` in the source kit repo): `privacy-block` and `scout-block` on `preToolUse`. `session-init` and `descriptive-name` are not wired - Copilot hooks are not confirmed to inject context.',
        commandsNote: 'No prompt files are shipped - this kit has no slash-command layer for any runtime. Copilot Chat picks up each skill from `.github/instructions/*.instructions.md` by matching the task to its description, the same way Claude Code does natively.',
    }));

    for (const skill of skills) {
        const fm = yamlFrontmatter({ applyTo: '"**"', description: frontmatterField(skill.frontmatterText, 'description') });
        writeFile(path.join(githubRoot, 'instructions', `${skill.name}.instructions.md`), fm + rewriteFlatSkillPaths(transformSkillBody(skill.body), skill.name, '.github/hs-skills'));
    }
    portFlatSkillResources(sourceRoot, targetPath, '.github/hs-skills', (name) => `.github/instructions/${name}.instructions.md`);
    for (const agent of agents) {
        const fm = yamlFrontmatter({ name: agent.name, description: frontmatterField(agent.frontmatterText, 'description') });
        writeFile(path.join(githubRoot, 'agents', `${agent.name}.agent.md`), fm + agent.body);
    }
    writeJson(path.join(githubRoot, 'hooks', 'hooks.json'), {
        preToolUse: [
            { matcher: '.*', command: 'node "$(git rev-parse --show-toplevel)/.github/kit-hooks/privacy-block.mjs" --platform copilot', timeout: 10 },
            { matcher: '.*', command: 'node "$(git rev-parse --show-toplevel)/.github/kit-hooks/scout-block.mjs" --platform copilot', timeout: 10 },
        ],
    });
    copyKitHooks(sourceRoot, path.join(githubRoot, 'kit-hooks'));
}

// --- Kiro --------------------------------------------------------------

// Confirmed via kiro.dev/docs/chat/subagents/ - Kiro's own tools vocabulary,
// distinct from Claude's (Read/Bash/Write/Edit/...). Mapping many Claude
// tool names onto one Kiro category is expected (e.g. Read/Glob/Grep all
// mean "read").
const CLAUDE_TOOL_TO_KIRO = { Read: 'read', Glob: 'read', Grep: 'read', Bash: 'shell', Write: 'write', Edit: 'write' };

function kiroToolsField(frontmatterText) {
    const tools = frontmatterListField(frontmatterText, 'tools');
    if (tools.length === 0) return undefined;
    return [...new Set(tools.map((t) => CLAUDE_TOOL_TO_KIRO[t] ?? 'read'))];
}

function kiroHookFile(name, description, trigger, command) {
    return {
        version: 'v1',
        hooks: [{
            name,
            description,
            trigger,
            ...(trigger === 'PreToolUse' ? { matcher: '.*' } : {}),
            action: { type: 'command', command },
            timeout: 10,
            enabled: true,
        }],
    };
}

function generateKiro(sourceRoot, targetPath) {
    const skills = readSkills(sourceRoot);
    const agents = readAgents(sourceRoot);
    const kiroRoot = path.join(targetPath, '.kiro');

    for (const skill of skills) {
        const fm = yamlFrontmatter({ inclusion: 'manual', description: frontmatterField(skill.frontmatterText, 'description') });
        writeFile(path.join(kiroRoot, 'steering', `${skill.name}.md`), fm + rewriteFlatSkillPaths(transformSkillBody(skill.body), skill.name, '.kiro/hs-skills'));
    }
    portFlatSkillResources(sourceRoot, targetPath, '.kiro/hs-skills', (name) => `.kiro/steering/${name}.md`);
    for (const agent of agents) {
        const fm = yamlFrontmatter({
            name: agent.name,
            description: frontmatterField(agent.frontmatterText, 'description'),
            tools: kiroToolsField(agent.frontmatterText),
        });
        writeFile(path.join(kiroRoot, 'agents', `${agent.name}.md`), fm + agent.body);
    }
    writeJson(path.join(kiroRoot, 'hooks', 'privacy-block.kiro.hook'), kiroHookFile(
        'privacy-block',
        'Blocks reads/writes of sensitive files and protects .hs.json from unattended edits.',
        'PreToolUse',
        'node "$(git rev-parse --show-toplevel)/.kiro/kit-hooks/privacy-block.mjs" --platform kiro',
    ));
    writeJson(path.join(kiroRoot, 'hooks', 'scout-block.kiro.hook'), kiroHookFile(
        'scout-block',
        'Blocks scans of generated/dependency directories, archived plans, and repository-wide globs.',
        'PreToolUse',
        'node "$(git rev-parse --show-toplevel)/.kiro/kit-hooks/scout-block.mjs" --platform kiro',
    ));
    copyKitHooks(sourceRoot, path.join(kiroRoot, 'kit-hooks'));
}

// --- Antigravity --------------------------------------------------------------

function generateAntigravity(sourceRoot, targetPath) {
    const skills = readSkills(sourceRoot);
    const agents = readAgents(sourceRoot);
    const agentsRoot = path.join(targetPath, '.agents');

    writeFile(path.join(agentsRoot, 'rules', 'kit-overview.md'), renderOverview({
        skills, agents,
        skillsNote: '`.agents/skills/*.md`',
        agentsNote: '`.agents/agents/*.md`, `subagent: true`',
        hookNote: '**2 hooks** (`.agents/hooks.json` + `.agents/kit-hooks/*.mjs`) on `PreToolUse`: `privacy-block` blocks reading/writing sensitive files like `.env`, `.pem`, `credentials*` and protects `.hs.json` from unattended edits; `scout-block` blocks scans of generated/dependency directories and repository-wide globs. `session-init` and `descriptive-name` are **not wired** - Antigravity has no confirmed context-injection hook event.',
        commandsNote: 'Commands are not ported in this pass - Antigravity\'s workflow file path under `.agents/` is not confirmed by official docs beyond UI-driven creation, so no workflow files are shipped rather than guessing a path.',
    }));

    for (const skill of skills) {
        const fm = yamlFrontmatter({ name: skill.name, description: frontmatterField(skill.frontmatterText, 'description') });
        writeFile(path.join(agentsRoot, 'skills', `${skill.name}.md`), fm + rewriteFlatSkillPaths(transformSkillBody(skill.body), skill.name, '.agents/hs-skills'));
    }
    portFlatSkillResources(sourceRoot, targetPath, '.agents/hs-skills', (name) => `.agents/skills/${name}.md`);
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
    kiro: generateKiro,
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
        process.stderr.write('Usage: generate-runtime.mjs --runtime <cursor|codex|copilot|kiro|antigravity> --source <dir> --target <dir>\n');
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
