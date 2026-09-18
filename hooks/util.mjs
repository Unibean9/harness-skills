import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function findProjectRoot(startDirectory) {
    let current = path.resolve(startDirectory || process.cwd());
    while (true) {
        if (fs.existsSync(path.join(current, '.hs.json'))) return current;
        const parent = path.dirname(current);
        if (parent === current) return null;
        current = parent;
    }
}

// Reads the project's .hs.json. Missing or unreadable config yields {} so every
// caller falls back to its own defaults.
export function readHsConfig(startDirectory = process.cwd()) {
    const root = findProjectRoot(startDirectory);
    if (!root) return { root: null, config: {} };
    try {
        return { root, config: JSON.parse(fs.readFileSync(path.join(root, '.hs.json'), 'utf8')) ?? {} };
    } catch {
        return { root, config: {} };
    }
}

export function isHookEnabled(config, key, defaultValue = true) {
    return config?.guardrails?.hooks?.[key]?.enabled ?? defaultValue;
}

export async function readStdinJson() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    return raw ? JSON.parse(raw) : {};
}

export function isMainModule(importMetaUrl) {
    return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(importMetaUrl);
}

// The platforms this kit wires PreToolUse gates into. Anything else fails closed so a
// typo in a wiring file can never silently turn a gate into an allow.
export const KNOWN_PLATFORMS = new Set(['claude', 'cursor', 'codex', 'copilot', 'kiro', 'antigravity']);

export function readPlatform(argv = process.argv.slice(2)) {
    const index = argv.indexOf('--platform');
    return index === -1 ? 'codex' : argv[index + 1]; // no flag: the stricter hard-block path
}

const TOOL_NAME_ALIASES = {
    bash: 'Bash', shell: 'Bash', run_shell_command: 'Bash',
    read: 'Read', view: 'Read', read_file: 'Read',
    write: 'Write', create: 'Write', write_file: 'Write',
    edit: 'Edit', str_replace: 'Edit', multiedit: 'MultiEdit', notebookedit: 'NotebookEdit',
    glob: 'Glob', grep: 'Grep',
};

// Runtimes shape PreToolUse payloads differently: Claude/Codex send tool_name +
// tool_input, Cursor sends the fields top-level, Copilot sends toolName + toolArgs (JSON).
export function normalizeToolEvent(event = {}) {
    let toolInput = event.tool_input ?? event.toolArgs ?? event;
    if (typeof toolInput === 'string') {
        try {
            toolInput = JSON.parse(toolInput);
        } catch {
            toolInput = { command: toolInput };
        }
    }
    if (!toolInput || typeof toolInput !== 'object') toolInput = {};
    const rawName = event.tool_name ?? event.toolName ?? '';
    const toolName = TOOL_NAME_ALIASES[String(rawName).toLowerCase()] ?? rawName;
    if (toolName) return { toolName, toolInput };
    return { toolName: typeof toolInput.command === 'string' ? 'Bash' : 'Read', toolInput };
}

// Quote-aware split of a shell command into words; operators and redirects are delimiters.
export function lexShellWords(command) {
    const words = [];
    let value = '';
    let started = false;
    let quote = null;
    const flush = () => {
        if (started) words.push(value);
        value = '';
        started = false;
    };
    for (let index = 0; index < command.length; index++) {
        const char = command[index];
        if (quote) {
            if (char === '\\' && quote === '"' && index + 1 < command.length) value += command[++index];
            else if (char === quote) quote = null;
            else value += char;
            continue;
        }
        if (/\s/.test(char) || '<>()|;&'.includes(char)) {
            flush();
            continue;
        }
        started = true;
        if (char === '"' || char === "'") quote = char;
        else if (char === '\\' && index + 1 < command.length && !/[A-Za-z0-9]/.test(command[index + 1])) value += command[++index];
        else value += char;
    }
    flush();
    return words;
}

// Splits on &&, ||, |, ;, & and unquoted newlines, keeping quoted text intact.
export function splitCompoundCommand(command) {
    const parts = [];
    let current = '';
    let quote = null;
    for (let index = 0; index < command.length; index++) {
        const char = command[index];
        if (quote) {
            current += char;
            if (char === '\\' && quote === '"' && index + 1 < command.length) current += command[++index];
            else if (char === quote) quote = null;
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            current += char;
            continue;
        }
        const isBackgroundAmp = char === '&' && command[index - 1] !== '>' && command[index + 1] !== '>';
        if (char === ';' || char === '\n' || char === '|' || isBackgroundAmp) {
            parts.push(current);
            current = '';
            if ((char === '|' || char === '&') && command[index + 1] === char) index++;
            continue;
        }
        current += char;
    }
    parts.push(current);
    return parts.map((part) => part.trim()).filter(Boolean);
}

