---
name: hs:plan
description: Turn a chosen approach into concrete steps, files to change, and completion criteria. Use before implementing anything beyond a trivial fix.
license: MIT
metadata:
  author: harness-skills
  version: "1.0.0"
---

# Plan Skill

## Purpose

Turn an idea that's already been chosen (see `hs:brainstorm`) into something
concrete enough to execute: what files change, in what order, and how you'll
know it's done.

## Core principles

- Clarify scope before listing steps - what's in, what's explicitly out.
- List specific files/changes, not vague phases like "improve backend".
- Name risks up front, and how you'll check for them (a test, a manual check).
- Keep the plan proportional to the task - a one-file fix doesn't need the
  same ceremony as a multi-file feature.

This skill only produces plan documents - it does not carry a HARD-GATE
itself since it never writes implementation code. The gate belongs to the
skill that implements (see `hs:build`).

## Minimal `plan.md` shape

A plan file only needs:

- **Overview** - what this plan accomplishes and why.
- **Steps** - an ordered list of concrete changes.
- **Completion criteria** - how you'll verify each step actually works.

That's it - no required frontmatter schema, no separate phase files, no
fixed set of modes. Add structure only when the task's size actually calls
for it.

## Make it yours

Decide how much detail a plan needs based on the size of the assignment.
For a quick fix, three bullet points might be the whole plan; for a
multi-file feature, write more.

Reference: `references/scope-and-tradeoffs.md` for questions to ask about
scope and a simple approach-comparison table.
