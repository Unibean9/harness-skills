# Foundational Concepts: Harness Engineering in Agentic Coding

When you work with an AI coding agent (like Claude Code), you're not just
"chatting with an AI" - you're configuring a **harness**: the set of parts
that decide what the agent is allowed to do, what it knows, and how it's
constrained. This document explains two conceptual frameworks for seeing
that structure clearly, and maps them onto the concrete parts of this kit.

## 1. Runtime Substrate: the "responsibilities" a harness must cover

The Runtime Substrate is the base layer underneath every agent working
session. It isn't one file or one tool - it's the set of responsibilities
that any harness has to handle, whether you notice them or not.

| Responsibility | Meaning | Mapped to in this kit |
|---|---|---|
| Task specification | Clearly defining what the agent is doing and what result is expected | The `hs:plan` skill + its `plan.md` file |
| Context selection | Picking the right code/docs for the agent to read, avoiding overload | `## Reference Navigation` in each SKILL.md - points only to relevant files |
| Tool access | What tools the agent may call, which ones are off-limits | `commands/hs/*.md` (entrypoints) + `tools`/`disallowedTools` in agent frontmatter |
| Project memory | Preserving decisions/progress so a later session can continue | `plan.md`, `docs/journals/` (via the `hs:plan`/`hs:build` skills) |
| Verification | Real evidence the agent actually ran a check, not just "it said so" | The "evidence before conclusions" rule in `hs:build`/`hs:code-review` |
| Permissions | Boundaries the agent may not cross on its own (e.g. auto-commit, reading `.env`) | `hooks/guard-rails.mjs` + the HARD-GATE in each SKILL.md |

These responsibilities aren't independent - they interact. For example, if
"task specification" (the plan) is vague, "verification" has no way to know
what "enough checking" even means.

## 2. NexAU - the 7 surfaces that shape an agent

If the Runtime Substrate answers "what does the harness need to cover",
the NexAU framework names the **7 concrete surfaces** you actually touch
when building or customizing a harness. Each surface is a different entry
point for influencing agent behavior.

| NexAU surface | Example in this kit |
|---|---|
| **1. System prompts** | Frontmatter (`name`, `description`) + the body of each `SKILL.md` - the "role briefing" the agent reads before working |
| **2. Tool descriptions** | The short content in `commands/hs/*.md` - one line describing what a command does when the user types the slash-command |
| **3. Tool implementations** | The scripts that actually run, e.g. `hooks/*.mjs` in this kit (no separate CLI/script per skill) |
| **4. Middleware** | `hooks/` - logic inserted before/after the agent's actions (`guard-rails.mjs` gates PreToolUse, `dev-rules-reminder.mjs` re-injects rules on UserPromptSubmit) |
| **5. Skills** | The `skills/` folder - each skill is a pre-packaged process for one kind of work (brainstorm, plan, build, review, ship, backend, frontend) |
| **6. Sub-agents** | The `agents/` folder - 5 specialized roles (`planner`, `code-reviewer`, `tester`, `researcher`, `fullstack-developer`) invoked with a narrow scope, not carrying the full conversation history |
| **7. Long-term memory** | `plans/` (plans + progress) and `docs/journals/` (technical journal entries) - persist across many sessions, unlike a single session's context |

## Why split into two frameworks instead of one flat list?

The Runtime Substrate answers **"what must be guaranteed"** (a
responsibility/goal view). NexAU answers **"where do I make the change to
get that"** (a surface/file-location view). The two complement each other:
when you want to add a new capability to your own harness, first ask
"which responsibility (Substrate) does this belong to", then answer "which
surface (NexAU) should it live on".

Example: you want the agent to always be reminded to run `npm test` before
reporting "done".
- Step 1 (Substrate): this is the "verification" responsibility.
- Step 2 (NexAU): which surface should carry it? Options include (a) a line
  in SKILL.md (surface 1 - system prompt), or (b) a UserPromptSubmit hook
  that re-injects it periodically (surface 4 - middleware). This kit uses
  both: a HARD-GATE in SKILL.md + the `dev-rules-reminder` hook.

## Walking one concrete workflow through both frameworks

Take a real scenario: a student types `/hs:build path/to/plan.md`. Here is
what happens, read through both frameworks at once, to show they aren't
separate things but two cuts of the same event:

1. The slash-command is typed -> Claude Code reads `commands/hs/build.md`
   (NexAU surface 2: tool description) -> learns it should "invoke the
   `build` skill with `$ARGUMENTS`". In Substrate terms, this is the first
   step of "task specification": clearly establishing what the agent is
   about to work on.
2. The `build` skill loads -> the `SKILL.md` content (surface 1: system
   prompt) becomes the "role" the agent takes on: "you are the one
   executing the plan." The HARD-GATE in it (Substrate: permission) stops
   the agent from changing code before an approved plan exists.
3. Before reading/writing any file, `hooks/guard-rails.mjs` (surface 4:
   middleware) runs on PreToolUse -> checks whether the path touches a
   sensitive file (`.env`, `credentials*`). This is Substrate "permissions"
   enforced by real code, not just relying on the agent's self-restraint.
4. The agent reads `plan.md` and the `phase-XX-*.md` files (Substrate:
   project memory - state from a prior session gets reloaded) -> it only
   reads the relevant slice through each SKILL.md's `## Reference
   Navigation` (Substrate: context selection, NexAU surface 1).
5. If the task is complex enough, the agent may delegate to the
   `fullstack-developer` agent (surface 6: sub-agent) - that agent does
   NOT see the whole conversation, only the scoped work it was handed,
   keeping its context small and focused.
6. After the code is done, `hooks/dev-rules-reminder.mjs` (surface 4)
   periodically re-injects the rule "don't claim done without evidence"
   into UserPromptSubmit - this is Substrate "verification" guaranteed by
   middleware, not just a single reminder line in SKILL.md.
7. Important results/decisions get recorded into `docs/journals/` (surface
   7: long-term memory) - so a later session (possibly days later) can pick
   up the context without re-asking from scratch.

Looking back at these 7 steps: each one can answer BOTH "which Substrate
responsibility does it guarantee" AND "which NexAU surface does it live
on". That's a quick check for whether a harness component is "complete" -
if you can't answer one of those two questions, the component is probably
missing a clear role.

## Applying this when you extend the kit

When a student adds a new skill/agent/hook to this kit, ask:

1. Which Substrate responsibility does this new part address (task spec?
   context? tool access? memory? verification? permission)?
2. Which NexAU surface should it live on (`skills/`, `agents/`, `hooks/`,
   or a new line in `commands/hs/*.md`)?
3. Does something in the kit already do this - can it be reused/extended
   instead of creating something new?

This is a thinking framework, not a rigid formula. Decide how to extend it
based on your own project and taste.
