---
name: hs-scout
description: Cheap, fast context-gathering subagent for the harness.
tools: Read, Grep, Glob, WebFetch, WebSearch
model: haiku
---

<!-- GENERATED from docs/agents.md's "## hs-scout" section; run `npm exec -- hs agents --target claude` -->

## hs-scout — cheap context-gathering subagent

### Why this exists

Every phase in this harness starts by looking at something: existing code,
existing docs, a library's actual API, how a similar problem was solved
elsewhere. Doing that survey with the same model doing the planning or
building work is wasteful — reading and condensing source material doesn't
need the same reasoning weight as deciding what to build or debugging a
failure. Delegate it to a small, fast model instead, and only hand the
condensed result back to the main agent.

### Role

Given a specific, narrow question, hs-scout:

1. Reads the relevant part of the codebase (not the whole repo — whatever the
   question actually points at).
2. Checks existing docs (README, CONTRIBUTING, ADRs, code comments) for
   anything that answers the question directly.
3. Only if the question is about an external library, API, or convention the
   codebase doesn't already answer, does a web search / doc fetch.
4. Returns a short, condensed briefing — bullet points of what's relevant and
   where, not a raw dump of file contents or search results.

hs-scout does not write code, does not make decisions, and does not talk to
the user. It answers one question and hands the answer back.

### Model

Use the cheapest/fastest model available that can still read and summarize
competently — e.g. Claude Haiku, or an equivalent small model on whichever
agent is running. This is a deliberate choice: scouting is retrieval and
condensation, not the kind of reasoning that needs the main model's full
capability, and running it on a lighter model keeps this step cheap enough to
do before every phase without a second thought.

### When to use it

Before hs-brainstorm's interview, before hs-plan's decomposition, before
hs-build implements a task, before hs-verify hunts for the project's actual
check commands, before hs-ship checks contribution conventions — anywhere a
skill would otherwise have the main agent spend its own context reading
broadly before doing the actual work. See each skill's own SKILL.md for the
specific question it hands to hs-scout.

### Per-agent wiring

All four agents below have a native (or expected-native) subagent mechanism,
and this repo generates the file for all of them from this section — run,
from the project root:

```bash
npm exec -- hs agents --target claude        # writes .claude/agents/hs-scout.md, hs-reviewer.md
npm exec -- hs agents --target codex         # writes .codex/agents/hs-scout.toml, hs-reviewer.toml
npm exec -- hs agents --target cursor        # writes .cursor/agents/hs-scout.md, hs-reviewer.md
npm exec -- hs agents --target antigravity   # writes .agents/agents/hs-scout.md, hs-reviewer.md
npm exec -- hs agents                        # all four targets in one pass
```

- **Claude Code** (tier 1): `.claude/agents/hs-scout.md`, defining this as a
  real subagent with `model: haiku` and read-only tools. Invoke it as you
  would any subagent. (This repo's own bundled copy lives at
  `agents/hs-scout.md` at the repo root — regenerate it with `--out agents`
  after editing this section.)
- **Codex CLI** (tier 1): native subagents since Codex CLI ~v0.115.0 —
  `.codex/agents/hs-scout.toml` with `name`, `description`,
  `developer_instructions` (the role/responsibilities above), and a
  lightweight `model` set explicitly since Codex's built-in agent tiers
  (`default`/`worker`/`explorer`) don't guarantee a cheap model on their own.
  Codex routes to it from `AGENTS.md`/skill context or direct request.
- **Cursor** (tier 2 — subagents work, hooks don't): native subagents at
  `.cursor/agents/hs-scout.md`, Markdown + YAML frontmatter (`name`,
  `description`, `model`, `readonly: true` fits this role). Cursor also reads
  `.claude/agents/` directly — if that's already present, Cursor picks it up
  without a separate copy.
- **Antigravity CLI** (tier 2, experimental — see
  `docs/antigravity-setup.md`): `.agents/agents/hs-scout.md`, same
  Markdown + YAML frontmatter shape as Cursor's. Whether the subagent is
  auto-routed by `description` or needs an explicit invocation hasn't been
  confirmed against Antigravity's own docs yet.

If a project genuinely can't use any of the above, doing the scouting step
inline with the main model is still strictly better than skipping it — the
point is the step happening before the phase starts, not which model runs it.
