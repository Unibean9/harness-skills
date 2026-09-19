---
name: hs-frontend-development
description: Design and build production-grade frontend interfaces, context first - capture PRODUCT.md (strategy) and DESIGN.md (visual system), pull reusable tokens into a design system, and apply shared UX/UI rules (color, typography, layout, motion, accessibility, anti-patterns) for brand and product surfaces. Its capabilities (discover, prepare, validate, review) are routed automatically by hs-brainstorm, hs-plan, hs-build, and hs-code-review, and can also be invoked directly. Use when the user wants to design, redesign, build, review, or polish a website, landing page, dashboard, app UI, component, form, or design system, even if they only say "make this look better" or "set up design tokens". Not for backend APIs (hs-backend-development) or CI/CD and infrastructure (hs-devops).
license: MIT
category: domain
keywords: [frontend, ui, ux, design-system, product-md, design-md, tokens, accessibility, responsive]
metadata:
  author: harness-skills
  version: "2.0.0"
---

# Frontend Development Skill

Designs and iterates production-grade frontend interfaces. Real working
code, committed design choices, exceptional craft.

The design flows in this skill are ported from
[fk-skills](https://github.com/ThinhTP204/fk-skills). Provenance
and every deviation from upstream are recorded in `references/UPSTREAM.md`.

<HARD-GATE>
See `../_shared/hard-gate.md` for the shared gate shape (`{scope}` = "a plan exists or the user has explicitly requested implementation").
</HARD-GATE>

## When to Use

- Designing, redesigning, or polishing a website, landing page, dashboard,
  app shell, component, form, settings page, onboarding, or empty state
- Capturing a project's strategy and visual system as PRODUCT.md and DESIGN.md
- Consolidating repeated UI patterns and hard-coded values into shared tokens
- Any UI task where the result should not read as generic AI output

## Setup

You MUST do these steps before proceeding:

1. Read the project context once per session (skip if you already did in this conversation): PRODUCT.md and DESIGN.md at the project root, or under `.agents/context/` or `docs/` (case-insensitive), with your native file tool. **If PRODUCT.md is missing, stop and follow `references/setup.md` before doing anything else.** A missing DESIGN.md does not block the task; setup and `spec` offer to create it.
2. If the user invoked one of the capabilities below directly, or a workflow routed you here, you MUST read the matching reference next. Non-optional. The reference defines the flow; without it you will skip steps the user expects.
3. Familiarize yourself with any existing design system, conventions, and components in the code. Read at least one project file (CSS / tokens / theme / a representative component or page). **Required even when you've loaded a flow reference in step 2.** Don't reinvent the wheel; use what's there when it works, branch out when the UX wins.
4. Read the matching register reference. **This is non-optional; skipping it produces generic output.** If the project is marketing, a landing page, a campaign, long-form content, or a portfolio (design IS the product), read `references/brand.md`. If it is app UI, admin, a dashboard, or a tool (design SERVES the product), read `references/product.md`. Pick by first match: (1) task cue ("landing page" vs "dashboard"); (2) surface in focus (the page, file, or route being worked on); (3) `register` field in PRODUCT.md.
5. **If the project is brand-new (no existing CSS tokens / theme / committed brand colors found in step 3)**, choose the brand seed color deliberately before composing anything: one OKLCH anchor for the primary brand color, then compose the rest of the palette (bg, surface, ink, accent, muted) around it using the Color & Theme rules below. Do not default to the first color the category suggests. **Skip this step if step 3 found committed brand colors in existing tokens; in that case identity-preservation wins.**

## Design guidance

Produce ready-to-ship, production-grade code, not prototypes or starting points. Take no shortcuts unless the user asks for them (when in doubt, ask). Don't stop until arriving at a complete implementation (beautiful, responsive, fast, precise, bug-free, on brand). You take attention to detail seriously: every page, section or component crafted is battle tested using the tools available to you (browser screenshotting, computer use, etc). Claude is capable of extraordinary work. Don't hold back.

### General rules

#### Color

- **Verify contrast.** Body text must hit ≥4.5:1 against its background; large text (≥18px or bold ≥14px) needs ≥3:1. Placeholder text needs the same 4.5:1, not the muted-gray default. The most common failure: muted gray body text on a tinted near-white. If the contrast is even close, bump the body color toward the ink end of the ramp; light gray "for elegance" is the single biggest reason AI designs feel hard to read.
- Gray text on a colored background looks washed out. Use a darker shade of the background's own hue, or a transparency of the text color.

#### Typography

- Cap body line length at 65–75ch.
- Don't pair fonts that are similar but not identical (two geometric sans-serifs, two humanist sans-serifs). Pair on a contrast axis (serif + sans, geometric + humanist) or use one family in multiple weights.
- Hero / display heading ceiling: clamp() max ≤ 6rem (~96px). Above that the page is shouting, not designing.
- Display heading letter-spacing floor: ≥ -0.04em. Anything tighter and letters touch; cramped, not "designed".
- Use `text-wrap: balance` on h1–h3 for even line lengths; `text-wrap: pretty` on long prose to reduce orphans.

#### Layout

- Vary spacing for rhythm.
- Cards are the lazy answer. Use them only when they're truly the best affordance. Nested cards are always wrong.
- Flexbox for 1D, Grid for 2D. Don't default to Grid when `flex-wrap` would be simpler.
- For responsive grids without breakpoints: `repeat(auto-fit, minmax(280px, 1fr))`.
- Build a semantic z-index scale (dropdown → sticky → modal-backdrop → modal → toast → tooltip). Never arbitrary values like 999 or 9999.

#### Motion
- Motion should be intentional, and not be an afterthought. consider it as part of the build.
- Don't animate CSS layout properties unless truly needed.
- Ease out with exponential curves (ease-out-quart / quint / expo). No bounce, no elastic.
- Use libraries for more advanced motion needs (e.g. motion, gsap, anime.js, lenis etc)
- Reduced motion is not optional. Every animation needs a `@media (prefers-reduced-motion: reduce)` alternative: typically a crossfade or instant transition.
- Staggering the items within one list is legitimate. The tell is the uniform reflex (one identical entrance applied to every section), not motion itself; each reveal should fit what it reveals. Suppressing the reflex is never a reason to ship a page with no motion at all.
- Reveal animations must enhance an already-visible default. Don't gate content visibility on a class-triggered transition; transitions pause on hidden tabs and headless renderers, so the reveal never fires and the section ships blank.
- Premium motion materials are not just transform/opacity. Blur, backdrop-filter, clip-path, mask, and shadow/glow are part of the palette when they materially improve the effect and stay smooth.

#### Interaction

- Dropdowns rendered with `position: absolute` inside an `overflow: hidden` or `overflow: auto` container will be clipped. Use the native `<dialog>` / popover API, `position: fixed`, or a portal to escape the stacking context.

### New projects only (when no prior work exists)

#### Color & Theme

- Use OKLCH.
- **The cream / sand / beige body bg is the saturated AI default of 2026.** The whole warm-neutral band (OKLCH L 0.84-0.97, C < 0.06, hue 40-100) reads as cream/sand/paper/parchment regardless of what you call it. Token names like `--paper`, `--cream`, `--sand`, `--bone`, `--flour`, `--linen`, `--parchment`, `--wheat`, `--biscuit`, `--ivory` are tells in themselves. If the brief is "warm, traditional, family-coastal-Italian" or "magazine-warm" or "editorial-restraint", DO NOT translate that into a near-white warm-tinted bg; that's the AI move. Pick: (a) a saturated brand color as the body (terracotta, oxblood, deep ochre, near-black), (b) a true off-white at chroma 0 (or chroma toward the brand's own hue, not toward warmth-by-default), or (c) a darker mid-tone tinted neutral that's clearly the brand's own. "Warmth" in the brand is carried by accent + typography + imagery, not by body bg.
- Tinted neutrals: add 0.005–0.015 chroma toward the brand's hue. Don't default-tint toward warm or cool "because the brand feels that way"; that's the cross-project monoculture move.
- When picking a theme: Dark vs. light is never a default. Not dark "because tools look cool dark." Not light "to be safe.".Before choosing, write one sentence of physical scene: who uses this, where, under what ambient light, in what mood. If the sentence doesn't force the answer, it's not concrete enough. Add detail until it does.
- Pick a **color strategy** before picking colors. Four steps on the commitment axis:
  - **Restrained**: tinted neutrals + one accent ≤10%. Product default; brand minimalism.
  - **Committed**: one saturated color carries 30–60% of the surface. Brand default for identity-driven pages.
  - **Full palette**: 3–4 named roles, each used deliberately. Brand campaigns; product data viz.
  - **Drenched**: the surface IS the color. Brand heroes, campaign pages.

