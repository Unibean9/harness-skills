---
name: hs-plan
description: Break an approved spec into a small, ordered list of tasks, each with its own verification command, before writing any implementation code. Use this right after a spec has been approved (see hs-brainstorm) and before touching any source file. Also use it when a user asks to "plan this out," wants a task breakdown, or is about to jump straight into coding a nontrivial change without one — planning first is cheaper than redoing work because the shape of the change wasn't decided.
compatibility: bundled scripts are Node-native (`node scripts/*.mjs`) — Node.js 22+ on `PATH` is the only requirement, no POSIX shell needed
---

# hs-plan

## Why this phase exists

A task you can't verify is a task you can't finish — you can only guess that
you finished it. Splitting the spec into small steps, each with its own
verification command, is what turns `hs-build` from "write code, hope it's
right" into a loop that catches its own mistakes as it goes. Capturing a
baseline here also matters: if something is already broken before you start,
you need to know that now, not discover it mid-build and wonder if you caused it.

## Process

1. Read `.harness/state/current-spec` to find the selected spec, then read
   `.harness/specs/<active>/spec.md`. If there's no active spec, or its
   `**Status:**` isn't `approved`, stop — go back to `hs-brainstorm` first.
   Don't plan against an unapproved spec; it may still change.

2. **Delegate a scouting pass** (see `docs/agents.md#hs-scout--cheap-context-gathering-subagent`) with a
   narrow question: "which files would a change like `<spec goal>` likely
   touch, and does this project have an existing pattern for similar work?"
   Use the briefing to ground the task breakdown in what's actually there,
   instead of guessing file layout from the spec alone.

3. **Capture a baseline.** Find the project's existing test/build/lint command
   (check `package.json`, `Makefile`, CI config, or ask if it's not obvious), then
   run it through the bundled script:

   ```bash
   node scripts/run-check.mjs baseline -- <test-or-build-command>
   ```

   This writes `baseline.status` (`PASS`/`FAIL`) and `baseline.log` under this
   spec's own state directory (`.harness/specs/<active>/state/`, so a second
   spec running concurrently doesn't overwrite this one's baseline). If
   baseline is `FAIL`, tell the user before planning further — building on a
   broken foundation means you can't tell your changes apart from pre-existing
   breakage later.

4. **Decompose into tasks.** Each task should be small enough to verify
   independently — rule of thumb, something one person could finish in 15-30
   minutes. For each task, capture:
   - which requirement in the spec it satisfies
   - which files it touches
   - what it does (a few bullet points, not prose)
   - the exact command that verifies it's done

5. Write `.harness/specs/<active>/plan.md` using the template below.

   Also create `.harness/specs/<active>/verify.json`: version `1` with the
   complete required check set. A machine check has `label`, `kind: "machine"`,
   and an argv array; a manual check has `kind: "manual"` and `argv: null`.
   This is the machine-readable contract hs-verify must attest, not prose the
   agent may silently narrow later.

6. **Cut ruthlessly.** Re-read the task list. Any task that doesn't trace back
   to a spec requirement gets removed — this is where YAGNI actually earns its
   keep, not just as a slogan. Any two tasks doing near-identical things get
   merged.

7. **Stop and ask for approval**, the same way `hs-brainstorm` does. Don't set
   `**Status:** approved` yourself.

8. Update this spec's row in `.harness/specs/INDEX.md`: `Phase` = `planning`,
   `Updated` = today's date.

## Plan template (`.harness/specs/<active>/plan.md`)

```markdown
# Plan: <feature name>

**Status:** draft

**Baseline:** `<command>` -> see `.harness/specs/<active>/state/baseline.status`

## Task 1: <name>
- Spec: <which requirement this satisfies>
- Files: <concrete paths>
- Do: <1-3 bullets>
- Verify: `<exact command>`

## Task 2: ...
```

## Exit condition

- Every task has all four fields, especially Verify — a task without one isn't
  actually plannable, it's a wish.
- Baseline has been captured and reported to the user.
- `**Status:** approved` is present, set by explicit user confirmation.
- The spec's row in `INDEX.md` reflects `planning`.

## Common failure modes

- Tasks phrased like "implement feature X" — too big to verify as one unit,
  keep splitting until each piece has an obvious pass/fail command.
- Adding tasks for things that are merely convenient while you're in there
  ("might as well upgrade this dependency too") — if it doesn't trace to the
  spec, it doesn't belong in this plan.
- Skipping the baseline because "the tests obviously pass" — obviously isn't
  evidence; run it.

## Common rationalizations

Excuses to skip this phase, and why they don't hold:

| Rationalization | Reality |
|---|---|
| "The change is small, planning is overhead" | A small change gets a small plan — one task with one verify command. What it can't get is *no* verify command, because then `hs-build` has nothing to check against. |
| "I already know which files to touch" | Then the plan takes two minutes to write and costs nothing. If it feels hard to write down, you didn't actually know. |
| "The baseline will obviously pass, skip it" | If it passes, running it cost one command. If it doesn't, you just avoided blaming yourself later for breakage that predates you. |
| "This extra task will be useful while I'm in there" | If it doesn't trace to a spec requirement, it doesn't belong in this plan. Note it for a future spec instead. |
