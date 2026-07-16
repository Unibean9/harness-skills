---
name: hs-verify
description: Run the project's full test/lint/build suite as one deterministic pass and record a pass/fail verdict on disk — the sensor that decides whether a change is actually done, independent of what any individual task claimed along the way. Use this after all tasks in the active spec's plan are implemented, before `hs-review` or `hs-ship`, or any time a user asks "is this actually working," "did the tests pass," or "are we done."
compatibility: bundled scripts are Node-native (`node scripts/*.mjs`) — Node.js 22+ on `PATH` is the only requirement, no POSIX shell needed
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

1. Read `.harness/state/current-spec` to get the selected `<active>`.

2. **Delegate a scouting pass** (see `docs/agents.md#hs-scout--cheap-context-gathering-subagent`) if it's not
   already obvious: "what are this project's actual test/lint/build commands
   — check package.json scripts, Makefile, and CI config." Don't guess these;
   a wrong command produces a false PASS, which is worse than no verdict.

3. Run each check through the bundled script, one label per check:

   ```bash
   node scripts/run-check.mjs verify-tests -- <test command>
   node scripts/run-check.mjs verify-lint -- <lint command>
   node scripts/run-check.mjs verify-build -- <build command>
   ```

   Adjust labels/commands to whatever the project actually has — not every
   project has all three.

4. **If a check can't be automated** (visual appearance, UX feel, subjective
   quality) — that's a real limit of the sensor, not something to fake a
   result for. Describe what you can't verify programmatically, show the user
   the relevant output, and let their judgment fill that specific gap. Then
   write that verdict as a status file yourself, in the same place and format
   `run-check.mjs` would have written it — `<spec-state-dir>/<label>.status`
   containing exactly `PASS` or `FAIL` (find `<spec-state-dir>` by resolving
   `.harness/specs/<active>/state/`; that's what `run-check.mjs` also targets
   once a spec is selected). Give it its own label (e.g. `verify-ux`) alongside
   the automated ones.

5. **Combine into one attested verdict.** Don't hand-write
   `.harness/state/verify-all.status` — that file only means something when
   it's bound to this exact spec and this exact worktree, which is what the
   attestation script does:

   ```bash
   node scripts/attestation.mjs attest verify-tests verify-lint verify-build
   ```

   Pass every label you ran or hand-wrote a verdict for, including any manual
   one from step 4. This fails closed: if any named label's `.status` file
   isn't `PASS` (including missing), it errors out instead of writing an
   attestation — `hs-ship`'s readiness check and the `shipGate` hook both
   require a valid attestation, not just a `PASS` string, so this step is what
   actually makes verification count for anything downstream.

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
   invalidated automatically anyway (its fingerprint won't match the changed
   worktree), but don't rely on that; just redo the whole pass.

## Exit condition

- `node scripts/attestation.mjs validate` prints `VALID` — a real
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
- Hand-writing `.harness/state/verify-all.status` instead of running the
  `attest` step — a hand-written `PASS` isn't bound to a specific spec or
  worktree state, so `hs-ship`'s readiness check (and the `shipGate` hook)
  will reject it as `NOT GREEN` even though the string says `PASS`.

## Common rationalizations

Excuses to skip this phase, and why they don't hold:

| Rationalization | Reality |
|---|---|
| "Every task already passed its own verify, the whole thing must pass" | Individually-passing tasks can interact badly. This phase exists precisely because per-task green isn't whole-change green. |
| "Tests pass, lint and build are surely fine" | Each check catches what the others can't — lint catches what runs, build catches what tests don't import. Run what the project has. |
| "I verified before that last tiny tweak, close enough" | The attestation is fingerprinted to the exact worktree — any change invalidates it, and that's by design. Rerun the full set. |
| "I can't automate this check, so I'll call it a pass" | An unautomatable check is a real sensor limit — hand that specific gap to the user's judgment and record *their* verdict, don't fabricate yours. |
