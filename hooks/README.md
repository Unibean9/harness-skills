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
`shipGate.blockCommands`, `monitoring.retention`). Where a path or a required value would otherwise be
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
| `session-state.mjs` | `SessionStart` | `sessionState` | Reads `.harness/state/current-spec` to find the active spec, computes the phase/next-skill answer (`scripts/next-skill.mjs`, same decision tree as `AGENTS.md`'s routing diagram — also runnable standalone as `hs status`), digests `spec.md`/`plan.md`/`progress.md`/`implement-notes.md`, and writes/injects both — so a fresh session doesn't miss what a prior one already established or have to re-derive which skill comes next. |
| `monitoring.mjs` | `PreToolUse` / `PostToolUse` | `monitoring` | Appends one line per tool call to `.harness/state/audit.log`, tagged with a fixed `category` (`ship`/`shell`/`file-write`/`file-read`/`other`) — an audit trail independent of what any transcript claims happened. Also trims the log to `monitoring.retention` (`maxLines`, default 5000; `maxAgeDays`, default 30) so it stays a bounded operational record instead of growing forever. Read it with `npm exec -- hs audit` (category counts, time range, last N entries) — a log nobody reads isn't evidence, so this is the intended consumer, not an afterthought. |

They're separate files on purpose: turning one off, changing its trigger
event, or replacing its logic doesn't touch the other three, and a new
guardrail later is a new file plus a new `hs.settings.json` key, not an edit
to an existing one. `hooks/lib/common.mjs` holds the bits genuinely shared
between them (reading stdin JSON, glob matching, appending a log line) — that
one's a library, not a hook, and isn't wired to any event itself.

## Cross-agent support

The hook payload and decision semantics are agent-specific. Merge the matching
snippet without assuming coverage beyond the listed matcher.

Four agents are supported, in two tiers — tier 1 (Claude Code, Codex CLI) has
all four hooks wired; tier 2 (Cursor, Antigravity CLI) is partial. Cursor now
has `ship-gate`/`privacy-block` wired (its two other events,
`session-state`/`monitoring`, aren't yet); Antigravity has none wired.

| Agent | Tier | Destination | Events and matched tools | Coverage limitation |
|---|---|---|---|---|
| Claude Code | 1 | root `hooks/hooks.json`, auto-wired when installed via `.claude-plugin/plugin.json` (not installed as a plugin? copy `hooks/hooks.json`'s `hooks` key into `.claude/settings.json` and replace `${CLAUDE_PLUGIN_ROOT}` with `${CLAUDE_PROJECT_DIR}`) | `SessionStart`; `PreToolUse` for `Read\|Write\|Edit\|Bash`; `PostToolUse` for `.*` | Ship gate only sees `Bash`; privacy is limited to those four tools. |
| Codex CLI | 1 | `.codex/hooks.json` or `[hooks]` in `config.toml` — project (`.codex/`) or user (`~/.codex/`) | `SessionStart`; `PreToolUse`/`PostToolUse` for `Bash|apply_patch` (Codex also exposes `SubagentStart`/`SubagentStop`/`UserPromptSubmit`/`PreCompact`/`PostCompact`/`Stop`, unused by this repo's snippet) | Non-managed hooks require explicit trust via Codex's `/hooks` command (content-hash keyed) before they fire — expected, not a bug. Unmatched paths are not intercepted. |
| Cursor | 2 (partial) | `.cursor/hooks.json` (project) or `~/.cursor/hooks.json` (user); confirmed schema (`{"version": 1, "hooks": {<event>: [{"command", "failClosed"}]}}`), stdin JSON, exit code 2 = deny / 0 = allow, `permission`/`user_message`/`agent_message` JSON on stdout | `ship-gate.mjs` + `privacy-block.mjs` wired to `beforeShellExecution` (both) and `beforeReadFile` (privacy-block only), `failClosed: true`. Cursor also has `sessionStart`/`sessionEnd`, `afterShellExecution`, `afterFileEdit`, `subagentStart`/`subagentStop`, `stop` — unused by this repo's snippet. | `session-state.mjs`/`monitoring.mjs` not wired for Cursor yet — their output shape (`hookSpecificOutput.additionalContext`) is Claude-specific and hasn't grown a Cursor branch. Windows invocation of the `$CURSOR_PROJECT_DIR`-based command string is unconfirmed. |
| Antigravity CLI | 2 (experimental) | expected to inherit Gemini CLI's hook engine and event set per Google's Antigravity CLI announcement — **not wired by this repo yet**, no snippet written | `SessionStart`/`SessionEnd`, `BeforeAgent`/`AfterAgent`, `BeforeModel`/`AfterModel`, `BeforeTool`/`AfterTool`, `PreCompress`, `Notification` (expected, unconfirmed for Antigravity specifically) | Exact config file location/naming for hooks specifically has not been independently confirmed (unlike its skills/agents.md paths, which now are — see `docs/antigravity-setup.md`). |

Ship gate recognizes only simple `git commit`, `git push`, and `gh pr create`
invocations (including documented global options). Shell chaining, aliases, and
obfuscated commands are outside this guardrail boundary. A valid structured
verification attestation for the selected spec and worktree is required.

All hook commands require **Node.js on `PATH`**. The audit log is a mutable,
redacted operational record, not tamper-proof forensic evidence. The current
Codex snippet also resolves from `git rev-parse --show-toplevel`, so it
requires **Git on `PATH`**. Review the per-agent README and official vendor
hook reference after upgrading a CLI; a configured hook is a scoped
guardrail, not a universal privacy or audit boundary.

## What's not wired yet

Only these four. Adding another guardrail (e.g. a `PreToolUse` guard on
editing source files during `hs-brainstorm`, before the spec is approved)
means: a new key in `hs.settings.json`, a new `hooks/<name>.mjs` reading it,
and one line added to each tier-1 wiring snippet.
