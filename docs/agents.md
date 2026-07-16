# Subagents

This harness delegates two narrow jobs to a subagent instead of doing them
inline with the main model. Each is a single role with a single job — neither
invokes the other, and neither talks to the user directly; they answer one
question and hand the answer back to whichever skill dispatched them.

| Subagent | Role | Used by |
|---|---|---|
| [hs-scout](#hs-scout--cheap-context-gathering-subagent) | Cheap, fast context-gathering | Every phase, before its own work starts |
| [hs-reviewer](#hs-reviewer--independent-code-review-subagent) | Independent code review | `hs-review`, after `hs-verify` and before `hs-ship` |

Both are generated as real Claude Code subagents from this file — see
"Per-agent wiring" in each section below. Editing this file and regenerating
is the single source of truth; don't hand-edit `agents/hs-scout.md` or
`agents/hs-reviewer.md` directly, they're overwritten on the next generate.

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

- **Claude Code**: `agents/hs-scout.md` at the repo root (auto-discovered once
  installed as a plugin; regenerate with
  `node scripts/generate-claude-scout.mjs` after editing this section)
  defines this as a real subagent with `model: haiku` and read-only tools.
  Invoke it as you would any subagent.
- **Codex CLI**: define an equivalent role under `.codex/agents/hs-scout.toml`
  with a lightweight model set — Codex's subagent config isn't wired
  automatically by this repo yet; copy the responsibilities above into that
  file by hand.
- **Gemini CLI**: no dedicated subagent-definition mechanism as portable as
  Claude Code's at the time of writing. Approximate this by explicitly asking
  the agent, inline, to do a quick lightweight research pass before the main
  work — same responsibilities, without a separate model tier.
- **Cursor**: same situation as Codex/Gemini — no portable subagent-definition
  mechanism wired here yet; do the scouting pass inline with the main model.

If no subagent mechanism is available at all, doing the scouting step inline
with the main model is still strictly better than skipping it — the point is
the step happening before the phase starts, not which model runs it.

## hs-reviewer — independent code-review subagent

### Why this exists

The agent that just implemented a change is the worst-positioned reviewer of
that change — it already believes its own design decisions are correct, and
it's blind to exactly the assumptions it made along the way. A second,
context-independent pass catches what self-review structurally can't:
reviewing the diff without the accumulated justification for why each line
looks the way it does.

### Role

Given a diff (or a path to one) and the spec it's meant to satisfy, hs-reviewer:

1. Reads the diff itself — not a description of it — plus the spec's
   requirements and acceptance criteria for context on what it's supposed to do.
2. Evaluates across five axes: **correctness** (does it do what the spec asks,
   including edge cases), **security** (injection, auth, secrets, unvalidated
   input), **performance** (obvious inefficiency, N+1s, unbounded loops),
   **quality** (duplication, dead code, unclear naming, scope creep beyond the
   diff), **test coverage** (does the diff's behavior actually get exercised).
3. Returns a structured findings list — one entry per issue, each tagged with
   an axis and a severity (`blocker` / `should-fix` / `nit`), a file:line
   reference, and a one-line reason. No issues found on an axis is a stated
   "clean" line, not silence.

hs-reviewer does not fix code, does not rewrite the diff, and does not talk to
the user. It answers "what's wrong with this diff" and hands the answer back —
what happens to each finding (fix now, defer, override) is `hs-review`'s call,
not hs-reviewer's.

### Model

Independence matters more than speed here — unlike hs-scout above, this is
not a candidate for a cheap/small model by default, since spotting a subtle
correctness or security issue benefits from the same reasoning weight as
writing the code did. Run it as a genuinely separate subagent invocation
(fresh context, no memory of the implementation session) even if it's the
same model tier — the value here is a second look unbiased by the first
pass's assumptions, not a cheaper one.

### When to use it

After `hs-verify` produces a valid attestation (the change works) and before
`hs-ship` (the change gets published) — see `skills/hs-review/SKILL.md`. Hand
it the diff against the spec's baseline and the spec/plan files for context;
nothing more.

### Per-agent wiring

- **Claude Code**: `agents/hs-reviewer.md` at the repo root (auto-discovered
  once installed as a plugin; regenerate with
  `node scripts/generate-claude-reviewer.mjs` after editing this section)
  defines this as a real subagent with read-only tools. Invoke it as you
  would any subagent.
- **Codex CLI**: define an equivalent role under
  `.codex/agents/hs-reviewer.toml` — Codex's subagent config isn't wired
  automatically by this repo yet; copy the responsibilities above into that
  file by hand.
- **Gemini CLI**: no dedicated subagent-definition mechanism as portable as
  Claude Code's at the time of writing. Approximate this by explicitly asking
  the agent, inline, in a fresh conversation turn if possible, to review the
  diff cold before `hs-ship` — same responsibilities, without a separate
  subagent.
- **Cursor**: same situation as Codex/Gemini — no portable subagent-definition
  mechanism wired here yet; do the review pass inline, as context-independent
  as the tooling allows.

If no subagent mechanism is available at all, a structured self-review (the
same five axes, explicitly re-read against the spec rather than from memory
of writing it) is still better than skipping the step — the axes are what
matter, independence is the ideal, not the requirement.
