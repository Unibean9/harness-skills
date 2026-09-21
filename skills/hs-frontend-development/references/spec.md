Generate a `DESIGN.md` file at the project root that captures the current visual design system, so AI agents generating new screens stay on-brand.

DESIGN.md follows the [official Google Stitch DESIGN.md format](https://stitch.withgoogle.com/docs/design-md/format/): YAML frontmatter carrying machine-readable design tokens, followed by a markdown body with exactly six sections in a fixed order. **Tokens are normative; prose provides context for how to apply them.** Sections may be omitted when not relevant, but **do not reorder them and do not rename them**. Section headers must match the spec character-for-character so the file stays parseable by other DESIGN.md-aware tools (Stitch itself, awesome-design-md, skill-rest, etc.).

## The frontmatter: token schema

The YAML frontmatter is the machine-readable layer. It's what Stitch's linter validates. Keep it tight; every entry should correspond to a token the project actually uses.

```yaml
---
name: <project title>
description: <one-line tagline>
colors:
  primary: "#b8422e"
  neutral-bg: "#faf7f2"
  # ...one entry per extracted color; key = descriptive slug
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.5rem, 7vw, 4.5rem)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "normal"
  body:
    # ...
rounded:
  sm: "4px"
  md: "8px"
spacing:
  sm: "8px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
    padding: "16px 48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
---
```

Rules that matter:

- **Token refs** use `{path.to.token}` (e.g. `{colors.primary}`, `{rounded.md}`). Components may reference primitives; primitives may not reference each other.
- **Stitch validates colors as hex sRGB only** (`#RGB` / `#RGBA` / `#RRGGBB` / `#RRGGBBAA`); OKLCH/HSL/P3 trigger a linter warning, not a hard error. YAML accepts the string either way and our own parser is format-agnostic. Choose based on project posture: (a) if the project has an "OKLCH-only" doctrine or uses Display-P3 values that don't round-trip through sRGB, put OKLCH directly in the frontmatter and accept the Stitch linter warning; (b) if the project wants strict Stitch compliance or plans to use their Tailwind/DTCG export pipeline, put hex in the frontmatter and keep OKLCH in prose as the canonical reference. Never split the source of truth without explicit reason.
- **Component sub-tokens** are limited to 8 props: `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width`. Shadows, motion, focus rings, backdrop-filter: none of those fit. Carry them in the prose of the `## Components` and `## Elevation` sections.
- **Scale keys are open-ended.** Use whatever names the project already uses (`oxblood-deep`, `surface-container-low`). Don't rename to Material defaults.
- **Variants are naming convention, not schema.** `button-primary` / `button-primary-hover` / `button-primary-active` as sibling keys.

## The markdown body: six sections (exact order)

1. `## Overview`
2. `## Colors`
3. `## Typography`
4. `## Elevation`
5. `## Components`
6. `## Do's and Don'ts`

Optional evocative subtitles are allowed in the form `## 2. Colors: The [Name] Palette` (Stitch's own outputs do this), but the literal word in each header (Overview, Colors, Typography, Elevation, Components, Do's and Don'ts) must be present. Do NOT add extra top-level sections (Layout Principles, Responsive Behavior, Motion, Agent Prompt Guide). Fold that content into the six spec sections where it naturally belongs.

## When to run

- The user just ran `hs-frontend-development setup` and needs the visual side documented.
- The skill noticed no `DESIGN.md` exists and nudged the user to create one.
- An existing `DESIGN.md` is stale (the design has drifted).
- Before a large redesign, to capture the current state as a reference.

If a `DESIGN.md` already exists, **do not silently overwrite it**. Show the user the existing file and STOP and call the AskUserQuestion tool to clarify. whether to refresh, overwrite, or merge.

## Two paths

- **Scan mode** (default): the project has design tokens, components, or rendered output. Extract, then confirm descriptive language. Use when there's code to analyze.
- **Seed mode**: the project is pre-implementation (fresh init, nothing built yet). Interview for five high-level answers, write a minimal DESIGN.md marked `<!-- SEED -->`. Re-run in scan mode once there's code.

Decide by scanning first (Scan mode Step 1). If the scan finds no tokens, no component files, and no rendered site, offer seed mode; don't silently switch. `hs-frontend-development spec --seed` forces seed mode regardless of code presence.

## Scan mode (approach C: auto-extract, then confirm descriptive language)

### Step 1: Find the design assets

Search the codebase in priority order:

1. **CSS custom properties**: grep for `--color-`, `--font-`, `--spacing-`, `--radius-`, `--shadow-`, `--ease-`, `--duration-` declarations in CSS files (usually `src/styles/`, `public/css/`, `app/globals.css`, etc.). Record name, value, and the file it's defined in.
2. **Tailwind config**: if `tailwind.config.{js,ts,mjs}` exists, read the `theme.extend` block for colors, fontFamily, spacing, borderRadius, boxShadow.
3. **CSS-in-JS theme files**: styled-components, emotion, vanilla-extract, stitches; look for `theme.ts`, `tokens.ts`, or equivalent.
4. **Design token files**: `tokens.json`, `design-tokens.json`, Style Dictionary output, W3C token community group format.
5. **Component library**: scan the main button, card, input, navigation, dialog components. Note their variant APIs and default styles.
6. **Global stylesheet**: the root CSS file usually has the base typography and color assignments.
7. **Visible rendered output**: if browser automation tools are available, load the live site and sample computed styles from key elements (body, h1, a, button, .card). This catches values that tokens miss.

### Step 2: Auto-extract what can be auto-extracted

Build a structured draft from the discovered tokens. For each token class:

- **Colors**: Group into Primary / Secondary / Tertiary / Neutral (the Material-derived roles Stitch uses). If the project only has one accent, express it as Primary + Neutral; omit Secondary and Tertiary rather than inventing them.
- **Typography**: Map observed sizes and weights to the Material hierarchy (display / headline / title / body / label). Note font-family stacks and the scale ratio.
- **Elevation**: Catalogue the shadow vocabulary. If the project is flat and uses tonal layering instead, that's a valid answer; state it explicitly.
- **Components**: For each common component (button, card, input, chip, list item, tooltip, nav), extract shape (radius), color assignment, hover/focus treatment, internal padding.
- **Spacing + layout**: Fold into Overview or relevant Components. The spec does NOT have a Layout section.

### Step 2b: Stage the frontmatter

From the auto-extracted tokens, draft the YAML frontmatter now (you'll write it at the top of DESIGN.md in Step 4). This is the machine-readable layer: what Stitch's linter consumes.

- **Colors**: one entry per extracted color. Key = descriptive slug (`oxblood-deep`, `editorial-magenta`, not `blue-800`). Value = whichever format the project treats as canonical (OKLCH or hex; see the frontmatter rules above). Don't split the source of truth: one format in the frontmatter, don't redefine the same token in prose with a different value.
- **Typography**: one entry per role (`display`, `headline`, `title`, `body`, `label`). Typography is an object; include only the props that are real for the project (`fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `fontFeature`, `fontVariation`).
- **Rounded / Spacing**: whatever scale steps the project actually uses, keyed by whatever scale name the project uses (`sm` / `md` / `lg`, or `surface-sm`, or numeric steps).
- **Components**: one entry per variant (`button-primary`, `button-primary-hover`, `button-ghost`). Reference primitives via `{colors.X}`, `{rounded.Y}`. If a variant needs a property Stitch's 8-prop set doesn't cover (shadow, focus ring, backdrop-filter), describe it in the `## Components` prose instead.

Skip anything the project doesn't have. Empty scale keys or fabricated tokens pollute the spec.

### Step 3: Ask the user for qualitative language

The following require creative input that cannot be auto-extracted. Group them into one `AskUserQuestion` interaction:

- **Creative North Star**: a single named metaphor for the whole system ("The Editorial Sanctuary", "The Golden State Curator", "The Lab Notebook"). Offer 2-3 options that honor PRODUCT.md's brand personality.
- **Overview voice**: mood adjectives, aesthetic philosophy in 2-3 sentences, anti-references (what the system should not feel like).
- **Color character** (for auto-extracted colors): descriptive names ("Deep Muted Teal-Navy", not "blue-800"). Suggest 2-3 options per key color based on hue/saturation.
- **Elevation philosophy**: flat/layered/lifted. If shadows exist, is their role ambient or structural?
- **Component philosophy**: the feel of buttons, cards, inputs in one phrase ("tactile and confident" vs. "refined and restrained").

Quote a line from PRODUCT.md when possible so the user sees their own strategic language carry forward.

### Step 4: Write DESIGN.md

The file opens with the YAML frontmatter staged in Step 2b (schema documented at the top of this reference), then the markdown body using the structure below. Headers must match character-for-character. Optional evocative subtitles (e.g. `## 2. Colors: The Coastal Palette`) are allowed.

```markdown
---
name: [Project Title]
description: [one-line tagline]
colors:
  # ... staged frontmatter from Step 2b
---

# Design System: [Project Title]

## 1. Overview

**Creative North Star: "[Named metaphor in quotes]"**

[2-3 paragraph holistic description: personality, density, aesthetic philosophy. Start from the North Star and work outward. State what this system explicitly rejects (pulled from PRODUCT.md's anti-references). End with a short **Key Characteristics:** bullet list.]

## 2. Colors

[Describe the palette character in one sentence.]

### Primary
- **[Descriptive Name]** (#HEX / oklch(...)): [Where and why this color is used. Be specific about context, not just role.]

### Secondary (optional; omit if the project has only one accent)
- **[Descriptive Name]** (#HEX): [Role.]

### Tertiary (optional)
- **[Descriptive Name]** (#HEX): [Role.]

### Neutral
- **[Descriptive Name]** (#HEX): [Text / background / border / divider role.]
- [...]

### Named Rules (optional, powerful)
**The [Rule Name] Rule.** [Short, forceful prohibition or doctrine, e.g. "The One Voice Rule. The primary accent is used on ≤10% of any given screen. Its rarity is the point."]

## 3. Typography

**Display Font:** [Family] (with [fallback])
**Body Font:** [Family] (with [fallback])
**Label/Mono Font:** [Family, if distinct]

**Character:** [1-2 sentence personality description of the pairing.]

### Hierarchy
- **Display** ([weight], [size/clamp], [line-height]): [Purpose; where it appears.]
- **Headline** ([weight], [size], [line-height]): [Purpose.]
- **Title** ([weight], [size], [line-height]): [Purpose.]
- **Body** ([weight], [size], [line-height]): [Purpose. Include max line length like 65–75ch if relevant.]
- **Label** ([weight], [size], [letter-spacing], [case if uppercase]): [Purpose.]

### Named Rules (optional)
**The [Rule Name] Rule.** [Short doctrine about type use.]

## 4. Elevation

[One paragraph: does this system use shadows, tonal layering, or a hybrid? If "no shadows", say so explicitly and describe how depth is conveyed instead.]

### Shadow Vocabulary (if applicable)
- **[Role name]** (`box-shadow: [exact value]`): [When to use it.]
- [...]

### Named Rules (optional)
**The [Rule Name] Rule.** [e.g. "The Flat-By-Default Rule. Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation, focus)."]

## 5. Components

For each component, lead with a short character line, then specify shape, color assignment, states, and any distinctive behavior.

### Buttons
- **Shape:** [radius described, exact value in parens]
- **Primary:** [color assignment + padding, in semantic + exact terms]
- **Hover / Focus:** [transitions, treatments]
- **Secondary / Ghost / Tertiary (if applicable):** [brief description]

### Chips (if used)
- **Style:** [background, text color, border treatment]
- **State:** [selected / unselected, filter / action variants]

### Cards / Containers
- **Corner Style:** [radius]
- **Background:** [colors used]
- **Shadow Strategy:** [reference Elevation section]
- **Border:** [if any]
- **Internal Padding:** [scale]

### Inputs / Fields
- **Style:** [stroke, background, radius]
- **Focus:** [treatment, e.g. glow, border shift, etc.]
- **Error / Disabled:** [if applicable]

### Navigation
- **Style, typography, default/hover/active states, mobile treatment.**

### [Signature Component] (optional; if the project has a distinctive custom component worth documenting)
[Description.]

## 6. Do's and Don'ts

Concrete, forceful guardrails. Lead each with "Do" or "Don't". Be specific: include exact colors, pixel values, and named anti-patterns the user mentioned in PRODUCT.md. **Every anti-reference in PRODUCT.md should show up here as a "Don't" with the same language**, so the visual spec carries the strategic line through. Quote PRODUCT.md directly where possible: if PRODUCT.md says *"avoid dark mode with purple gradients, neon accents, glassmorphism"*, the Don'ts here should repeat that by name.

### Do:
- **Do** [specific prescription with exact values / named rule].
- **Do** [...]

### Don't:
- **Don't** [specific prohibition, e.g. "use border-left greater than 1px as a colored stripe"].
- **Don't** [...]
- **Don't** [...]
```

### Step 5: Confirm and refine

1. Show the user the full DESIGN.md you wrote. Briefly highlight the non-obvious creative choices (descriptive color names, atmosphere language, named rules).
2. Offer to refine any section: "Want me to revise a section, add component patterns I missed, or adjust the atmosphere language?"

Your own write is the freshest source; subsequent commands in this session don't need a reload.

## Seed mode

For projects with no visual system to extract yet. Produces a minimal scaffold, not a full spec.

### Step 1: Confirm seed mode

Before interviewing: "There's no existing visual system to scan. I'll ask five quick questions to seed a starter DESIGN.md. You can re-run `hs-frontend-development spec` once there's code, to capture the real tokens and components. OK?"

If the user prefers to skip, stop. No file.

### Step 2: Five questions

Group into one `AskUserQuestion` interaction. Options must be concrete.

1. **Color strategy.** Pick one:
   - Restrained: tinted neutrals + one accent ≤10%
   - Committed: one saturated color carries 30–60% of the surface
   - Full palette: 3–4 named color roles, each deliberate
   - Drenched: the surface IS the color

   Then: one hue family or anchor reference ("deep teal", "mustard", "Klim #ff4500 orange").

2. **Typography direction.** Pick one (specific fonts come later):
   - Serif display + sans body
   - Single sans (warm / technical / geometric / humanist; pick a feel)
   - Display + mono
   - Mono-forward
   - Editorial script + sans

3. **Motion energy.** Pick one:
   - Restrained: state changes only
   - Responsive: feedback + transitions, no choreography
   - Choreographed: orchestrated entrances, scroll-driven sequences

4. **Three named references.** Brands, products, printed objects. Not adjectives.

5. **One anti-reference.** What it should NOT feel like. Also named.

### Step 3: Write seed DESIGN.md

Use the six-section spec from Scan mode. Populate what the interview answers; leave the rest as honest placeholders. The seed is a scaffold, not a fabricated spec.

Lead the file with:

```markdown
<!-- SEED: re-run hs-frontend-development spec once there's code to capture the actual tokens and components. -->
```

Per-section guidance in seed mode:

- **Overview**: Creative North Star and philosophy phrased from the answers (color strategy + motion energy + references). Reference the user's anti-reference directly.
- **Colors**: Color strategy as a Named Rule (e.g. *"The Drenched Rule. The surface IS the color."*). Hue family or anchor reference. No hex values; mark as `[to be resolved during implementation]`.
- **Typography**: the direction the user picked (e.g. "Serif display + sans body"). No font names yet: `[font pairing to be chosen at implementation]`.
- **Elevation**: inferred from motion energy. Restrained/Responsive → flat by default; Choreographed → layered. One sentence.
- **Components**: omit entirely; no components exist yet.
- **Do's and Don'ts**: carry PRODUCT.md's anti-references directly plus the anti-reference named in Q5.

Seed mode writes a minimal frontmatter with `name` and `description` only; no colors, typography, rounded, spacing, or components yet. Real tokens land on the next Scan-mode run.

### Step 4: Confirm

1. Show the seed DESIGN.md. Call out that it is a seed (the marker is the literal commitment).
2. Tell the user: "Re-run `hs-frontend-development spec` once you have some code. That pass will extract the real tokens and components."

Your own write is the freshest source; no reload needed.

## Style guidelines

- **Frontmatter first, prose second.** Tokens go in the YAML frontmatter; prose contextualizes them. Don't redefine a token value in two places; the frontmatter is normative.
- **Cite PRODUCT.md anti-references by name** in the Do's and Don'ts section. If PRODUCT.md lists "SaaS landing-page clichés" or "generic AI tool marketing" as anti-references, the DESIGN.md Don'ts should repeat those phrases verbatim so the visual spec enforces the strategic line.
- **Match the spec, don't invent new sections.** The six section names are fixed. If you have Layout/Motion/Responsive content to document, fold it into Overview (philosophy-level rules) or Components (per-component behavior).
- **Descriptive > technical**: "Gently curved edges (8px radius)" > "rounded-lg". Include the technical value in parens, lead with the description.
- **Functional > decorative**: for each token, explain WHERE and WHY it's used, not just WHAT it is.
- **Exact values in parens**: hex codes, px/rem values, font weights; always the number in parens alongside the description.
- **Use Named Rules**: `**The [Name] Rule.** [short doctrine]`. These are memorable, citable, and much stickier for AI consumers than bullet lists. Stitch's own outputs use them heavily ("The No-Line Rule", "The Ghost Border Fallback"). Aim for 1-3 per section.
- **Be forceful**. The voice of a design director. "Prohibited", "forbidden", "never", "always", not "consider", "might", "prefer". Match PRODUCT.md's tone.
- **Concrete anti-pattern tests**. Stitch writes things like *"If it looks like a 2014 app, the shadow is too dark and the blur is too small."* A one-sentence audit test beats a paragraph of principle.
- **Reference PRODUCT.md**. The anti-references section of PRODUCT.md should directly inform the Do's and Don'ts section here. Quote or paraphrase.
- **Group colors by role**, not by hex-order or hue-order. Primary / Secondary / Tertiary / Neutral is the spec ordering.

## Pitfalls

- Translate raw CSS class names into descriptive language.
- Stop extraction at values that are actually reused; one-offs pollute the system.
- Document only components that exist. If the project has buttons and cards, document those components.
- Ask before overwriting an existing DESIGN.md.
- Keep DESIGN.md visual rather than duplicating content from PRODUCT.md.
- Fold Layout Principles, Motion, and Responsive Behavior into the six allowed top-level sections; the spec has six sections, not nine.
- Preserve the exact section names, such as "Colors" and "Typography", because tooling depends on them.
- Keep token values single-sourced: if a color is in `colors.primary` as hex, the prose can name and describe its role without reasserting a different value. The frontmatter is normative.
- Keep frontmatter groups within Stitch's schema: `colors`, `typography`, `rounded`, `spacing`, and `components`. Put other material in the prose sections (Overview, Elevation, Components).
