---
name: hs-verify
description: Run the project's full test/lint/build suite as one deterministic pass and record a pass/fail verdict on disk — the sensor that decides whether a change is actually done, independent of what any individual task claimed along the way. Use this after all tasks in the active spec's plan are implemented, before `hs-ship`, or any time a user asks "is this actually working," "did the tests pass," or "are we done."
compatibility: bundled script needs a POSIX shell (bash) — available via Git Bash on Windows, native on macOS/Linux
---

# hs-verify

## Why this phase exists

`hs-build` verifies tasks individually; this phase verifies the whole change at
once, the way a reviewer or CI would. Individually-passing tasks can still
interact badly together. This is also the one place in the harness where "done"
stops being an opinion the model holds about its own work and becomes a fact
written to a file — that distinction is the entire point of having a separate
phase for it instead of folding it into `hs-build`.

## Process

1. Read `.harness/state/current-spec` to get `<active>`.

2. **Delegate a scouting pass** (see `.agents/agents/hs-scout.md`) if it's not
   already obvious: "what are this project's actual test/lint/build commands
   — check package.json scripts, Makefile, and CI config." Don't guess these;
   a wrong command produces a false PASS, which is worse than no verdict.

3. Run each check through the bundled script, one label per check:

   ```bash
   bash .agents/skills/hs-verify/scripts/run-check.sh verify-tests -- <test command>
   bash .agents/skills/hs-verify/scripts/run-check.sh verify-lint -- <lint command>
   bash .agents/skills/hs-verify/scripts/run-check.sh verify-build -- <build command>
   ```

   Adjust labels/commands to whatever the project actually has — not every
   project has all three.

4. **Combine into one verdict.** After running every check, write
   `.harness/state/verify-all.status`: `PASS` only if every individual check's
   `.status` file says `PASS`, otherwise `FAIL`. This is the file `hs-ship`
   looks for.

5. **If a check can't be automated** (visual appearance, UX feel, subjective
   quality) — that's a real limit of the sensor, not something to fake a
   result for. Describe what you can't verify programmatically, show the user
   the relevant output, and let their judgment fill that specific gap. Record
   their verdict the same way: write it into `verify-all.status` honestly.

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
   either way, `hs-ship` will move it to `shipped`).

8. If anything failed, don't patch it here — hand the specific failing output
   back to `hs-build` (or straight to the user) to fix, then rerun `hs-verify`
   from the top once it's addressed. Partial re-verification defeats the
   purpose; rerun the full set.

## Exit condition

- `.harness/state/verify-all.status` exists and reflects every check that was
  actually run — not a subset, not an assumption.
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
