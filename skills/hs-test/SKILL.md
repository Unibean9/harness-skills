---
name: hs-test
description: Provide executable feedback on changed behavior with the smallest relevant white-box or black-box probe, then classify the result and report real evidence. Diagnose failures against accepted intent, domain rules, and current implementation before deciding whether code, tests, fixtures, or environment are wrong. Use after implementation, when asked to run or write tests, or before claiming work is verified. It does not own code review or product semantics.
license: MIT
keywords: [test, unit, integration, e2e, playwright, coverage, evidence]
metadata:
  category: workflow
  author: harness-skills
  version: "2.0.0"
  workflow:
    follows: [build]
    precedes: [code-review, ship]
---

# Test Skill

Tests are feedback mechanisms, evidence producers, and regression detectors.
They probe accepted intent and current implementation; they do not define
product semantics or make the implementation correct merely by existing.

Use this truth model:

- accepted intent, domain policy, and public contracts define desired behavior;
- production code, API, schema, and configuration describe current
  implementation reality;
- tests provide executable evidence and regression feedback.

## Result states

Return one or more of these states with the exact command, output, and
evidence path:

- **VERIFIED:** relevant probes passed and provide sufficient evidence for the
  claimed behavior.
- **FAILED:** a reproducible production defect remains.
- **TEST-DEFECT:** the test, fixture, or expectation is stale or incorrect.
- **UNVERIFIED:** a required probe could not run or evidence is insufficient.
- **FLAKY:** the signal is nondeterministic and cannot count as verification.

Green is not a synonym for correct, and red is not automatic proof that
production code is wrong.

## Choose the probe

Derive happy, failure, and boundary cases from accepted intent and the changed
behavior, not only from the existing suite. Choose the cheapest probe that
crosses the relevant risk boundary:

| Risk | Probe |
|---|---|
| Pure/domain rule | Focused unit or property test. |
| Database, query, constraint, transaction, or migration semantics | Integration test with the relevant real dependency or engine. |
| HTTP/API contract, auth, or serialization | API-level integration or contract test. |
| External integration | Narrow owned-boundary contract test plus targeted real integration when compatibility risk warrants it. |
| UI or rendered workflow | Browser black-box evidence through Playwright or the project's real e2e runner. |
| Regression bug | Lowest-level durable probe that reliably reproduces the failure. |

Use broader tests only when narrower probes cannot establish confidence across
the relevant boundary. Coverage shows executed paths, not assertion quality or
correctness; no universal percentage is assumed.

## Diagnose failures

Before changing production code after a failure:

1. Reproduce it and read the actual output.
2. State what behavior the test claims and trace that claim to intent, policy,
   contract, or an implementation invariant.
3. Compare the claim with current code, fixtures, configuration, and
   environment.
4. Classify the cause as production defect, test defect, fixture/setup issue,
   environment/dependency issue, or flaky behavior.
5. Fix the layer that owns the cause, rerun the smallest relevant probe, and
   widen only when shared impact or risk requires it.

Do not retry until green and call a flaky signal verified. Do not weaken,
skip, delete, or rewrite a test solely to remove a failure. TDD is a useful
technique for clear logic and stable regressions, not a universal harness
requirement.

## Durable test quality

Add or update a checked-in test when the behavior is contract-bearing, the
regression risk is meaningful, a bug reproduction is stable, or a security,
data, concurrency, or state invariant needs durable protection. A one-off
probe may be enough for low-risk or highly environment-specific work when
permanent automation would add little value.

Prefer observable behavior, public contracts, domain invariants, state
transitions, security boundaries, and data effects over private call order or
implementation-only mocks. Use real dependencies where their semantics are
the risk; use focused fakes for pure logic. Mocks are tools, not evidence by
themselves.

## Black-box evidence

When behavior is only observable through a rendered page, network response, or
multi-step user flow, use the real interface and capture meaningful state,
requests/responses, and console errors. Read
`references/evidence-capture-playwright.md` when Playwright MCP is available.
If it is unavailable, use another real project tool or classify the required
claim as `UNVERIFIED`; do not silently skip it.

## Handoff

Return result states, commands, relevant output, captured evidence paths,
limitations, and any diagnosis to `hs-build`. A `FAILED` result returns to the
owning implementation or test layer. `TEST-DEFECT` returns to test or fixture
maintenance. `UNVERIFIED` or `FLAKY` remains visible to review and ship; it is
not presented as a passing check.

## References

- `references/coverage-and-checklist.md` - coverage and trustworthy-test lenses.
- `references/evidence-capture-playwright.md` - black-box evidence procedure.
- `../_shared/evidence-policy.md` - evidence for claims.
- `../hs-backend-development/references/testing.md` - backend verification by risk.

## Boundaries

- Tests sense behavior; accepted intent defines desired behavior; code describes implementation reality.
- Test execution does not authorize product changes, deployments, or external mutations.
- List unresolved questions last when any remain.