### Absolute bans

Match-and-refuse. If you're about to write any of these, rewrite the element with different structure.

- **Side-stripe borders.** `border-left` or `border-right` greater than 1px as a colored accent on cards, list items, callouts, or alerts. Never intentional. Rewrite with full borders, background tints, leading numbers/icons, or nothing.
- **Gradient text.** `background-clip: text` combined with a gradient background. Decorative, never meaningful. Use a single solid color. Emphasis via weight or size.
- **Glassmorphism as default.** Blurs and glass cards used decoratively. Rare and purposeful, or nothing.
- **The hero-metric template.** Big number, small label, supporting stats, gradient accent. SaaS cliché.
- **Identical card grids.** Same-sized cards with icon + heading + text, repeated endlessly.
- **Tiny uppercase tracked eyebrow above every section.** The 2023-era kicker (small all-caps text with wide tracking, "ABOUT" "PROCESS" "PRICING" above each heading) is now the saturated AI scaffold; it appears on 55-95% of generations regardless of brief, which is the definition of a tell. One named kicker as a deliberate brand system is voice; an eyebrow on every section is AI grammar. Choose a different cadence.
- **Numbered section markers as default scaffolding (01 / 02 / 03).** Putting `01 · About / 02 · Process / 03 · Pricing` above every section is the eyebrow trope one tier deeper: reach for it because "landing pages do this" and you're scaffolding by reflex. Numbers earn their place when the section actually IS a sequence (a real 3-step process, an ordered flow, a typed timeline) and the order carries information the reader needs. One deliberate numbered sequence on one page is voice; numbered eyebrows on every section across the site is AI grammar.
- **Text that overflows its container.** Long heading words plus large clamp scales plus narrow grids cause headline overflow on tablet/mobile. Test the heading copy at every breakpoint; if it overflows, reduce the clamp max or rewrite the copy. The viewport is part of the design.

