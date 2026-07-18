# harness-skills

**A small, portable spec-driven harness for coding agents.**

Skills encode the workflow senior engineers actually follow — spec before
code, small verifiable steps, real evidence before "done," a human in the
loop where it matters — packaged so an agent follows it consistently
regardless of which model or CLI is doing the work.

```
 BRAINSTORM        PLAN            BUILD          VERIFY          REVIEW          SHIP
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│   Idea   │──▶│  Spec +  │──▶│  Task-   │──▶│  Whole-  │──▶│  2nd     │──▶│  Human   │
│  Refine  │   │  Tasks   │   │ by-task  │   │  suite   │   │  opinion │   │  gate    │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
 hs-brainstorm   hs-plan        hs-build       hs-verify      hs-review       hs-ship
                                                                (advisory)
```

---

## Phases

Six skills, one per phase, each with an exit condition. `hs-brainstorm` and
`hs-plan` gate on explicit human approval; `hs-build` verifies task-by-task;
`hs-verify` is the whole-suite sensor — a versioned per-spec check manifest
and worktree-bound evidence make "done" a fact
instead of an opinion; `hs-review` gets an independent second opinion on the
diff (correctness/security/performance/quality/tests) and is advisory —
`hs-ship` doesn't require it to have run; `hs-ship` is the last gate and
never auto-commits or auto-pushes.

| Phase                                          | What it does                                                                         | Use when                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| [hs-brainstorm](skills/hs-brainstorm/SKILL.md) | Turns a vague ask into an approved, filed spec                                       | "what to build" isn't fully nailed down yet             |
| [hs-plan](skills/hs-plan/SKILL.md)             | Breaks an approved spec into small, ordered tasks, each with its own verify command  | Spec is approved, no code written yet                   |
| [hs-build](skills/hs-build/SKILL.md)           | Implements one task at a time, verifying each before moving on                       | Plan is approved, time to write code                    |
| [hs-verify](skills/hs-verify/SKILL.md)         | Runs the full test/lint/build suite as one pass, records a pass/fail verdict on disk | All tasks done, need a real answer to "is this working" |
| [hs-review](skills/hs-review/SKILL.md)         | Independent, structured review of the verified diff                                  | After a valid `hs-verify` attestation, before shipping  |
| [hs-ship](skills/hs-ship/SKILL.md)             | Final readiness checks, then commit/PR/push — only with explicit human confirmation  | Every task checked off, user wants to ship              |

Route from state, not memory — see `AGENTS.md` for the full decision tree
(`.harness/` missing → `hs-brainstorm`; spec approved but no plan →
`hs-plan`; and so on). A trivial one-line change (typo, config value) is
exempt from the full flow but still gets an `hs-verify` pass before it
ships. This README stays a map — the phase's own detail lives in its
`SKILL.md`, and the full flow lives in `AGENTS.md`.

---

## Install

