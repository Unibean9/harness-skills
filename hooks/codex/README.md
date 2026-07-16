Merge `hooks.json.snippet` into `~/.codex/hooks.json` (user-wide) or
`.codex/hooks.json` (this project only). It wires all four hooks:
`session-state.mjs` on `SessionStart`, `privacy-block.mjs` + `ship-gate.mjs`
on `PreToolUse`, `monitoring.mjs` on `PostToolUse`.

The `"matcher": "shell"` value has to match whatever Codex currently names
its shell/exec tool — check `https://developers.openai.com/codex/hooks` for
the current value if these stop firing after a Codex CLI update. The event
names and the exit-code contract are the stable part.
