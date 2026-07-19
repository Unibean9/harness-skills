# Using harness-skills with Antigravity CLI

**Tier 2 (experimental) — but skills/subagents paths below are confirmed,
not guessed.** Antigravity CLI (`agy`) is Google's successor to Gemini CLI,
announced May 2026, and its engine carries over Gemini CLI's Agent Skills,
Hooks, and Subagents (rebranded as Antigravity plugins).

## Confirmed project-level convention (mid-2026)

Multiple independent sources agree the project-level convention is a
**`.agents/` directory at the workspace root**, not a dedicated
`.antigravity/` directory:

- Skills: `.agents/skills/<name>/SKILL.md`
- Project instructions: `.agents/agents.md`
- Installed skills are read natively since Antigravity CLI v1.20.3 (March
  2026)
- Global (user-level) skills fall back to `~/.gemini/config/skills/` — the
  one location recognized across AGY, AGY CLI, and AGY IDE
- Plugin install: `agy plugin install <url-or-path>`, landing at
  `~/.gemini/antigravity-cli/plugins/<name>/`

Subagent folder naming under `.agents/` (this repo generates
`.agents/agents/hs-scout.md`) is the best-supported guess by analogy with the
skills/instructions pattern above, not independently confirmed the same way —
some sources instead describe a separate `.subagents/` directory. Treat that
one path as still unverified; everything else above has converging
independent confirmation.

## Install

**One command (skills + subagents, hooks not wired):**

```bash
npm exec -- hs setup --target antigravity
```

Writes `.agents/skills/hs-*` and `.agents/agents/hs-scout.md`,
`hs-reviewer.md`, `hs-shipper.md`. Requires the package installed locally
(`npm i -D github:Unibean9/harness-skills`).

**Skills only:**

```bash
npx skills add Unibean9/harness-skills -a antigravity
```

**Subagents on their own:**

```bash
npm exec -- hs agents --target antigravity   # writes .agents/agents/hs-scout.md, hs-reviewer.md, hs-shipper.md
```

**Native plugin:** `agy plugin install <this-repo-url-or-local-path>` should
work directly, since Antigravity's plugin/skill discovery already looks for
`skills/` and reads installed skill instructions. Not yet
independently verified against a real Antigravity CLI install; report back if
you try it.

## Hooks (not wired)

No Antigravity hooks snippet ships with this repo yet. The hooks system is
reported to carry over Gemini CLI's JSON format and lifecycle
(`SessionStart`/`SessionEnd`, `BeforeAgent`/`AfterAgent`, `BeforeModel`/
`AfterModel`, `BeforeTool`/`AfterTool`, `PreCompress`, `Notification`), but
the exact project-level config file path for hooks specifically was not
confirmed during this round of research (unlike skills/agents.md above).
Until it is, `privacyBlock`/`shipGate`/`sessionState`/`monitoring` do not run
automatically on this agent — rely on the workflow's own gates (spec/plan
approval, `hs attest` before shipping) as the enforcement layer here.

## Troubleshooting

| Symptom | Check |
|---|---|
| Unsure if you're on Gemini CLI or Antigravity CLI | Check which binary/package is actually installed — Gemini CLI and Antigravity CLI are separate, actively-developed products during this transition. |
| Skills not found | Confirm `.agents/skills/hs-*` landed where your Antigravity build actually looks — `agy inspect` (if your build has it) reports which config files it loaded. |
| Hooks don't fire | Expected — see "Hooks (not wired)" above. Rely on the workflow's own approval gates for this agent until a confirmed hook path exists. |
| Subagents don't route automatically | The `.agents/agents/` subagent folder name is the least-confirmed part of this setup — if it doesn't work, try invoking hs-scout/hs-reviewer/hs-shipper's role inline instead, or check whether your build expects `.subagents/` instead. |
