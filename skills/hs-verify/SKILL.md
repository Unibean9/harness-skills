---
name: hs-verify
description: Run the project's full test/lint/build suite as one deterministic pass and record a pass/fail verdict on disk — the sensor that decides whether a change is actually done, independent of what any individual task claimed along the way. Use this after all tasks in the active spec's plan are implemented, before `hs-review` or `hs-ship`, or any time a user asks "is this actually working," "did the tests pass," or "are we done."
---

# hs-verify

Use the project-local runtime as `npm exec -- hs`; execute the manifest rather than rediscovering commands.

## Why this phase exists

`hs-build` verifies tasks individually; this phase verifies the whole change at
once, the way a reviewer or CI would. Individually-passing tasks can still
interact badly together. This is also the one place in the harness where "done"
stops being an opinion the model holds about its own work and becomes a fact
written to a file — that distinction is the entire point of having a separate
phase for it instead of folding it into `hs-build`.

## Process

1. Read `.harness/state/current-spec` to get the selected `<active>`.

2. **Delegate a scouting pass** (see `docs/agents.md#hs-scout--cheap-context-gathering-subagent`) if it's not
   already obvious: "what are this project's actual test/lint/build commands
   — check package.json scripts, Makefile, and CI config." Don't guess these;
   a wrong command produces a false PASS, which is worse than no verdict.

3. Run each check through the bundled runtime, one `verify-*` label per check
   — the `verify-` prefix is what tells the attestation step (below) which
   checks belong to this pass:

   ```bash
   npm exec -- hs check verify-tests -- <test command>
   npm exec -- hs check verify-lint -- <lint command>
   npm exec -- hs check verify-build -- <build command>
   ```

   Adjust labels/commands to whatever the project actually has — not every
   project has all three.

4. **If a check can't be automated** (visual appearance, UX feel, subjective
   quality) — that's a real limit of the sensor, not something to fake a
   result for. Describe what you can't verify programmatically, show the user
   the relevant output, and let their judgment fill that specific gap, then
   record their verdict explicitly (don't infer it):

   ```bash
   npm exec -- hs check --manual verify-ux PASS --note "<what the user confirmed>"
   ```

5. **Combine into one attested verdict.** Don't hand-write a status file —
   that only means something when it's bound to this exact spec and this
   exact worktree, which is what the attestation step does:

   ```bash
   npm exec -- hs attest
   ```

   This bundles every `verify-*` check recorded for the active spec into one
   verdict. It fails if none exist yet, if any isn't `PASS`, or if any isn't
   bound to the exact current worktree state — `hs-ship`'s readiness check and
   the `shipGate` hook both require a valid attestation, not just a `PASS`
   string, so this step is what actually makes verification count for
   anything downstream. Which checks you ran is still this skill's judgment
   call (step 3), not something a manifest enforces — that's why step 3 and
   step 8 matter: nothing catches a skipped check for you.

6. Append the outcome to `.harness/specs/<active>/progress.md` so it's visible
   without re-running anything:

   ```markdown
   ## Verify (<date>)
   - tests: PASS
   - lint: PASS
   - build: PASS
   - overall: PASS
   ```

7. Update this spec's row in `.harness/specs/INDEX.md`: `Phase` = `verifying`
   (or leave at `verified` if you've defined that value — `verifying` is fine
   either way; `hs-review` will move it to `reviewing` next, or `hs-ship` will
   move it straight to `shipped` if review is skipped — it's advisory).

8. If anything failed, don't patch it here — hand the specific failing output
   back to `hs-build` (or straight to the user) to fix, then rerun `hs-verify`
   from the top once it's addressed. Partial re-verification defeats the
   purpose; rerun the full set, then re-attest — a stale attestation is
   invalidated automatically anyway (its fingerprint hashes worktree content,
   not just changed paths, so a further edit to an already-dirty file still
   invalidates it), but don't rely on that; just redo the whole pass.

## Exit condition

- `npm exec -- hs attest validate` prints `VALID` — a real
  attestation exists, binding a PASS to this spec and this exact worktree
  state, not just a `.status` file someone could have hand-edited.
- The result is reflected in `.harness/specs/<active>/progress.md` and the
  spec's `INDEX.md` row.

## Common failure modes

- Running only the tests and skipping lint/build "because the tests passed" —
  each check catches something the others don't.
- Reporting PASS from memory of a previous run instead of actually re-running
  after a fix — a stale verdict is worse than no verdict, because it looks
  authoritative.
- Silently deciding a check "probably passes" for something you can't easily
  automate, instead of flagging it for human judgment.
- Guessing the test/build command instead of checking — a guessed command
  that happens to exit 0 for the wrong reason is a false PASS.
- Hand-writing a `.status` file instead of running `hs attest` — a
  hand-written `PASS` isn't bound to a specific spec or worktree state, so
  `hs-ship`'s readiness check (and the `shipGate` hook) will reject it as
  `NOT READY` even though the string says `PASS`.

## Common rationalizations

Excuses to skip this phase, and why they don't hold:

| Rationalization | Reality |
|---|---|
| "Every task already passed its own verify, the whole thing must pass" | Individually-passing tasks can interact badly. This phase exists precisely because per-task green isn't whole-change green. |
| "Tests pass, lint and build are surely fine" | Each check catches what the others can't — lint catches what runs, build catches what tests don't import. Run what the project has. |
| "I verified before that last tiny tweak, close enough" | The attestation is fingerprinted to the exact worktree — any change invalidates it, and that's by design. Rerun the full set. |
| "I can't automate this check, so I'll call it a pass" | An unautomatable check is a real sensor limit — hand that specific gap to the user's judgment and record *their* verdict, don't fabricate yours. |
