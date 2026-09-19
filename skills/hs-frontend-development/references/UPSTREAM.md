# Upstream: fk-skills

The flows in this skill are ported from
[ThinhTP204/fk-skills](https://github.com/ThinhTP204/fk-skills) at commit
`ad67c46` (its `.claude/skills/fk/` copy).

Each ported file starts with an HTML comment naming its upstream file and
commit. The flow text is upstream's; the changes below are the only ones
made, so a later sync only needs to re-apply this list.

## File mapping

| Here | Upstream (`reference/`) | Differs from upstream |
|---|---|---|
| `setup.md` | `setup.md` | Yes (see below) |
| `spec.md` | `spec.md` | Yes |
| `tokens.md` | `tokens.md` | No |
| `brand.md` | `brand.md` | One sentence |
| `product.md` | `product.md` | No |
| `design-brief.md` | `plan.md` | Yes; renamed so it does not read as `hs-plan` |
| `build.md` | `build.md` | Yes |
| `finish.md` | `finish.md` | One step |
| `check.md` | `check.md` | Wording and command lists only |
| `review.md` | `review.md` | Yes (no detector, no snapshot) |
| `space.md` | `space.md` | Live-mode section, one handoff line |
| `type.md` | `type.md` | Live-mode section, one handoff line, one sentence |
| `color.md` | `color.md` | Live-mode section, one handoff line |
| `motion.md` | `motion.md` | One handoff line |
| `responsive.md` | `responsive.md` | One handoff line |
| `copy.md` | `copy.md` | One handoff line |
| `interaction-design.md` | `interaction-design.md` | No |
| `../SKILL.md` | `SKILL.md` | Design guidance is upstream's; Setup, flows, and routing are rewritten |

Command names in the ported text follow this kit: `setup`, `spec`, and
`tokens` are `hs-frontend-development <flow>`; the plan, build, and review
flows are reached with `--fe` on `hs-brainstorm`, `hs-plan`, `hs-build`, and
`hs-code-review`.

## What was left out, and why

- **Scripts** (`context.mjs`, `palette.mjs`, `detect.mjs` and the detector,
  `critique-storage.mjs`, the live-mode and hook scripts). The kit keeps
  executable logic in `hooks/`, not per skill. Where a flow called one, the
  call is replaced by the native equivalent (read PRODUCT.md and DESIGN.md
  directly; choose the brand seed color deliberately) or by the flow's own
  documented fallback.
- **Commands not requested:** `live`, `hooks`, `pin`/`unpin`, `perf`,
  `amplify`, `calm`, `trim`, `joy`, `wow`, `prod`, `welcome`.
- **`codex.md`** and the `fk_asset_producer` subagent (Codex-only image
  generation). `build.md` treats the harness as lacking native image
  generation, which its own Step 3 already handles with a one-line skip.

## Deviations by file

**`setup.md`**
- Removed the live-mode config bullet, the old Step 6 (live config and CSP
  patching), the `.fk-skills.md` legacy-rename sentence, and the
  "recommend `/fk live`" line. Old Step 7 is now Step 6.
- `/fk ...` commands became the kit's invocations; the spec flow is linked
  as `spec.md`.
- Follow-up recommendations that pointed at commands not ported
  (`space`, `color`, `prod`, `welcome`, `copy`) were replaced by `tokens`.

**`spec.md`**
- Removed Step 4b (the `.fk-skills/design.json` sidecar) and every mention
  of the live panel that consumed it. Things Stitch's schema cannot hold
  (shadows, focus rings, motion) go in the `## Components` / `## Elevation`
  prose instead of the sidecar.
- Step 5 lost the "sidecar was also written" item.
- `/fk spec` became `hs-frontend-development spec`, including inside the
  seed-mode `<!-- SEED -->` marker.

**`brand.md`**: dropped the reference to departure-mode variants in
`live.md`.

**`design-brief.md`**: the handoff lines and "Recommended References" point
at this kit's flows instead of `/fk craft`, and its "Recommended
References" example list uses the same renamed files as `build.md` Step 2.

**`build.md`**
- Added a kit note at the top (no `codex.md`; "shape" means the design brief
  flow, "craft" means this build flow).
- Step 1 runs the design brief flow instead of `/fk shape`.
- Step 2 (Load References) is upstream's list. Upstream's text still uses
  the pre-rename file names, so they are mapped to the files that exist:
  `layout` -> `space.md`, `typeset` -> `type.md`, `animate` -> `motion.md`,
  `colorize` -> `color.md`, `adapt` -> `responsive.md`, `clarify` ->
  `copy.md`; `interaction-design.md` is unchanged.
- Step 3's link to `codex.md` became plain text pointing at the kit note.

**`finish.md`**: Step 4 no longer runs `critique-storage.mjs`; it reads a
prior `hs-code-review --fe review` report from the conversation or a saved
copy the user points to.

**`check.md`**: the "suggested command" lists and the closing re-run line
use this kit's flows.

**`space.md`, `type.md`, `color.md`, `motion.md`, `responsive.md`,
`copy.md`**: these were commands upstream; here they are topic references,
loaded by the build flow or when a task is about that topic.
- "hand off to `/fk polish`" became `hs-build --fe finish`.
- `space.md`, `type.md`, and `color.md` lost their "Live-mode signature
  params" sections (variant params for the live mode that is not ported);
  `type.md` also lost a sentence pointing at `bolder.md`.
- The rest of each file, including its Reference Material section, is
  unchanged.

**`review.md`**
- Added a kit note: the bundled detector is missing, which the file's own
  invariant allows ("unless `detect.mjs` is missing").
- Removed the slug and `ignore.md` setup steps, the whole "Persist the
  Snapshot" section (snapshot write and trend), and the live-server
  overlay flow.
- Assessment B is now browser evidence (fresh tab, screenshots at mobile,
  tablet, and desktop, each read back) plus a manual anti-pattern scan.
- The report's "Deterministic scan" paragraph states the detector is
  unavailable; the "Visual overlays" paragraph is gone.
- Suggested-command and recommended-action lists use this kit's flows.
- The heuristics, cognitive-load, and persona reference material is
  unchanged.

## Known gaps versus upstream

- No deterministic anti-pattern detector, so `review` and `check` report
  "deterministic scan unavailable" and rely on manual and browser evidence.
- No curated brand-seed picker (`palette.mjs`); Setup step 5 asks for a
  deliberate choice instead.
- No review snapshots or trend line.

## Re-syncing

Diff upstream's `reference/<file>.md` against the file here, ignoring the
first (comment) line, and re-apply the deviations above. Bump the commit
hash in each file's header comment and in this file.
