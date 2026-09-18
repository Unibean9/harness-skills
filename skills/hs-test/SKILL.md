---
name: hs-test
description: Verify changed behavior with the smallest relevant suite - white-box (unit/integration, reading the implementation) or black-box (e2e/UI via Playwright MCP, treating it as a closed system) - and report real pass/fail evidence. Use after each task in hs-build, when asked to run or write tests, or before claiming work is done. Not for reviewing code quality (hs-code-review).
license: MIT
category: workflow
keywords: [test, unit, integration, e2e, playwright, coverage, evidence]
metadata:
  author: harness-skills
  version: "1.5.0"
  workflow:
    follows: [build]
    precedes: [code-review, ship]
---

# Test Skill

Verify that changed behavior actually works, with a real command (or a real
captured trace) and its real output as evidence - not a claim based on how
the code reads.

## Core principles

- Derive happy-path, failure, and boundary cases from the requirement, not
  just whatever suite already exists.
- Run the smallest relevant suite by default; widen scope only if the
  change touches shared or stateful code.
- Report the exact command and its real output (or the captured evidence
  path) - a claim without either isn't a finding, it's a guess.
- Never ignore a failing test to pass the build - fix the root cause, not
  the symptom, and never mock/skip/tweak a test just to turn it green.
- A failing or skipped check blocks the task's commit in `hs-build` and
  everything after it - don't hand off "done" work with a known-red or
  unverified suite.

## White-box vs black-box

Pick the mode(s) that match what actually changed - most changes need only
white-box; reach for black-box when behavior is only observable from
outside the process.

| Mode | What it verifies | Typical tools |
|---|---|---|
| **White-box** | Internal logic, with the implementation visible - unit tests, integration tests against real dependencies, edge cases derived from reading the code's branches | The project's own test runner (jest/pytest/go test/...) |
| **Black-box** | Observable behavior through a real interface, implementation hidden - UI flows, API contracts, cross-service integration | Playwright MCP (see below), curl/API client against a running instance |

Use white-box for anything whose correctness lives in a function's logic.
Use black-box for anything whose correctness only shows up in the rendered
page, the network response, or a multi-step user flow - a white-box unit
test can pass while the actual UI is broken.

When black-box work touches a UI or HTTP-facing flow and Playwright MCP
tools are available, drive the real flow yourself and capture evidence as
you go rather than describing it - see
`references/evidence-capture-playwright.md` for the capture procedure and
where evidence is saved.

## One minimal example flow

1. Identify what changed (the diff, or the task's acceptance criteria) and
   derive the test cases that actually matter.
2. Decide white-box, black-box, or both, per the table above.
3. Run the white-box suite per Core principles, and drive black-box flows
   through Playwright MCP where the behavior is only observable that way.
4. For behavior not covered by an existing test, write one before treating
   the change as verified.
5. Record the commands run and their pass/fail output (plus any captured
   evidence paths).

## Handoff

Return the evidence to `hs-build`: green means the task can be committed,
red means it goes back to implementation with the failing output. The same
evidence later fills the PR body in `hs-ship`.

## References

- `references/evidence-capture-playwright.md` - black-box capture procedure
  and where evidence is saved.
- `references/coverage-and-checklist.md` - reading coverage, what makes a
  test trustworthy, and the checklist before calling a change verified.
- `../hs-backend-development/references/testing.md` - what unit and
  integration tests to write for a backend.

## Make it yours

Delegate to the `tester` subagent when the surface is large enough to
warrant a narrow, non-conversation-polluting pass. Add your own coverage
bar (e.g. "no PR under 80% diff coverage") if your project tracks one -
none is assumed by default; `references/coverage-and-checklist.md` covers
how to choose one.
