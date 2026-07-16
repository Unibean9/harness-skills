# Hooks — the enforced layer

Every skill in `skills/` tells the agent what to do and gives it a
script to check its own work. That's *guidance* — the agent can still, in
principle, ignore the script or misreport its result. A hook removes that
possibility for the specific case it covers: it's a check the harness runs
automatically, outside the model's discretion, at a fixed point in the
tool-call loop. In terms of the harness's five frames, a hook still lives in
**Tools** — it's just the branch of Tools the *application* invokes, not the
branch the model chooses to invoke.

`hs.settings.json` at the repo root is the actual config each hook reads —
but deliberately minimal: an `enabled` switch per hook, plus only the couple
of fields that genuinely vary per project (`privacyBlock.denyList`/`allowList`,
`shipGate.blockCommands`). Where a path or a required value would otherwise be
a config field, it's a fixed harness convention baked into the script instead
(e.g. the verify verdict always lives at `.harness/state/verify-all.status`,
the audit log always at `.harness/state/audit.log`) — one less thing to get
out of sync between the config and what the rest of the harness expects.

## One script per concern

Four hooks, each wired to the event that actually fits it, each reading its
own top-level key out of `hs.settings.json`:

| Script | Event | `hs.settings.json` key | Does |
|---|---|---|---|
| `privacy-block.mjs` | `PreToolUse` | `privacyBlock` | Blocks reading/referencing a path matching `denyList` unless it's also in `allowList` (e.g. blocks `.env`, allows `.env.example`). |
| `ship-gate.mjs` | `PreToolUse` | `shipGate` | Blocks `git commit`/`git push`/`gh pr create`-style commands (from `blockCommands`) unless a valid, spec-and-worktree-bound attestation exists (see `scripts/attestation.mjs`) — a hand-edited `.harness/state/verify-all.status` string alone is not enough. |
| `session-state.mjs` | `SessionStart` | `sessionState` | Reads `.harness/state/current-spec` to find the active spec, digests its `spec.md`/`plan.md`/`progress.md`/`implement-notes.md`, and writes/injects that digest — so a fresh session doesn't miss what a prior one already established. |
| `monitoring.mjs` | `PreToolUse` / `PostToolUse` | `monitoring` | Appends one line per tool call to `.harness/state/audit.log` — an audit trail independent of what any transcript claims happened. |

They're separate files on purpose: turning one off, changing its trigger
event, or replacing its logic doesn't touch the other three, and a new
guardrail later is a new file plus a new `hs.settings.json` key, not an edit
to an existing one. `hooks/lib/common.mjs` holds the bits genuinely shared
between them (reading stdin JSON, glob matching, appending a log line) — that
one's a library, not a hook, and isn't wired to any event itself.

## Cross-agent support

The hook payload and decision semantics are agent-specific. Merge the matching
snippet without assuming coverage beyond the listed matcher.

| Agent | Destination | Events and matched tools | Coverage limitation |
|---|---|---|---|
| Claude Code | root `hooks/hooks.json`, auto-wired when installed via `.claude-plugin/plugin.json` (not installed as a plugin? copy `hooks/hooks.json`'s `hooks` key into `.claude/settings.json` and replace `${CLAUDE_PLUGIN_ROOT}` with `${CLAUDE_PROJECT_DIR}`) | `SessionStart`; `PreToolUse` for `Read\|Write\|Edit\|Bash`; `PostToolUse` for `.*` | Ship gate only sees `Bash`; privacy is limited to those four tools. |
| Codex CLI | `.codex/hooks.json` or `~/.codex/hooks.json` | `SessionStart`; `PreToolUse`/`PostToolUse` for `Bash|apply_patch` | Project hooks require trusted project configuration and reviewed hooks. Unmatched paths are not intercepted. |
| Gemini CLI | `.gemini/settings.json` or `~/.gemini/settings.json` | `SessionStart`; `BeforeTool` for `read_file|write_file|replace|run_shell_command`; `AfterTool` for `.*` | Matchers depend on current Gemini tool names; ship gate only sees `run_shell_command`. |
| Cursor | not wired | — | `.cursor-plugin/plugin.json` declares skill discovery only. `session-state.mjs` hardcodes Claude Code's `hookSpecificOutput.additionalContext` JSON shape — pointing Cursor at it unmodified would inject nothing (Cursor expects a top-level `additional_context` field per third-party reference implementations). Needs a per-harness branch before it's safe to wire, the same way `privacy-block.mjs`/`ship-gate.mjs`/`monitoring.mjs` would need Cursor's actual `PreToolUse`/`PostToolUse`-equivalent event names confirmed first. |

Ship gate recognizes only simple `git commit`, `git push`, and `gh pr create`
invocations (including documented global options). Shell chaining, aliases, and
obfuscated commands are outside this guardrail boundary. A valid structured
verification attestation for the selected spec and worktree is required.

All hook commands require **Node.js on `PATH`**. The audit log is a mutable,
redacted operational record, not tamper-proof forensic evidence. The current Codex and Gemini
snippets also resolve from `git rev-parse --show-toplevel`, so they require
**Git on `PATH`**. Review the per-agent README and official vendor hook
reference after upgrading a CLI; a configured hook is a scoped guardrail, not
a universal privacy or audit boundary.

## What's not wired yet

Only these four. Adding another guardrail (e.g. a `PreToolUse` guard on
editing source files during `hs-brainstorm`, before the spec is approved)
means: a new key in `hs.settings.json`, a new `hooks/<name>.mjs` reading it,
and one line added to each of the three wiring snippets.
