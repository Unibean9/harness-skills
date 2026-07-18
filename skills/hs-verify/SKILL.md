---
name: hs-verify
description: Evaluate whether a completed change meets its relevant automated and manual checks, then report evidence and limitations honestly. Use before handoff, review, commit, PR, or shipping a change.
---

# hs-verify

Verification is evidence-driven, not script-driven. Choose checks matching the
changed surface: targeted tests, lint, typecheck, build, migration validation,
and/or manual user-flow checks. Do not run irrelevant commands merely to
satisfy a phase label.

`scripts/fingerprint-worktree.mjs` is the only optional phase-local helper.
It prints a deterministic hash of the current Git worktree; it does not run a
check, write state, or decide whether work can proceed.

## Process

1. Read the acceptance criteria and changed files. Identify the smallest set
   of automated and manual checks that can support the claim.
2. Run them with the project's native commands. Preserve command, result, and
   meaningful limitation in `progress.md`, the PR description, or the handoff
   when durable evidence is useful.
3. If exact linkage between evidence and the current worktree matters, run:

   ```bash
   node "<skill-dir>/scripts/fingerprint-worktree.mjs"
   ```

   Record the returned hash beside the results. Skip it when a plain report is
   sufficient; it is a diagnostic aid, not a workflow requirement.
4. Report failures, skipped checks, and untested risk plainly. Fix and rerun
   only checks affected by a change, unless the project or user asks for a full pass.

Provider-specific hook companions may enforce additional evidence for a commit
or push when explicitly installed. Those policies are opt-in and do not change
this portable skill into a hard gate.

## Exit condition

- Relevant checks ran, or an intentional omission and its risk are documented.
- Results are PASS, FAIL, or limited evidence—never inferred from confidence.
- A worktree fingerprint is included only when it improves traceability.

## Common failure modes

- Running a broad suite while skipping the check that exercises changed behaviour.
- Equating an exit code with complete product validation.
- Treating a missing optional helper as a reason not to verify.
