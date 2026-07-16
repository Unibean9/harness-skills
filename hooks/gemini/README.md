Merge `settings.snippet.json` into `~/.gemini/settings.json` (user-wide) or
`.gemini/settings.json` (this project only). It wires all four hooks:
`session-state.mjs` on `SessionStart`, `privacy-block.mjs` + `ship-gate.mjs`
on `BeforeTool`, `monitoring.mjs` on `AfterTool`.

The snippet applies privacy checks to Gemini's built-in read, write, replace,
and shell tools; ship-gate applies only to `run_shell_command`; monitoring
uses `.*` to log every hookable tool call. Tool names must be rechecked against
the Gemini CLI hooks reference after a CLI update. Commands resolve from the
Git root, so Git and Node.js must be available. Each hook carries a
`commandWindows` variant (PowerShell, via `(git rev-parse --show-toplevel).Trim()`)
alongside the POSIX `command`, the same pattern as the Codex snippet, for
hosts where Gemini CLI invokes hooks without a POSIX shell.
