Merge `hooks.json.snippet` into `~/.codex/hooks.json` (user-wide) or
`.codex/hooks.json` (this project only). It wires all four hooks:
`session-state.mjs` on `SessionStart`, `privacy-block.mjs` + `ship-gate.mjs`
on `PreToolUse`, `monitoring.mjs` on `PostToolUse`.

Codex currently exposes `Bash` and `apply_patch` to these hook events. The
snippet checks privacy for both, while ship-gate only applies to `Bash` because
it checks shell commands. Codex does not currently intercept every possible
file-read or shell-execution path, so this is a guardrail, not a complete
privacy boundary. The commands resolve from the Git root; project-local hooks
also require Codex to trust the project's `.codex/` configuration layer.
