---
name: hs-brainstorm
description: Turn a vague or incomplete feature request into a clear, testable spec before any code gets written, filed into this project's spec history so it doesn't get silently overwritten by the next feature. Use this whenever a user describes a new feature, a bug whose fix approach isn't decided yet, or any change where "what to build" isn't fully nailed down — even if they didn't ask for a "spec" by name, or jumped straight to "just build me X." Also use it when resuming work on a project that already has `.harness/specs/` with specs in progress. Skip only for genuinely trivial one-line changes (typo, config value tweak).
---

# hs-brainstorm

Use the project-local runtime as `npm exec -- hs`; never assume `scripts/` exists in the target project.

## Why this phase exists, and why specs live in their own folder

Code is a derived artifact of a decision about what to build. If that
decision never gets written down, it lives only in the conversation — which
means it gets re-litigated every time context gets compacted, a new session
starts, or someone else picks up the thread. A spec is what lets "is this
done" become a factual question instead of a matter of opinion later in
`hs-verify`.

In practice this cycle runs over and over on the same project — a second
feature starts while the first is still being verified, a third revisits
something already shipped. A single `.harness/spec.md` can't hold that: the
next feature would silently overwrite the last one's spec. So each feature
gets its own directory under `.harness/specs/`, and `.harness/specs/INDEX.md`
keeps a glanceable record of every spec this project has ever had, instead of
history living only in scattered, overwritten files.

## Process

1. **Check spec history first.** Read `.harness/specs/INDEX.md` and
   `.harness/state/current-spec` if they exist.
   - Nothing there yet: this is the first feature through the harness on this
     project — skip to step 2.
   - `current-spec` points at a spec that isn't `shipped` yet: you're likely
     resuming it. Read that spec's files and confirm with the user whether to
     continue it or start a new one — don't assume.
   - Every existing spec is `shipped`: this is a new feature. Go to step 2;
     don't touch the old ones.

2. **Delegate a quick scouting pass** (see `docs/agents.md#hs-scout--cheap-context-gathering-subagent`)
   before interviewing the user: hand it a narrow question like "what
   already exists in this codebase related to <the request>, and are there
   docs describing the relevant conventions?" Use its briefing to avoid
   asking the user things the code already answers. If no subagent mechanism
   is available, do this same lightweight look yourself before asking
   questions — don't skip the step, just do it inline.

3. **Ask only what changes the outcome.** Reserve questions for things that
   would send the implementation in a genuinely different direction: who the
   feature is for, what's explicitly out of scope, hard constraints. Cap it
   at roughly 3-5 questions. Don't ask about things the scouting pass already
   answered or that don't actually matter to the shape of the solution.

4. **Create the spec directory.** Pick a short kebab-case slug for the
   feature (e.g. `user-auth`), reserve the next ID, then select it as active:

   ```bash
   npm exec -- hs state reserve <kebab-case-slug>
   npm exec -- hs state select <ID>-<slug> --replace
   ```

   Then:
   - create `.harness/specs/<ID>-<slug>/spec.md` using the template in
     `references/spec-template.md`
   - add a row to `.harness/specs/INDEX.md` (see the same reference file for
     the header row if it doesn't exist yet)

5. **Stop and ask for approval.** Present the spec, then end your turn
   waiting for an explicit answer. Don't infer approval from silence, and
   don't write `**Status:** approved` yourself — that line only gets set
   after the user actually confirms. If they ask for changes, revise and ask
   again.

Templates for `spec.md` and `INDEX.md` are in `references/spec-template.md`
— read it the first time you create either file. `Phase` on the `INDEX.md`
row tracks which skill last touched a spec (`brainstorming`, `planning`,
`building`, `verifying`, `reviewing`, `shipped`); `reviewing` is set only if
`hs-review` ran — it's advisory, so `hs-ship` may jump straight from
`verifying` to `shipped`.

## Exit condition

- `.harness/specs/<ID>-<slug>/spec.md` exists, every requirement is written
  as an observable condition, and "Out of scope" is non-empty.
- `.harness/specs/INDEX.md` has a row for it and `.harness/state/current-spec`
  points at it.
- `**Status:** approved` is present in `spec.md`, set by the user's explicit
  confirmation.

## Common failure modes

- Writing a long spec to look thorough — a tight one-pager beats five pages
  nobody will re-read once building starts.
- Sneaking implementation details into the spec ("use a Redis cache for this").
  The spec says *what*; `hs-plan` decides *how*.
- Starting a new spec directory without checking `INDEX.md` first, ending up
  with two specs for the same feature.
- Treating the user's first answer as final when it still leaves a requirement
  vague — better to ask one more sharp question now than to guess wrong in
  `hs-build`.

## Common rationalizations

Excuses to skip this phase, and why they don't hold:

| Rationalization | Reality |
|---|---|
| "The request is clear enough, I don't need a spec" | Simple tasks don't need a *long* spec — a two-line Goal plus one acceptance criterion is fine. But without any spec, "done" becomes an opinion nobody can check in `hs-verify`. |
| "I'll write the spec after coding, when I understand it better" | That's documentation, not specification. The value is forcing the what-question *before* code exists to bias the answer. |
| "The user said 'just build it', so approval is implied" | "Just build it" approves the effort, not a specific spec. Present the spec anyway — it takes one message, and it's what the whole downstream harness verifies against. |
| "Asking questions makes me look less capable" | Guessing wrong and rebuilding looks worse. Cap it at 3-5 questions that genuinely change the outcome. |