// A heredoc body is text being written, not a path being touched; its redirect target
// on the opening line is kept.
const HEREDOC = /<<-?\s*(['"]?)([A-Za-z_]\w*)\1([^\n]*)\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g;

export function stripHeredocBodies(command) {
    return command.replace(HEREDOC, (_match, _quote, _delimiter, restOfLine) => ` ${restOfLine}`);
}

const COMMAND_WRAPPERS = new Set(['sudo', 'env', 'nice', 'nohup', 'time', 'timeout']);
// Commands whose first positional argument is a search pattern, not a path.
const PATTERN_ARG_COMMANDS = new Set(['grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'sed', 'awk', 'gawk', 'jq', 'perl']);
const PATTERN_FLAGS = new Set(['-e', '--regexp', '--include', '-name', '-iname']);
const EXCLUDE_FLAGS = new Set(['--exclude', '--exclude-dir', '--ignore', '--skip', '--prune', '-x', '-path', '-not']);
// Interpreter flags whose value is inline source code.
const EVAL_FLAGS = new Set(['-e', '-p', '-c', '--eval', '--print']);

// Splits a Bash command into the words that may name files: no executable, no flags,
// no search patterns, no exclude values, no heredoc bodies. Inline eval source
// (node -e "...") is broken into path-like fragments so a quoted read is still seen.
export function commandPathArguments(command) {
    const results = [];
    for (const segment of splitCompoundCommand(stripHeredocBodies(command))) {
        const words = lexShellWords(stripCommitMessage(segment));
        let index = 0;
        while (index < words.length && (COMMAND_WRAPPERS.has(words[index]) || /^[A-Za-z_]\w*=/.test(words[index]))) {
            const assignment = words[index].match(/^[A-Za-z_]\w*=(.+)$/);
            if (assignment) results.push({ executable: '', value: assignment[1] });
            index++;
        }
        const executable = path.basename((words[index] ?? '').replace(/\\/g, '/')).toLowerCase().replace(/\.exe$/, '');
        let patternPending = PATTERN_ARG_COMMANDS.has(executable);
        let skipNext = false;
        let evalNext = false;
        for (const word of words.slice(index + 1)) {
            if (evalNext) {
                evalNext = false;
                for (const fragment of word.match(/[^\s"'`|;&<>(){}[\],]+/g) ?? []) results.push({ executable, value: fragment });
                continue;
            }
            if (skipNext) {
                skipNext = false;
                continue;
            }
            if (word.startsWith('-')) {
                if (EVAL_FLAGS.has(word) && !PATTERN_ARG_COMMANDS.has(executable)) evalNext = true;
                else if (EXCLUDE_FLAGS.has(word)) skipNext = true;
                else if (PATTERN_FLAGS.has(word)) {
                    skipNext = true;
                    patternPending = false;
                }
                continue;
            }
            if (patternPending) {
                patternPending = false;
                continue;
            }
            results.push({ executable, value: word });
        }
    }
    return results;
}

// A commit message is prose about the change, not a path the command touches.
const GIT_COMMIT = /^\s*git\s+(?:-\S+\s+)*commit\b/;
const HEREDOC_BODY = /<<-?\s*(['"]?)([A-Za-z_]\w*)\1[\s\S]*?\n\s*\2\s*$/m;
const COMMIT_MESSAGE_ARGUMENT = /(?:^|\s)(?:-[A-Za-z]*[mF]|--message|--file)(?:=|\s+)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\S+)/g;

export function stripCommitMessage(command) {
    if (!GIT_COMMIT.test(command)) return command;
    return command.replace(HEREDOC_BODY, ' ').replace(COMMIT_MESSAGE_ARGUMENT, ' ');
}

// Emits a PreToolUse gate decision. Only Claude Code has an interactive 'ask'; every
// other platform ignores or mishandles it, so there it collapses to a hard block.
export function emitGateDecision(platform, reason) {
    if (platform === 'claude') {
        process.stdout.write(`${JSON.stringify({
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'ask',
                permissionDecisionReason: reason,
            },
        })}\n`);
        return 0;
    }
    process.stderr.write(`${reason}\n`);
    return 2;
}

// Exit-code contract: 0 = allow, 2 = block, 1 = hook errored and the tool proceeds.
// Unreadable input fails open; a crash while judging a specific call fails closed,
// since crafted tool_input could otherwise trigger the crash on demand.
export async function runGate(name, evaluate) {
    const platform = readPlatform();
    if (!KNOWN_PLATFORMS.has(platform)) {
        process.stderr.write(`hs-skills ${name}: unrecognized --platform "${platform}" - failing closed.\n`);
        return 2;
    }
    let event;
    try {
        event = await readStdinJson();
    } catch (error) {
        process.stderr.write(`hs-skills ${name} could not parse its input (${error.message}). Allowing the tool.\n`);
        return 1;
    }
    let decision;
    try {
        decision = evaluate(event);
    } catch (error) {
        process.stderr.write(`hs-skills ${name} crashed while evaluating this tool call (${error.message}). Blocking.\n`);
        return 2;
    }
    return decision.action === 'allow' ? 0 : emitGateDecision(platform, decision.reason);
}
