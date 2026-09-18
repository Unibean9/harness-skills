#!/usr/bin/env node
// PreToolUse (Write) hook: adds file-naming guidance as context. Never blocks and
// never returns a permission decision - Codex rejects "allow" without updatedInput.
//
// Standalone port of the AgentKit `descriptive-name.cjs` hook. On/off lives in
// `.hs.json` -> guardrails.hooks.descriptiveName.enabled (default on).

import { isHookEnabled, isMainModule, readHsConfig } from './util.mjs';

export const NAMING_GUIDANCE = `## File naming guidance:
- Skip this guidance if you are creating markdown or plain text files
- Prefer kebab-case for JS/TS/Python/shell (.js, .ts, .py, .sh) with descriptive names
- Respect language conventions: C#/Java/Kotlin/Swift use PascalCase (.cs, .java, .kt, .swift), Go/Rust use snake_case (.go, .rs)
- Other languages: follow their ecosystem's standard naming convention
- Goal: self-documenting names for LLM tools (Grep, Glob, Search)`;

if (isMainModule(import.meta.url)) {
    try {
        if (isHookEnabled(readHsConfig().config, 'descriptiveName')) {
            process.stdout.write(`${JSON.stringify({
                hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: NAMING_GUIDANCE },
            })}\n`);
        }
    } catch (error) {
        process.stderr.write(`hs-skills descriptive-name hook failed (${error.message}); continuing.\n`);
    }
}