### The AI slop test

If someone could look at this interface and say "AI made that" without doubt, it's failed. Cross-register failures are the absolute bans above. Register-specific failures live in each reference.

**Category-reflex check.** Run at two altitudes; the second one catches what the first one misses.

- **First-order:** if someone could guess the theme + palette from the category alone, it's the first training-data reflex. Rework the scene sentence and color strategy until the answer isn't obvious from the domain.
- **Second-order:** if someone could guess the aesthetic family from category-plus-anti-references ("AI workflow tool that's not SaaS-cream → editorial-typographic", "fintech that's not navy-and-gold → terminal-native dark mode"), it's the trap one tier deeper. The first reflex was avoided; the second wasn't. Rework until both answers are not obvious. The brand register's reflex-reject aesthetic lanes (`references/brand.md`) list catches the currently-saturated families.

## Capabilities

The workflow skills call these on their own (`../_shared/domain-routing.md`):
the user picks `hs-brainstorm`, `hs-plan`, `hs-build`, `hs-code-review`, or
`hs-ship`, and the workflow decides when frontend applies. Each capability can
also be invoked directly.

| Capability | Called by | Direct invocation | Reference |
|---|---|---|---|
| `discover` | `hs-brainstorm`, for a new UI surface | `hs-frontend-development brief [feature]` | `references/design-brief.md` |
| `prepare` | `hs-plan` (context), `hs-build` | `setup` writes PRODUCT.md and hands off to `spec` for DESIGN.md; the production bar is loaded by `hs-build` | `references/setup.md`, `references/spec.md`, `references/build.md` |
| `validate` | `hs-build`, `hs-code-review`, `hs-ship` | `hs-frontend-development check [target]` | `references/check.md` |
| `review` | `hs-code-review`, for a change that reshapes what users see | `hs-frontend-development review [target]` | `references/review.md` |
| finish step | `hs-build`, once the phase is otherwise done | `hs-frontend-development finish [target]` | `references/finish.md` |
| on demand | none | `hs-frontend-development tokens [target]` | `references/tokens.md` |

