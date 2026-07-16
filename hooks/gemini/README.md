Merge `settings.snippet.json` into `~/.gemini/settings.json` (user-wide) or
`.gemini/settings.json` (this project only). It wires all four hooks:
`session-state.mjs` on `SessionStart`, `privacy-block.mjs` + `ship-gate.mjs`
on `BeforeTool`, `monitoring.mjs` on `AfterTool`.

The `"matcher": "run_shell_command"` value has to match whatever Gemini CLI
currently names its shell-execution tool — check
`https://geminicli.com/docs/hooks/reference/` for the current value if these
stop firing after a Gemini CLI update. The event names and the `deny`/exit-2
contract are the stable part.
