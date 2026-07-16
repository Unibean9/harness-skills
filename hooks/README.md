# Hooks — the enforced layer

Every skill in `.agents/skills/` tells the agent what to do and gives it a
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
| `ship-gate.mjs` | `PreToolUse` | `shipGate` | Blocks `git commit`/`git push`/`gh pr create`-style commands (from `blockCommands`) unless `.harness/state/verify-all.status` already says `PASS`. |
| `session-state.mjs` | `SessionStart` | `sessionState` | Reads `.harness/state/current-spec` to find the active spec, digests its `spec.md`/`plan.md`/`progress.md`/`implement-notes.md`, and writes/injects that digest — so a fresh session doesn't miss what a prior one already established. |
| `monitoring.mjs` | `PreToolUse` / `PostToolUse` | `monitoring` | Appends one line per tool call to `.harness/state/audit.log` — an audit trail independent of what any transcript claims happened. |

They're separate files on purpose: turning one off, changing its trigger
event, or replacing its logic doesn't touch the other three, and a new
guardrail later is a new file plus a new `hs.settings.json` key, not an edit
to an existing one. `hooks/lib/common.mjs` holds the bits genuinely shared
between them (reading stdin JSON, glob matching, appending a log line) — that
one's a library, not a hook, and isn't wired to any event itself.

## Cross-agent support

Claude Code, Codex CLI, and Gemini CLI have all converged on essentially the
same hook contract: a lifecycle event fires before/after a tool call (or at
session start), the payload arrives as JSON on stdin, and the hook allows
(exit 0) or blocks (exit 2, or an explicit `deny`/`block` decision in JSON)
with a reason relayed back to the model. Only the wiring differs:

- `claude-code/settings.snippet.json` — merge into `.claude/settings.json`
- `codex/hooks.json.snippet` — merge into `.codex/hooks.json`
- `gemini/settings.snippet.json` — merge into `.gemini/settings.json`

Each per-agent folder has a short README noting the detail most likely to
drift with CLI updates: the exact tool name each agent uses in `matcher`
(Claude Code: `Bash`/`Read`; Codex: `shell`; Gemini: `run_shell_command`) and
the exact event names for session-start/after-tool. If a snippet stops firing
after an agent update, check that first against current docs — the overall
shape (event -> stdin JSON -> exit code) is the stable part.

**Requires Node.js** on PATH — already true of any machine running Claude
Code, Codex CLI, or Gemini CLI, so this adds no new dependency.

## What's not wired yet

Only these four. Adding another guardrail (e.g. a `PreToolUse` guard on
editing source files during `hs-brainstorm`, before the spec is approved)
means: a new key in `hs.settings.json`, a new `hooks/<name>.mjs` reading it,
and one line added to each of the three wiring snippets.
