# Using harness-skills with Codex CLI

`.codex-plugin/plugin.json` at the repo root declares `"skills": "./skills/"`
and an empty `hooks` object — Codex surfaces skills natively and runs no
session-start hook, so the empty object exists specifically to suppress
Codex from trying to auto-load Claude Code's `hooks/hooks.json`.

## Install

**One command (full standard structure — skills + subagents + hooks):**

```bash
npm exec -- hs setup --target codex --with-hooks
```

Writes `.codex/skills/`, `.codex/agents/hs-scout.toml`/`hs-reviewer.toml`/`hs-shipper.toml`,
`.codex/hooks/` (+ the runtime scripts they import), and `.codex/hooks.json`
pointing at them. Requires the package installed locally
(`npm i -D github:Unibean9/harness-skills`).

**Fast path (skills only):** `npx skills add Unibean9/harness-skills -a codex`
places the six `hs-*` skills where Codex looks for them. It doesn't touch
`.codex/hooks.json`, so pair it with the hooks step below if you want
guardrails.

**Native plugin (Codex CLI v0.122+):**

```bash
codex plugin marketplace add Unibean9/harness-skills
```

This reads `.codex-plugin/plugin.json` directly off the repo — same manifest
the fast path above targets, just installed as a real plugin instead of
copied files. Older Codex CLI versions don't have `plugin marketplace add`;
if yours doesn't, the installed `skills/` still work as long as this repo is
the working directory or a parent context Codex reads instructions from — no
plugin mechanism is required for the skills themselves to be readable and
usable.

## Usage

Describe the task; Codex should surface a matching skill from `skills/`
based on its `name`/`description` frontmatter. If it doesn't, point at the
skill directly the first few times.

## Hooks (optional, manual)

The four guardrail hooks (`privacyBlock`, `shipGate`, `sessionState`,
`monitoring`) aren't auto-wired for Codex the way they are for Claude Code's
plugin install. Merge `hooks/codex/hooks.json.snippet` into
`.codex/hooks.json` (project) or `~/.codex/hooks.json` (user) to get
`SessionStart`, `PreToolUse`, and `PostToolUse` coverage for `Bash` and
`apply_patch`. This requires trusting the project's `.codex/` layer and any
changed hooks — Codex's own trust model, not something this repo can bypass.

## Subagents (optional)

Codex CLI has native subagents (TOML files, one per agent, at
`.codex/agents/` project-level or `~/.codex/agents/` personal). Generate
`hs-scout`, `hs-reviewer`, and `hs-shipper` for Codex with one command, from
the project root:

```bash
npm exec -- hs agents --target codex
```

This writes `.codex/agents/hs-scout.toml`, `.codex/agents/hs-reviewer.toml`,
and `.codex/agents/hs-shipper.toml` from `docs/agents.md`'s source content —
`name`, `description`, and `developer_instructions` for each role (`hs-scout`
and `hs-shipper` get a lightweight `model`; `hs-reviewer` stays at Codex's
default reasoning tier, since independence matters more than cost there). See
`docs/agents.md`'s
"Per-agent wiring" for the specifics of each role. Codex ships three
built-in agents (`default`/`worker`/`explorer`) that these don't replace.

## How it works

- `.codex-plugin/plugin.json` — manifest with `skills: "./skills/"`,
  `hooks: {}`.
- `skills/<name>/SKILL.md` — same files every supported agent reads; nothing
  Codex-specific in them.
- `hooks/codex/hooks.json.snippet` — the manual-merge hook config, separate
  from Claude Code's auto-wired `hooks/hooks.json` because Codex's hook
  schema and trust model differ.
- `.codex/agents/*.toml` — generated per project by `npm exec -- hs agents
  --target codex`, per the Subagents section above.

## Troubleshooting

| Symptom | Check |
|---|---|
| Skills not found | Confirm Codex is actually reading `.codex-plugin/plugin.json`'s `skills` path, or that this repo is the working directory / a read context. |
| Hooks don't fire after merging the snippet | Codex requires the project's `.codex/` layer to be trusted and the specific hooks to be reviewed/trusted — check Codex's own trust prompts, not this repo's config. |
| Privacy/ship-gate coverage feels incomplete | By design — matchers cover `Bash` and `apply_patch` only; this is a guardrail, not a complete privacy or ship boundary (see `hooks/README.md`). |