**Fastest path — any agent, one command.** [vercel-labs/skills](https://github.com/vercel-labs/skills)
copies/symlinks `skills/hs-*/SKILL.md` into whichever agents it finds on your
machine:

```bash
npx skills add Unibean9/harness-skills --list   # preview the 6 skills first
npx skills add Unibean9/harness-skills          # install, prompts for which agents
```

Skills-only installs the instructions, not the executable runtime. In every
project that uses the workflow, also install this package locally so the
skills can run `npm exec -- hs` from any working directory. This package
isn't published to the npm registry yet — install straight from GitHub:

```bash
npm install --save-dev github:Unibean9/harness-skills
npm exec -- hs init                    # scaffolds .harness/, copies default hs.settings.json, updates .gitignore
npm exec -- hs setup --target claude   # writes the full standard structure for your agent
npm exec -- hs doctor                  # reports what's wired and what's still missing
```

`hs setup` accepts `--target claude|codex|gemini|cursor|antigravity` and
produces that agent's complete self-contained convention in one pass —
skills, generated `hs-scout`/`hs-reviewer` subagents, and hook wiring where
the agent's hook schema is supported (Claude: `.claude/settings.json`; Codex:
`.codex/hooks.json`; Gemini: `.gemini/settings.json`; Cursor/Antigravity:
skills + subagents only, with an honest note about why hooks aren't wired).

Runtime evidence lives in `.harness/state/` (gitignored by `hs init`);
durable spec history lives in `.harness/specs/` (commit it). For
hooks/subagents, install natively instead:

| Agent           | Skills-only command                                     | Native plugin (adds hooks/subagents where wired)                                                                                                                     |
| --------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code     | `npx skills add Unibean9/harness-skills -a claude-code` | `/plugin marketplace add Unibean9/harness-skills` then `/plugin install harness-skills`                                                                              |
| Codex CLI       | `npx skills add Unibean9/harness-skills -a codex`       | `codex plugin marketplace add Unibean9/harness-skills` (Codex CLI v0.122+); merge `hooks/codex/hooks.json.snippet` into `.codex/hooks.json` for guardrails           |
| Gemini CLI      | `npx skills add Unibean9/harness-skills -a gemini`      | `gemini extensions install <this-repo-url>`                                                                                                                          |
| Cursor          | `npx skills add Unibean9/harness-skills -a cursor`      | No marketplace command for this repo — sync `skills/hs-*` into `.cursor/skills/` and drop a short pointer rule in `.cursor/rules/*.mdc` (see `docs/cursor-setup.md`) |
| Antigravity CLI | `npx skills add Unibean9/harness-skills -a antigravity` | No plugin manifest for this repo yet — skills-only command above is the only path (see `docs/antigravity-setup.md`)                                                  |

"Native plugin" above is about installing _this repo's_ skills — it's
independent of whether the agent itself supports hooks/subagents (see
Compatibility and Subagents below; Cursor and Antigravity both have their
own native hook/subagent systems even though this repo hasn't shipped
config for either yet).

Per-agent details, guardrail coverage, and known gaps: `docs/claude-setup.md`,
`docs/codex-setup.md`, `docs/gemini-setup.md`, `docs/cursor-setup.md`,
`docs/antigravity-setup.md`.

Once installed, start the agent and ask for something — it should reach for
`hs-brainstorm` on its own. Developing this repo itself: `/plugin marketplace
add ./` from the repo root, no build step.

---

## Subagents

Two narrow jobs are worth delegating to a separate subagent rather than
doing inline with the main model — see `AGENTS.md` and `docs/agents.md` for
both roles and per-agent wiring:

| Subagent                             | Role                                                                                              | Use when                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [hs-scout](agents/hs-scout.md)       | Delegates broad reading — existing code, docs, an external API — to a cheap/fast subagent         | Before each phase, when the phase needs context the main model doesn't have loaded yet |
| [hs-reviewer](agents/hs-reviewer.md) | Reviews the verified diff from a context-independent subagent, not the same context that wrote it | `hs-review`, before shipping                                                           |

All five supported agents have a **native** subagent mechanism (Antigravity
inherits Gemini CLI's — see `docs/antigravity-setup.md`). Generate the
definition file for whichever one you're using with a single command, from
the project root:

```bash
npm exec -- hs agents                   # all four targets in one pass
npm exec -- hs agents --target codex    # just one
```

| Agent       | Where it's written                                              | Format                                                                                                                                  |
| ----------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code | `.claude/agents/hs-scout.md`, `.claude/agents/hs-reviewer.md`   | Markdown + YAML frontmatter                                                                                                              |
| Codex CLI   | `.codex/agents/hs-scout.toml`, `.codex/agents/hs-reviewer.toml` | TOML — `name`/`description`/`developer_instructions`                                                                                    |
| Gemini CLI  | `.gemini/agents/hs-scout.md`, `.gemini/agents/hs-reviewer.md`   | Markdown + YAML frontmatter, invoke with `@hs-scout`                                                                                    |
| Cursor      | `.cursor/agents/hs-scout.md`, `.cursor/agents/hs-reviewer.md`   | Same shape as Claude Code — and Cursor reads `.claude/agents/` directly, so no separate file is needed if that's already in the project |

This repo's own bundled Claude Code copy lives at `agents/hs-scout.md` /
`agents/hs-reviewer.md` at the repo root (`npm exec -- hs agents --target
claude --out agents` regenerates it after editing `docs/agents.md`). See
`docs/agents.md` for the source content behind every generated file. No
subagent mechanism at all on your agent? Do the same work inline instead —
scouting is still worth doing cheaply; review is still worth doing with a
fresh, deliberate re-read rather than skipping it.

---

## How it's enforced

Every skill tells the agent what to do and gives it a script to check its
own work — that's guidance, not enforcement. Four optional hooks turn the
specific cases below into checks the harness runs automatically, outside
the model's discretion:

| Hook                | Event                      | Does                                                                                                                                                                             |
| ------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `privacy-block.mjs` | `PreToolUse`               | Blocks reading/referencing a path matching `denyList` unless it's also in `allowList` (e.g. blocks `.env`, allows `.env.example`).                                               |
| `ship-gate.mjs`     | `PreToolUse`               | Blocks `git commit`/`git push`/`gh pr create`-style commands unless a valid, spec-and-worktree-bound verify attestation exists — a hand-edited status string alone isn't enough. |
| `session-state.mjs` | `SessionStart`             | Digests the active spec's `spec.md`/`plan.md`/`progress.md`/`implement-notes.md` into a session summary, so a fresh session doesn't miss what a prior one already established.   |
| `monitoring.mjs`    | `PreToolUse`/`PostToolUse` | Appends one line per matched tool call to an audit log, independent of what any transcript claims happened.                                                                      |

`hs.settings.json` at the repo root turns each on/off and holds the couple
of fields that genuinely vary per project (`privacyBlock`'s allow/deny
lists, `shipGate.blockCommands`). Skills work fully without hooks; hooks add
scoped enforcement on top. See `hooks/README.md` for the full per-agent
coverage table and known limits.

---

## Customizing

Nothing here is fixed law — this is a starting point meant to be adjusted per
project. But this package gets updated (`npm update`, a new plugin version),
and an update overwrites whatever it installed — so the question that
actually matters is *where* you customize, not just *whether* you can:

**Survives an update** — lives in your project, not in this package:
- **`hs.settings.json`** (copied into your project by `hs init`, then yours)
  turns the four hooks on/off and holds the couple of fields that genuinely
  vary per project (`privacyBlock`'s allow/deny lists, `shipGate.blockCommands`).
- **Your project's own `AGENTS.md`** — add test/lint/build commands or
  conventions specific to your codebase; skills read it first.
- Anything you add under `.harness/` itself (it's your project's state, this
  package never writes outside `.harness/state/` and `.harness/specs/`).

**Requires forking this package** — these files ship inside it and get
overwritten on update:
- **`skills/*/SKILL.md`** are plain markdown. Reword them, add
  project-specific failure modes, or collapse phases for a smaller setup —
  just keep each skill's frontmatter `name` matching its directory and give
  its `description` both what it does and when to use it, since that's what
  triggers it. If you maintain a fork, `npm run validate:skills` catches
  frontmatter drift and stale `node scripts/` references before you ship it.
- **`skills/*/references/*.md`** — the templates each skill points to.
- **Hook count**: four are wired (`privacyBlock`, `shipGate`, `sessionState`,
  `monitoring`, see `hooks/README.md`). Adding a guardrail is a new
  `hs.settings.json` key plus a new `hooks/<name>.mjs` — no change to the
  existing three.

---

## Compatibility

Two different questions, easy to conflate: does the _agent_ natively support
hooks/subagents at all, and has _this repo_ shipped config wiring its
guardrails/subagents to that agent. As of mid-2026, all five agents below
have native hooks and native subagents — this repo generates `hs-scout`/
`hs-reviewer` for all four (`npm exec -- hs agents`) and has wired its own
guardrail hooks natively for Claude Code, with snippets to merge by hand for
Codex and Gemini.

| Agent           | Instruction / skills                                         | Agent's native hooks                                                         | Agent's native subagents                                           | This repo's wiring                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code     | `AGENTS.md`; plugin auto-discovers root `skills/`            | Yes — `.claude/settings.json` / plugin `hooks.json`                          | Yes — `.claude/agents/*.md`                                        | Full: `hooks/hooks.json` auto-wires on install; `hs agents --target claude` generates `hs-scout`/`hs-reviewer`.                                                                         |
| Codex CLI       | `AGENTS.md` and `skills/` via `.codex-plugin/plugin.json`    | Yes, since ~v0.124.0 — `.codex/hooks.json` or `config.toml`                  | Yes, since ~v0.115.0 — `.codex/agents/*.toml`                      | Hooks: merge `hooks/codex/hooks.json.snippet`. Subagents: `hs agents --target codex` generates both TOML files.                                                                         |
| Gemini CLI      | `GEMINI.md` -> `AGENTS.md`, and `skills/`                    | Yes — `.gemini/settings.json`, more events than this repo's snippet uses     | Yes — `.gemini/agents/*.md`, invoke with `@name`                   | Hooks: merge `hooks/gemini/settings.snippet.json`. Subagents: `hs agents --target gemini` generates both files.                                                                         |
| Cursor          | `.cursor-plugin/plugin.json` declares `skills: "./skills/"`  | Yes — `.cursor/hooks.json`, own event/payload shape                          | Yes — `.cursor/agents/*.md`; also reads `.claude/agents/` directly | Hooks not wired yet — `hooks/*.mjs` don't emit Cursor's output shape. Subagents: `hs agents --target cursor` generates both files (or rely on `.claude/agents/` if already present).    |
| Antigravity CLI | No native manifest for this repo yet — `npx skills add` only | Yes, inherited from Gemini CLI's engine per Google's transition announcement | Yes, same inheritance                                              | Not wired — no hooks snippet, no plugin manifest for this repo yet (`docs/antigravity-setup.md`); Gemini-generated subagent files apply via the same inheritance.                       |

Known per-agent coverage limits where this repo _has_ wired something:
Claude Code's privacy hook only matches `Read`/`Write`/`Edit`/`Bash`, ship
gate only `Bash`; Codex's matchers cover `Bash`/`apply_patch` only, so
privacy is a guardrail, not a complete privacy boundary; Gemini's tool
names/hook semantics can shift across CLI releases — recheck the snippet
after upgrading.

Run `npm test` for the Node 22+ compatibility suite; CI runs the same
command. State/verification is Node-native — `scripts/state.mjs`,
`run-check.mjs`, `attestation.mjs`, `check-ship-ready.mjs` — zero dependency
beyond Node.js.

---

## Why this harness?

Agents default to the shortest path to "looks done" — which usually means
skipping the spec, self-reporting tests as passing, and shipping without a
second look. This harness makes each of those a checkpoint instead of a
vibe: a spec a human actually approved, a verify script that writes its
verdict to disk instead of the model's transcript, a ship gate that reads
that verdict rather than trusting it was mentioned. None of it depends on a
specific model or vendor — it's five (well, six) small markdown files and a
handful of zero-dependency Node scripts, so swapping which agent is doing
the work doesn't mean rebuilding the workflow.

---

## What's deliberately not here yet

- **No MCP server.** Custom tools are bundled Node utilities, not a typed
  `harness-state` server — a reasonable next step, not a first one.
- **No `hs-debug` skill.** Error-driven retry-then-escalate lives inside
  `hs-build`/`hs-verify` directly.
- **Cursor and Antigravity hook wiring.** Both have their own native hooks
  system now, but this repo's `hooks/*.mjs` scripts only emit Claude Code's
  JSON output shape — no Cursor or Antigravity snippet exists yet, so
  pointing either agent's hook config at these scripts unmodified would
  silently do nothing rather than fail loudly.
