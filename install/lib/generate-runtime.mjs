#!/usr/bin/env node
// Generates one runtime's on-disk format directly from this kit's canonical
// source (agents/, commands/hs/, skills/, hooks/) - skills/agents/commands
// are the single source of truth; this file is the code that maps them into
// each runtime's own shape. No static per-runtime mirror is checked into the
// repo, so adding/editing a skill/agent/command here is immediately reflected
// in every runtime the next time install.ps1/install.sh runs.
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

function readCommands(sourceRoot) {
    return readNamedMarkdownFiles(path.join(sourceRoot, 'commands', 'hs'));
}

// Every skill that carries a <HARD-GATE> references the shared canonical
// shape at `../_shared/hard-gate.md` (see skills/_shared/hard-gate.md) with
// its own {scope} and any extra clause inlined in that same sentence. Other
// runtimes don't have a guaranteed `_shared/` folder alongside the ported
// file, so the gate is dereferenced/inlined here instead of copied by
// reference - scope and extra text still come straight from the source
// file, not a second hardcoded table.
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

// Claude Code's own `hs:name` slash-command phrasing is meaningless outside
// Claude Code - every other runtime invokes the ported file by its own name.
function stripHsPrefix(body) {
    return body.replace(/`hs:([a-z-]+)`/g, '`$1`');
}

function transformSkillBody(body) {
    return stripHsPrefix(inlineHardGate(stripSkillSuffix(body)));
}

