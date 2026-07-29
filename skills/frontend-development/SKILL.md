---
name: hs:frontend-development
description: Build component-based UIs with basic styling, responsiveness, and accessibility. Use when building a component, wiring it to an API, laying out a responsive page, or checking basic accessibility.
license: MIT
metadata:
  author: harness-skills
  version: "1.0.0"
---

# Frontend Development Skill

A high-level map of frontend fundamentals: component architecture, styling
basics, and responsive/accessible layout. Not a design-tool CLI or a
live-editing workflow - just the core ideas so you can make your own
implementation decisions with whatever framework/library you're using.

<HARD-GATE>
See `../_shared/hard-gate.md` for the shared gate shape (`{scope}` = "a plan exists or the user has explicitly requested implementation"). Do not modify implementation code until that scope exists.
</HARD-GATE>

## When to Use

- Building a new UI component
- Wiring a component to fetch data from an API
- Laying out a responsive page
- Checking basic accessibility before calling a UI done

## Reference Navigation

- `references/component-architecture.md` - component boundaries, local vs. global state, a fetch/loading/error example
- `references/design-tokens-styling.md` - why to use CSS variables for color/spacing/type, common styling mistakes to avoid
- `references/responsive-accessibility.md` - why responsive/contrast/focus matter, one minimal CSS example, plus a short self-review checklist

## Make it yours

Pick whatever framework/UI library fits what you're learning or building.
Decide how much animation/visual flourish suits your own taste and the
project's goals - this skill only covers the fundamentals that apply
regardless of stack.
