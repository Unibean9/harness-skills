---
name: hs:brainstorm
description: Weigh approaches and trade-offs before committing to a direction. Use for ideation, architecture decisions, or any choice worth thinking through before writing code.
license: MIT
metadata:
  author: harness-skills
  version: "1.0.0"
---

# Brainstorm Skill

## Purpose

Evaluate more than one approach before picking one, so you don't write code
around an assumption you never actually examined.

## Core principles

- Ask about unclear constraints or boundaries before proposing a solution.
- Propose at least 2 viable approaches with honest pros/cons - not one
  "correct" answer dressed up as a choice.
- Be direct about risk and cost, even when it's not what the user wants to hear.
- Write down the chosen approach and why, so a later session doesn't have to
  re-derive the reasoning.

<HARD-GATE>
See `../_shared/hard-gate.md` for the shared gate shape (`{scope}` = "a direction has been chosen and written down"). Do not write implementation code before that.
</HARD-GATE>

## One minimal example flow

1. Understand the context - what problem, for whom, what constraints.
2. Propose 2-3 approaches with trade-offs.
3. Pick one (with the user, if there's a person to ask).
4. Write down the decision and the reasoning in a couple of sentences.

## Make it yours

Add or drop steps, change the questions you ask, or fold this into `hs:plan`
if your assignment is small enough that a separate brainstorming pass feels
like overhead.