### Direct invocation

1. **No argument**: the user is asking "what should I do?" Read the project context (Setup step 1), then lead with the **2-3 highest-value next actions**, each with a one-line reason: PRODUCT.md missing → `setup`; DESIGN.md missing while code exists → `spec`; a new surface to build → start `hs-brainstorm`; existing UI never reviewed → `review <surface>`; drift from a shared system → `tokens`. Follow with the table above. **Never auto-run one; the recommendation is a suggestion the user confirms.**
2. **First word matches an invocation** (`brief`, `setup`, `spec`, `check`, `review`, `finish`, `tokens`): load its reference and follow it. Everything after the name is the target.
3. **First word doesn't match, but the intent clearly maps to one capability** (e.g. "document the design system" → `spec`, "clean up repeated buttons" → `tokens`, "fix the spacing" → `space`, "rewrite this error message" → `copy`): load that reference and proceed as if invoked. If two could fit, ask once which.
4. **No clear match**: general design invocation. Apply the Setup steps, the Design guidance above, and the loaded register reference, using the full argument as context.

**Topic references** (`references/space.md`, `type.md`, `motion.md`, `color.md`, `responsive.md`, `copy.md`, `interaction-design.md`) are consulted by `prepare` (the build flow) through the brief's "Recommended References", or loaded directly when the task is about that topic. Each ends with a Reference Material section holding the deep guidance, and hands off to the `hs-build` finish step for the final pass.

Setup (context gathering, register) is already loaded by then; capabilities don't re-run it. If one finds PRODUCT.md missing, it runs `setup` first as a blocker, then resumes the original task.

## References

- `references/setup.md` - `prepare`: write PRODUCT.md (register, users, brand personality, anti-references, principles)
- `references/spec.md` - `prepare`: write DESIGN.md in the Google Stitch format (scan mode and seed mode)
- `references/tokens.md` - extract repeated patterns and values into the design system
- `references/design-brief.md` - discovery interview and the confirmed design brief (`discover`)
- `references/build.md` - build flow and production bar (`prepare`, used by `hs-build`)
- `references/finish.md` - final polish pass (the `hs-build` finish step)
- `references/check.md` - technical audit (`validate`)
- `references/review.md` - UX critique with heuristics, cognitive load, and personas (`review`)
- `references/space.md`, `references/type.md`, `references/motion.md`, `references/color.md`, `references/responsive.md`, `references/copy.md`, `references/interaction-design.md` - topic references: layout and spacing, typography, motion, color, responsive adaptation, UX copy, interaction design
- `references/brand.md` - register for surfaces where design IS the product
- `references/product.md` - register for surfaces where design SERVES the product
- `references/UPSTREAM.md` - where these references come from and what differs from upstream