// Source commands/hs/<name>.md bodies are one templated sentence
// ("Invoke `hs:name` with $ARGUMENTS.") plus an optional trailing clause
// (e.g. plan.md: "Produce plans only; do not implement application code.").
// Extract that trailing clause so it survives into the ported command/prompt
// without hand-copying it per runtime.
function commandExtraClause(name, body) {
    const re = new RegExp('^Invoke `hs:' + name + '` with `?\\$ARGUMENTS`?\\.\\s*([\\s\\S]*)$');
    const m = body.trim().match(re);
    return m && m[1].trim() ? m[1].trim() : '';
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

const KIT_HOOK_SCRIPTS = ['guard-rails.mjs', 'dev-rules-reminder.mjs', 'util.mjs'];

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
- Before committing, pushing, or opening a pull request, treat each as a
  separately confirmed step - never chain all three automatically.
`;
}

// --- Cursor ---------------------------------------------------------------

function generateCursor(sourceRoot, targetPath) {
    const skills = readSkills(sourceRoot);
    const agents = readAgents(sourceRoot);
    const commands = readCommands(sourceRoot);
    const cursorRoot = path.join(targetPath, '.cursor');

    for (const skill of skills) {
        const fm = yamlFrontmatter({ description: frontmatterField(skill.frontmatterText, 'description'), alwaysApply: false });
        writeFile(path.join(cursorRoot, 'rules', `${skill.name}.mdc`), fm + transformSkillBody(skill.body));
    }
    for (const agent of agents) {
        const fm = yamlFrontmatter({ name: agent.name, description: frontmatterField(agent.frontmatterText, 'description'), model: 'inherit' });
        writeFile(path.join(cursorRoot, 'agents', `${agent.name}.md`), fm + agent.body);
    }
    for (const command of commands) {
        const description = frontmatterField(command.frontmatterText, 'description');
        const extra = commandExtraClause(command.name, command.body);
        const fm = yamlFrontmatter({ description });
        const body = `Invoke the \`${command.name}\` rule with the arguments given after this command.${extra ? ` ${extra}` : ''}\n`;
        writeFile(path.join(cursorRoot, 'commands', `${command.name}.md`), fm + body);
    }
    writeJson(path.join(cursorRoot, 'hooks.json'), {
        version: 1,
        hooks: {
            beforeShellExecution: [{ command: 'node "$CURSOR_PROJECT_DIR/.cursor/kit-hooks/guard-rails.mjs" --platform cursor', timeout: 10 }],
            beforeReadFile: [{ command: 'node "$CURSOR_PROJECT_DIR/.cursor/kit-hooks/guard-rails.mjs" --platform cursor', timeout: 10 }],
            beforeSubmitPrompt: [{ command: 'node "$CURSOR_PROJECT_DIR/.cursor/kit-hooks/dev-rules-reminder.mjs"', timeout: 10 }],
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
    for (const agent of agents) {
        const description = frontmatterField(agent.frontmatterText, 'description');
        const toml = toToml({ name: agent.name, description, developer_instructions: agent.body.trim() });
        writeFile(path.join(targetPath, '.codex', 'agents', `${agent.name}.toml`), toml);
    }
    writeJson(path.join(targetPath, '.codex', 'hooks.json'), {
        hooks: {
            PreToolUse: [{ matcher: '.*', hooks: [{ type: 'command', command: 'node "$(git rev-parse --show-toplevel)/.codex/kit-hooks/guard-rails.mjs" --platform codex', timeout: 10 }] }],
            UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node "$(git rev-parse --show-toplevel)/.codex/kit-hooks/dev-rules-reminder.mjs"', timeout: 10 }] }],
        },
    });
    copyKitHooks(sourceRoot, path.join(targetPath, '.codex', 'kit-hooks'));
}

// --- GitHub Copilot ---------------------------------------------------------

function generateCopilot(sourceRoot, targetPath) {
    const skills = readSkills(sourceRoot);
    const agents = readAgents(sourceRoot);
    const commands = readCommands(sourceRoot);
    const githubRoot = path.join(targetPath, '.github');

    writeFile(path.join(githubRoot, 'copilot-instructions.md'), renderOverview({
        skills, agents,
        skillsNote: '`.github/instructions/*.instructions.md`',
        agentsNote: '`.github/agents/*.agent.md`',
        hookNote: '**2 hooks** (`.github/hooks/*.json` + `.github/kit-hooks/*.mjs`, confirmed for Copilot cloud agent + Copilot CLI - VS Code Chat hook support is NOT confirmed by official docs, see `docs/RUNTIME-MAPPING.md` in the source kit repo): `dev-rules-reminder` and `guard-rails`.',
        commandsNote: `**${commands.length} prompt files** (\`.github/prompts/*.prompt.md\`, invoked as \`/<name>\` in VS Code Copilot Chat) mirroring the skills above.`,
    }));

    for (const skill of skills) {
        const fm = yamlFrontmatter({ applyTo: '"**"', description: frontmatterField(skill.frontmatterText, 'description') });
        writeFile(path.join(githubRoot, 'instructions', `${skill.name}.instructions.md`), fm + transformSkillBody(skill.body));
    }
    for (const agent of agents) {
        const fm = yamlFrontmatter({ name: agent.name, description: frontmatterField(agent.frontmatterText, 'description') });
        writeFile(path.join(githubRoot, 'agents', `${agent.name}.agent.md`), fm + agent.body);
    }
    for (const command of commands) {
        const description = frontmatterField(command.frontmatterText, 'description');
        const extra = commandExtraClause(command.name, command.body);
        const fm = yamlFrontmatter({ mode: 'agent', description });
        const body = `Follow the \`${command.name}\` instructions for: \${input:args}${extra ? ` ${extra}` : ''}\n`;
        writeFile(path.join(githubRoot, 'prompts', `${command.name}.prompt.md`), fm + body);
    }
    writeJson(path.join(githubRoot, 'hooks', 'hooks.json'), {
        preToolUse: [{ matcher: '.*', command: 'node "$(git rev-parse --show-toplevel)/.github/kit-hooks/guard-rails.mjs" --platform copilot', timeout: 10 }],
        userPromptSubmitted: [{ command: 'node "$(git rev-parse --show-toplevel)/.github/kit-hooks/dev-rules-reminder.mjs"', timeout: 10 }],
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
        writeFile(path.join(kiroRoot, 'steering', `${skill.name}.md`), fm + transformSkillBody(skill.body));
    }
    for (const agent of agents) {
        const fm = yamlFrontmatter({
            name: agent.name,
            description: frontmatterField(agent.frontmatterText, 'description'),
            tools: kiroToolsField(agent.frontmatterText),
        });
        writeFile(path.join(kiroRoot, 'agents', `${agent.name}.md`), fm + agent.body);
    }
    writeJson(path.join(kiroRoot, 'hooks', 'guard-rails.kiro.hook'), kiroHookFile(
        'guard-rails',
        'Blocks reads/writes of sensitive files and protects .hs.json from unattended edits.',
        'PreToolUse',
        'node "$(git rev-parse --show-toplevel)/.kiro/kit-hooks/guard-rails.mjs" --platform kiro',
    ));
    writeJson(path.join(kiroRoot, 'hooks', 'dev-rules-reminder.kiro.hook'), kiroHookFile(
        'dev-rules-reminder',
        'Periodically re-injects core working rules into the session.',
        'UserPromptSubmit',
        'node "$(git rev-parse --show-toplevel)/.kiro/kit-hooks/dev-rules-reminder.mjs"',
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
        hookNote: '**1 hook** (`.agents/hooks.json` + `.agents/kit-hooks/*.mjs`): `guard-rails` on `PreToolUse` - blocks reading/writing sensitive files like `.env`, `.pem`, `credentials*`, and protects `.hs.json` from being edited unattended by the agent. `dev-rules-reminder` is **not wired** - Antigravity has no confirmed `UserPromptSubmit`-equivalent event.',
        commandsNote: 'Commands are not ported in this pass - Antigravity\'s workflow file path under `.agents/` is not confirmed by official docs beyond UI-driven creation, so no workflow files are shipped rather than guessing a path.',
    }));

    for (const skill of skills) {
        const fm = yamlFrontmatter({ name: skill.name, description: frontmatterField(skill.frontmatterText, 'description') });
        writeFile(path.join(agentsRoot, 'skills', `${skill.name}.md`), fm + transformSkillBody(skill.body));
    }
    for (const agent of agents) {
        const fm = yamlFrontmatter({ name: agent.name, description: frontmatterField(agent.frontmatterText, 'description'), subagent: true });
        writeFile(path.join(agentsRoot, 'agents', `${agent.name}.md`), fm + agent.body);
    }
    writeJson(path.join(agentsRoot, 'hooks.json'), {
        'guard-rails': {
            enabled: true,
            PreToolUse: [{ matcher: '.*', hooks: [{ type: 'command', command: 'node "$(git rev-parse --show-toplevel)/.agents/kit-hooks/guard-rails.mjs" --platform antigravity', timeout: 10 }] }],
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
