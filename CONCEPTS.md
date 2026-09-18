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
| Task specification | Clearly defining what the agent is doing and what result is expected | The `hs-plan` skill + its `plan.md` file |
| Context selection | Picking the right code/docs for the agent to read, avoiding overload | `## References` in each SKILL.md - points only to relevant files |
| Tool access | What tools the agent may call, which ones are off-limits | `tools`/`disallowedTools` in agent frontmatter - skills have no separate entrypoint file; invocation is driven by the `description` in each `SKILL.md`'s frontmatter |
| Project memory | Preserving decisions/progress so a later session can continue | `plan.md` (via `hs-plan`) and `implementation-notes.md` beside it (via `hs-build`) |
| Verification | Real evidence the agent actually ran a check, not just "it said so" | The "evidence before conclusions" rule in `hs-build`/`hs-code-review` |
| Permissions | Boundaries the agent may not cross on its own (e.g. auto-commit, reading `.env`) | `hooks/privacy-block.mjs` + the HARD-GATE in each SKILL.md |

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
| **2. Tool descriptions** | Not used as a separate surface in this kit - deliberately folded into surface 1. There is no command-wrapper layer; the `description` field in each `SKILL.md` is the only entrypoint a runtime matches against |
| **3. Tool implementations** | The scripts that actually run, e.g. `hooks/*.mjs` in this kit (no separate CLI/script per skill) |
| **4. Middleware** | `hooks/` - logic inserted before/after the agent's actions (`privacy-block.mjs` and `scout-block.mjs` gate PreToolUse, `session-init.mjs` injects project orientation on SessionStart) |
| **5. Skills** | The `skills/` folder - each skill is a pre-packaged process for one kind of work (brainstorm, plan, build, test, review, ship, backend, frontend, devops) |
| **6. Sub-agents** | The `agents/` folder - 5 specialized roles (`planner`, `code-reviewer`, `tester`, `researcher`, `fullstack-developer`) invoked with a narrow scope, not carrying the full conversation history |
| **7. Long-term memory** | `plans/` (plans, progress, and the implementation notes `hs-build` writes beside each plan) - persist across many sessions, unlike a single session's context |

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
  that re-injects it periodically (surface 4 - middleware). This kit puts
  it in the HARD-GATE in SKILL.md; `session-init.mjs` shows the middleware
  version of the same idea on SessionStart.

## Walking one concrete workflow through both frameworks

Take a real scenario: a student says "implement `plan.md`, it's already
approved". Here is what happens, read through both frameworks at once, to
show they aren't separate things but two cuts of the same event:

1. The agent matches the request against each `SKILL.md`'s `description`
   field (NexAU surface 1: system prompt/description, doing the job a
   separate surface 2 command-wrapper would otherwise do) -> `build`'s
   description ("Execute an approved plan into real code...") is the
   closest match, so the `build` skill loads. In Substrate terms, this is
   the first step of "task specification": clearly establishing what the
   agent is about to work on.
2. The `build` skill's `SKILL.md` content (surface 1: system prompt)
   becomes the "role" the agent takes on: "you are the one executing the
   plan." The HARD-GATE in it (Substrate: permission) stops the agent from
   changing code before an approved plan exists.
3. Before reading/writing any file, `hooks/privacy-block.mjs` (surface 4:
   middleware) runs on PreToolUse -> checks whether the path touches a
   sensitive file (`.env`, `credentials*`). This is Substrate "permissions"
   enforced by real code, not just relying on the agent's self-restraint.
4. The agent reads `plan.md` and the `phase-XX-*.md` files (Substrate:
   project memory - state from a prior session gets reloaded) -> it only
   reads the relevant slice through each SKILL.md's `## References`
   (Substrate: context selection, NexAU surface 1).
5. If the task is complex enough, the agent may delegate to the
   `fullstack-developer` agent (surface 6: sub-agent) - that agent does
   NOT see the whole conversation, only the scoped work it was handed,
   keeping its context small and focused.
6. If the session runs long and the context gets compacted,
   `hooks/session-init.mjs` (surface 4) fires on SessionStart and
   re-injects the branch, the active plan, and the rule "re-confirm any
   pending approval, do not assume it was given" - this is Substrate
   "project memory" and "permissions" guaranteed by middleware, not by the
   agent remembering.
7. Decisions made during the build get recorded in the plan's
   `implementation-notes.md` (surface 7: long-term memory) - so a later session (possibly days later) can pick
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
2. Which NexAU surface should it live on (`skills/`, `agents/`, or
   `hooks/`)?
3. Does something in the kit already do this - can it be reused/extended
   instead of creating something new?

This is a thinking framework, not a rigid formula. Decide how to extend it
based on your own project and taste.
