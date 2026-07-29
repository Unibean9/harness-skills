---
name: hs:build
description: Execute an approved plan into real code. Use after a plan exists and you're ready to implement.
license: MIT
metadata:
  author: harness-skills
  version: "1.0.0"
---

# Build Skill

## Purpose

Turn a plan into working code, following the order the `hs:plan` skill laid
out - not improvising a different approach mid-implementation.

<HARD-GATE>
See `../_shared/hard-gate.md` for the shared gate shape (`{scope}` = "a plan exists and has been reviewed"). A user may explicitly say "just code it" to skip planning for a trivial task.
</HARD-GATE>

## Core principles

- Follow the plan; if reality forces a deviation, say so and why, don't
  silently diverge.
- Write a test for logic whose correct behavior isn't obvious from reading it.
- Ask for review before considering something done.
- Never claim "done" without having actually run a check that proves it.

You can split a plan step into smaller sub-steps yourself if that helps you
work through it, as long as the end result still matches the plan.

## Make it yours

Add your own habits on top of this - always run a linter, always commit
after each small step, always re-read the diff before moving on. This skill
only covers the minimum: follow the plan, test what's unclear, get
reviewed, verify before claiming done.
