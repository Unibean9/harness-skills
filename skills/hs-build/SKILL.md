---
name: hs-build
description: Implement an approved plan one task at a time, running each task's own verification command before moving to the next, and recording the actual result — never advance on a task "looking right." Use this once the active spec's plan.md is approved (see hs-plan) and it's time to write code, edit files, or wire up whatever the plan describes. If there's no approved plan yet, go get one first instead of using this skill to freelance.
---

# hs-build

Use the project-local runtime as `npm exec -- hs`; record evidence against the explicit spec being built.

## Why this phase exists

The failure mode this phase prevents is subtle: implementing five tasks in a
row and then discovering something's broken, with no idea which task caused it.
Verifying after every single task — not after the batch — is what keeps a
failure attributable. It's slower per-task and faster overall, because you
never have to re-diagnose from scratch.

## Process

Read `.harness/state/current-spec` once at the start to get the selected `<active>`.
The task list lives in one of two places, depending on whether
`hs-brainstorm` used the full template or the light one (see
`skills/hs-brainstorm/references/spec-template.md`):
- **Light mode**: `.harness/specs/<active>/spec.md` has its own `## Tasks`
  section — this is the plan. Nothing else needs to be `approved`
  separately; the spec's own `**Status:** approved` already covers it.
- **Full mode**: `.harness/specs/<active>/plan.md` exists and must be
  `**Status:** approved`.

If neither is true, stop — go get a plan first.

Then repeat for each task in the task list, in order:

1. Read the task list (`spec.md`'s `## Tasks` in light mode, `plan.md`
   otherwise) and `.harness/specs/<active>/progress.md`
   (create the latter if it doesn't exist yet) to find the next task not yet
   marked done.

2. **Delegate a scouting pass** (see `docs/agents.md#hs-scout--cheap-context-gathering-subagent`) with this
   task's concrete question: "does code that does this (or close to it)
   already exist in this repo, and where?" Reusing beats duplicating, and
   duplicated logic is exactly the kind of thing that drifts out of sync
   later — but only worth a scouting round-trip for non-trivial tasks; for a
   one-line change, just look yourself.

3. **Implement only this task's scope.** If you notice something else that
   seems worth doing while you're in there, don't do it now — add a one-line
   note under `## Deferred` in `.harness/specs/<active>/implement-notes.md`
   (template below) and keep moving. Scope creep here is how a "small task"
   stops being verifiable.

4. **Record any judgment call the plan didn't make for you.** A plan
   describes intent, not every implementation detail — you'll routinely have
   to decide something it left open: which of two equivalent approaches,
   how to handle a case the plan didn't mention, what to name something.
   Making that call is fine; making it silently isn't. Append it to
   `.harness/specs/<active>/implement-notes.md` (create it if it doesn't
   exist) right after implementing the task, using this template:

   ```markdown
   ## Task <N>: <name>
   - Decision: <what you chose, in one line>
   - Why: <the reasoning, briefly>
   ```

   This is what lets a reviewer, or a future session that didn't watch you
   work, tell "followed the plan exactly" apart from "used judgment here" —
   both are legitimate, but only one is visible in the diff without this file.

5. **Run this task's verify command** using the bundled runtime:

   ```bash
   npm exec -- hs check task-<N> -- <verify command from the plan>
   ```

   This writes `task-<N>.status`/`.log` under this spec's own runtime
   directory (`.harness/state/specs/<active>/checks/`) — so a second spec's
   task numbering can't collide with this one's.

   If it fails, treat the error output as information, not a verdict on you:
   read it literally, form one specific hypothesis about the cause, and test
   that hypothesis with your next change. If it's still failing after two real
   attempts, stop guessing — describe to the user what you tried and what the
   actual error says, and ask how to proceed. Repeatedly retrying the same fix
   without new information isn't diligence, it's noise.

6. **On a PASS**, `hs check task-<N>` automatically appends the
   `- [x] Task <N>: <name> — verify: \`<command>\` -> PASS` line to
   `.harness/specs/<active>/progress.md` itself (looking the task's name up
   from `plan.md`/`spec.md`) — confirm it looks right rather than re-writing
   it. If it's missing (the task list wasn't in a shape the lookup could
   parse), append that exact line yourself; don't silently move on without it.

7. Move to the next task. Once every task is done, `hs check` has already
   updated this spec's row in `.harness/specs/INDEX.md` to `Phase` =
   `building` — confirm it, don't re-set it. If it didn't update (same
   parsing-failure case as step 6), set it yourself: `Phase` = `building`,
   `Updated` = today's date
   (hs-verify will move it to `verifying` next).

## Escalating to a human mid-build

Most tasks don't need a check-in — that would defeat the point of having a
plan. Stop and ask only when:
- the task would do something hard to reverse (delete data, rewrite a schema,
  force-push, anything outside the repo), or
- implementing it reveals the requirement was actually ambiguous — the plan
  said one thing, but the code raises a case the spec didn't address.

## Exit condition

- Every task in the task list (`plan.md`, or `spec.md`'s `## Tasks` in light
  mode) has a corresponding `[x]` line in `progress.md` with its real verify
  command and PASS result.
- `git diff --stat` (or equivalent) shows only files the plan named — nothing
  extra snuck in.
- Any judgment call you made that the plan didn't spell out is in
  `implement-notes.md` — not left implicit in the diff for a reviewer to have
  to reconstruct.

## Common failure modes

- A check reports `FAIL` even though the command's own output looks fine —
  check the note printed alongside it first. `hs check` also fails a command
  that exits 0 but changes the worktree (a coverage file, a build cache not
  gitignored) — that's a side-effect bug in the *verify command*, not in the
  code you just wrote. Don't start debugging the implementation before
  ruling this out.
- Batching several tasks before running any verification — if it fails, you've
  lost the ability to tell which task broke it.
- "Tidying up" nearby code that the task didn't ask you to touch — it inflates
  the diff and makes review harder for no benefit tied to the spec.
- Copy-pasting a block of logic a third time instead of extracting it once —
  that's exactly the kind of drift a small, verified task should prevent, not
  create.
- Making a real design decision (retry strategy, data shape, which library
  function) and only mentioning it in passing, if at all — if it wasn't in
  the plan and you decided it anyway, it belongs in `implement-notes.md`.

## Common rationalizations

Excuses to skip steps here, and why they don't hold:

| Rationalization | Reality |
|---|---|
| "These three tasks are related, I'll verify them together" | Verifying per task is what makes a failure attributable. Batch three and fail, and you're bisecting your own uncommitted work. |
| "The verify command passed last time and I barely changed anything" | "Barely changed" is exactly the diff size where regressions hide. The command takes seconds; run it again. |
| "This nearby cleanup is too small to defer" | Then it's also too small to lose by writing one line under `## Deferred`. Scope creep is many small "too small to defer"s. |
| "The code looks right, marking the task done" | Looking right is the claim; the verify command's PASS on disk is the evidence. Only the second one counts in `progress.md`. |
