<!-- Ported from fk-skills reference/setup.md @ ad67c46. Kit adaptations are listed in UPSTREAM.md. -->
# Init Flow

The setup command for a project. One codebase crawl feeds everything it writes:

- **PRODUCT.md** (strategic): root project file for register, target users, product purpose, brand personality, anti-references, strategic design principles. Answers "who/what/why".
- **DESIGN.md** (visual): root project file for visual theme, color palette, typography, components, layout. Follows the [Google Stitch DESIGN.md format](https://stitch.withgoogle.com/docs/design-md/format/). Answers "how it looks".

It closes by pointing the user at the best command to run next. Every other frontend flow reads PRODUCT.md and DESIGN.md before doing any work.

## Step 1: Load current state

Check what already exists. PRODUCT.md and DESIGN.md live at the project root, or under `.agents/context/` or `docs/` (case-insensitive). Read whichever are present with your native file tool.

Decision tree:
- **Neither file exists (empty project or no context yet)**: do Steps 2-4 (write PRODUCT.md), then decide on DESIGN.md based on whether there's code to analyze.
- **PRODUCT.md exists, DESIGN.md missing**: skip to Step 5 and offer to run the spec flow ([spec.md](spec.md)) for DESIGN.md.
- **PRODUCT.md exists but has no `## Register` section (legacy)**: add it. Infer a hypothesis from the codebase (see Step 2), confirm with the user, write the field.
- **Both exist**: STOP and call the AskUserQuestion tool to clarify. Ask which file to refresh. Skip the one the user doesn't want changed.
- **Just DESIGN.md exists (unusual)**: do Steps 2-4 to produce PRODUCT.md.

Never silently overwrite an existing file. Always confirm first.

If init was invoked as a setup blocker by another command, such as `hs-build --fe` on a landing page, pause that command here. Complete init, then resume the original command. Your own writes are the freshest source; no reload needed. For build, resume into the design brief ([design-brief.md](design-brief.md)) next; init creates project context, but it is not a substitute for the task-specific discovery interview and confirmed design brief.

## Step 2: Explore the codebase

Before asking questions, thoroughly scan the project to discover what you can. This single crawl feeds PRODUCT.md and DESIGN.md, so be thorough once rather than re-scanning later:

- **README and docs**: Project purpose, target audience, any stated goals
- **Package.json / config files**: Tech stack, dependencies, existing design libraries, **and the framework** (Vite/SPA, Next.js, Nuxt, SvelteKit, Astro, multi-page static) plus the HTML entry the browser actually loads
- **Existing components**: Current design patterns, spacing, typography in use
- **Brand assets**: Logos, favicons, color values already defined
- **Design tokens / CSS variables**: Existing color palettes, font stacks, spacing scales
- **Any style guides or brand documentation**

Also form a **register hypothesis** from what you find:

- Brand signals: `/`, `/about`, `/pricing`, `/blog/*`, `/docs/*`, hero sections, big typography, scroll-driven sections, landing-page-shaped content.
- Product signals: `/app/*`, `/dashboard`, `/settings`, `/(auth)`, forms, data tables, side/top nav, app-shell components.

Register is a hypothesis at this point, not a decision; Step 3 confirms it.

Note what you've learned and what remains unclear. Also note any rough edges worth a follow-up command (thin hierarchy, flat or gray palette, missing error/empty states, dull copy); Step 6 turns these into concrete recommendations without re-analyzing.

## Step 3: Ask strategic questions (for PRODUCT.md)

STOP and call the AskUserQuestion tool to clarify. Ask only about what you couldn't infer from the codebase.

### Interview mode, not confirmation mode

If the repo is empty or the user's brief is sparse, run a short interview before proposing PRODUCT.md. Do **not** turn a one-sentence request into a complete inferred PRODUCT.md and ask for blanket confirmation.

- Use the harness's structured question tool when one exists. Otherwise, ask directly in chat and stop.
- Ask **2-3 questions per round**, then wait for answers.
- Use inferred answers as hypotheses or options, not as finished facts.
- Complete at least one real user-answer round before drafting PRODUCT.md, unless every required answer is directly discoverable from repo docs.
- Round 1 should establish register, users/purpose, and desired outcome.
- Round 2 should establish brand personality or references, anti-references, and accessibility needs.

### Minimum viable interview

Ask enough to complete PRODUCT.md. At minimum, cover register confirmation, users and purpose, brand personality, anti-references, and accessibility needs unless each answer is directly discoverable from repo context. After at least one interview round, you may propose inferred answers, but the user must confirm them before you write PRODUCT.md. Never synthesize PRODUCT.md from the original task prompt alone.

### Register (ask first; it shapes everything below)

Every design task is either **brand** (marketing, landing, campaign, long-form content, portfolio: design IS the product) or **product** (app UI, admin, dashboards, tools: design SERVES the product).

If Step 2 produced a clear hypothesis, lead with it: *"From the codebase, this looks like a [brand / product] surface. Does that match your intent, or should we treat it differently?"*

If the signal is genuinely split (e.g. a product with a big marketing landing), STOP and call the AskUserQuestion tool to clarify. Ask which register describes the **primary** surface. The register can be overridden per task later, but PRODUCT.md carries one default.

### Users & Purpose
- Who uses this? What's their context when using it?
- What job are they trying to get done?
- For brand: what emotions should the interface evoke? (confidence, delight, calm, urgency)
- For product: what workflow are they in? What's the primary task on any given screen?

### Brand & Personality
- How would you describe the brand personality in 3 words?
- Reference sites or apps that capture the right feel? What specifically about them?
  - Push for specific named references with the *specific* thing about them that fits this brand, not generic "modern" adjectives or category-bucket lanes.
- What should this explicitly NOT look like? Any anti-references?

### Accessibility & Inclusion
- Specific accessibility requirements? (WCAG level, known user needs)
- Considerations for reduced motion, color blindness, or other accommodations?

Skip questions where the answer is already clear. **Do NOT ask about colors, fonts, radii, or visual styling here.** Those belong in DESIGN.md, not PRODUCT.md.

## Step 4: Write PRODUCT.md

Write PRODUCT.md only after the user has confirmed the strategic answers from Step 3. If an inferred answer is uncertain or unconfirmed, ask before writing.

Synthesize into a strategic document:

```markdown
# Product

## Register

product

## Users
[Who they are, their context, the job to be done]

## Product Purpose
[What this product does, why it exists, what success looks like]

## Brand Personality
[Voice, tone, 3-word personality, emotional goals]

## Anti-references
[What this should NOT look like. Specific bad-example sites or patterns to avoid.]

## Design Principles
[3-5 strategic principles derived from the conversation. Principles like "practice what you preach", "show, don't tell", "expert confidence". NOT visual rules like "use OKLCH" or "magenta accent".]

## Accessibility & Inclusion
[WCAG level, known user needs, considerations]
```

Register is either `brand` or `product` as a bare value. No prose, no commentary.

Write to `PROJECT_ROOT/PRODUCT.md`.

## Step 5: Decide on DESIGN.md

Offer the spec flow ([spec.md](spec.md)) either way. Two paths:

- **Code exists** (CSS tokens, components, a running site): "I can generate a DESIGN.md that captures your visual system (colors, typography, components) so variants stay on-brand. Want to do that now?"
- **Pre-implementation** (empty project): "I can seed a starter DESIGN.md from five quick questions about color strategy, type direction, motion energy, and references. You can re-run once there's code, to capture the real tokens. Want to do that now?"

If the user agrees, delegate to the spec flow (it auto-detects scan vs seed). Load [spec.md](spec.md) and follow that flow.

If the user prefers to skip, mention they can run `hs-frontend-development spec` any time later.

## Step 6: Recommend starting points, then wrap up

Summarize tersely:
- Register captured (brand / product)
- What was written (PRODUCT.md, DESIGN.md, or a subset)
- The 3-5 strategic principles from PRODUCT.md that will guide future work
- If DESIGN.md is pending, one line on how to set it up later

Then recommend the **best commands to run next**, drawn from what your Step 2 crawl already surfaced. Do not run a fresh analysis here; surface observations you already have. Tailor to register and to what you saw, offer the 2-4 most relevant (not a menu dump), and give the exact command to type. Group by intent:

- **Build something new**: `hs-brainstorm --fe <feature>` (discovery interview and design brief), then `hs-plan --fe` and `hs-build --fe`. Lead with this for empty or early-stage projects.
- **Improve what's there**: name the specific surface. `hs-code-review --fe review <page>` for a scored UX review; `hs-code-review --fe check <area>` for a11y / perf / responsive checks; `hs-build --fe finish <component>` for a pre-ship pass. When the crawl flagged drift from a shared system (hard-coded values, repeated one-off components), point `hs-frontend-development tokens` at it.

The full menu is one bare `hs-frontend-development` away; keep this list short and pointed.

If init was invoked as a blocker by another frontend flow (e.g. the user ran `hs-build --fe finish` with no PRODUCT.md), resume that original task now. Your own writes are the freshest source; no reload needed.

Optionally STOP and call the AskUserQuestion tool to clarify. Ask whether they'd like a brief summary of PRODUCT.md appended to CLAUDE.md for easier agent reference. If yes, append a short **Design Context** pointer section there.
