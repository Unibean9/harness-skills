# Using harness-skills with Cursor

`.cursor-plugin/plugin.json` at the repo root declares `"skills":
"./skills/"` for skill discovery. This is the current, honest state of
Cursor support in this repo — skill discovery only, no guardrail hooks yet.

## Install

Point Cursor at this repo using its plugin-install mechanism, referencing
`.cursor-plugin/plugin.json`. If Cursor's build doesn't auto-discover a
`skills` manifest field, fall back to reading `skills/*/SKILL.md` directly —
each skill's frontmatter is plain YAML with no Cursor-specific requirements.

## Usage

Describe the task; Cursor should match against `skills/*/SKILL.md`'s
`name`/`description` frontmatter the same way it would any project skill. If
it doesn't trigger on its own, invoke the relevant skill by name the first
few times.

## Hooks: not wired yet

The four guardrail hooks (`privacyBlock`, `shipGate`, `sessionState`,
`monitoring`) are **not available for Cursor in this repo**. The specific
blocker: `hooks/session-state.mjs` hardcodes Claude Code's JSON output shape
(`hookSpecificOutput.additionalContext`); pointing Cursor's hook config at it
unmodified would silently inject nothing rather than fail loudly, which is
worse than not wiring it at all. Adapting the script to detect Cursor and
emit its actual expected shape is a reasonable next step, not done here
without a way to verify the shape against a real Cursor session.

Skills work fully without hooks — this is a missing enforcement layer, not a
missing workflow.

## How it works

- `.cursor-plugin/plugin.json` — manifest with `skills: "./skills/"`, no
  `hooks` field (deliberately omitted rather than pointing at something
  unverified).
- `skills/<name>/SKILL.md` — same files every other agent reads.

## Troubleshooting

| Symptom | Check |
|---|---|
| Skills not found | Confirm Cursor is reading `.cursor-plugin/plugin.json`'s `skills` field, or fall back to pointing it at `skills/*/SKILL.md` directly. |
| Expecting hook-based guardrails (privacy block, ship gate) | Not implemented for Cursor yet — see "Hooks: not wired yet" above. The workflow (skills) works; the enforcement layer (hooks) doesn't, for this agent, today. |
| A skill's behavior differs from Claude Code's | It shouldn't — `skills/*/SKILL.md` is the one canonical source every agent reads unmodified. If it does differ, that's a bug worth reporting, not an intentional per-agent variation. |
