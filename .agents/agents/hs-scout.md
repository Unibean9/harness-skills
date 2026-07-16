# hs-scout — cheap context-gathering subagent

## Why this exists

Every phase in this harness starts by looking at something: existing code,
existing docs, a library's actual API, how a similar problem was solved
elsewhere. Doing that survey with the same model doing the planning or
building work is wasteful — reading and condensing source material doesn't
need the same reasoning weight as deciding what to build or debugging a
failure. Delegate it to a small, fast model instead, and only hand the
condensed result back to the main agent.

## Role

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

## Model

Use the cheapest/fastest model available that can still read and summarize
competently — e.g. Claude Haiku, or an equivalent small model on whichever
agent is running. This is a deliberate choice: scouting is retrieval and
condensation, not the kind of reasoning that needs the main model's full
capability, and running it on a lighter model keeps this step cheap enough to
do before every phase without a second thought.

## When to use it

Before hs-brainstorm's interview, before hs-plan's decomposition, before
hs-build implements a task, before hs-verify hunts for the project's actual
check commands, before hs-ship checks contribution conventions — anywhere a
skill would otherwise have the main agent spend its own context reading
broadly before doing the actual work. See each skill's own SKILL.md for the
specific question it hands to hs-scout.

## Per-agent wiring

- **Claude Code**: `.claude/agents/hs-scout.md` (installed by `install.sh` /
  `install.ps1`, same as skills) defines this as a real subagent with
  `model: haiku` and read-only tools. Invoke it as you would any subagent.
- **Codex CLI**: define an equivalent role under `.codex/agents/hs-scout.toml`
  with a lightweight model set — Codex's subagent config isn't wired
  automatically by this repo's installer yet; copy the responsibilities above
  into that file by hand.
- **Gemini CLI**: no dedicated subagent-definition mechanism as portable as
  Claude Code's at the time of writing. Approximate this by explicitly asking
  the agent, inline, to do a quick lightweight research pass before the main
  work — same responsibilities, without a separate model tier.

If no subagent mechanism is available at all, doing the scouting step inline
with the main model is still strictly better than skipping it — the point is
the step happening before the phase starts, not which model runs it.
