# Using harness-skills with Claude Code

This repo is a real Claude Code plugin — `.claude-plugin/plugin.json` at the
root. No files get copied into your project; the plugin loads `skills/`,
`hooks/hooks.json`, and `agents/` directly from wherever it's installed.

## Install

**One command (full standard structure — skills + subagents + hooks):**

```bash
npm exec -- hs setup --target claude
```

Writes `.claude/skills/`, `.claude/agents/hs-scout.md`/`hs-reviewer.md`,
`.claude/hooks/` (+ the runtime scripts they import), and a
`.claude/settings.json` wiring the four hooks. Requires the package installed
locally (`npm i -D github:Unibean9/harness-skills`).

**Fast path (skills only, no guardrails):**

```
npx skills add Unibean9/harness-skills -a claude-code
```

Places the six `hs-*` skills into `.claude/skills/`. It does not wire
`hooks/hooks.json` or the `hs-scout`/`hs-reviewer` subagents — for those you
need the plugin install below. Fine for a quick trial of the workflow itself.

**Plugin install (skills + hooks + subagents):**

```
/plugin marketplace add Unibean9/harness-skills
/plugin install harness-skills
```

`.claude-plugin/plugin.json` intentionally declares no `skills`/`hooks`
fields — Claude Code auto-discovers the root `skills/`, `hooks/hooks.json`,
and `agents/hs-scout.md`/`agents/hs-reviewer.md` by convention once the
plugin is installed.

Local development (iterating on this repo itself, no publishing):

```
/plugin marketplace add ./
```

run from this repo's root, which reads `.claude-plugin/marketplace.json`.
Editing any `skills/*/SKILL.md` or `hooks/*.mjs` takes effect on the plugin's
next load — no build or sync step.

## Usage

Start a session in a project where the plugin is installed and describe what
you want. Claude Code should reach for `hs-brainstorm` on its own from the
skill's `description` frontmatter; if it doesn't the first few times, invoke
it explicitly (`Use the hs-brainstorm skill`) until the triggering is proven
out. From there the five/six-phase flow in `AGENTS.md` takes over.

## How it works

- `.claude-plugin/plugin.json` — the plugin manifest. Declares `name`,
  `version`, `description`, author/license metadata — nothing about
  `skills`/`hooks` paths, since Claude Code finds those by convention at the
  plugin root.
- `hooks/hooks.json` — auto-wires the four hooks
  (`privacyBlock`/`shipGate`/`sessionState`/`monitoring`) via
  `${CLAUDE_PLUGIN_ROOT}`-relative commands on `SessionStart`, `PreToolUse`,
  `PostToolUse`. No manual settings merge needed once installed as a plugin.
- `agents/hs-scout.md`, `agents/hs-reviewer.md` — real Claude Code subagents,
  generated from `docs/agents.md` (`npm exec -- hs agents --target claude
  --out agents`). Invoke them with the Agent tool like any other subagent.
- `skills/<name>/SKILL.md` — the six harness skills, unchanged across agents.

## Troubleshooting

| Symptom | Check |
|---|---|
| Skill never triggers | Re-read the skill's `description` frontmatter — it's what Claude Code matches against. Invoke it by name a few times to confirm the workflow itself is right, independent of triggering. |
| Hooks don't seem to run | Confirm the plugin actually installed (`/plugin list` or equivalent) and that `hs.settings.json`'s relevant key has `"enabled": true`. |
| Ship gate blocks a commit unexpectedly | Run `npm exec -- hs attest validate` — it fails on any worktree change since the last `hs-verify` attest, by design. |
| `agents/hs-scout.md` looks stale after editing `docs/agents.md` | Regenerate: `npm exec -- hs agents --target claude --out agents`. |
