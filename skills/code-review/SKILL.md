---
name: hs:code-review
description: Find bugs and gaps before calling implementation work done. Use after implementing, before merging, or whenever you need a second, skeptical pass.
license: MIT
metadata:
  author: harness-skills
  version: "1.0.0"
---

# Code Review Skill

## Purpose

Look for what's actually wrong or missing, rather than skimming and
agreeing that it looks fine. This skill is read-only by default - it
reports findings, it doesn't fix them on its own.

## The 3 questions to work through

1. **Does the code actually meet the requirement?** Compare it against what
   was asked, not against what feels reasonable in isolation.
2. **Are there clear quality or security problems?** Obvious bugs, unsafe
   input handling, unclear or duplicated logic.
3. **Try to break it.** What's one input, edge case, or sequence of actions
   that could make this fail or produce a wrong result?

## Evidence before conclusions

Before saying something "works" or "is fixed", actually run the relevant
command and read its real output - don't guess based on how the code looks.
A claim without a command and its output behind it isn't a finding, it's a
guess.

## Make it yours

Build your own checklist suited to whatever stack you're working in (a
specific framework's common pitfalls, a specific team's style rules) - the
3 questions above are the minimum starting point, not the whole review.
