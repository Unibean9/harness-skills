---
name: hs-code-review
description: Independently review a local diff or pull request for concrete reasons not to trust the change. Compare intent and acceptance criteria with current repository behavior, inspect changed tests, apply risk-based domain lenses, and report evidence-backed findings or a clean review. Use after implementation or before merging. It does not fix code, run the test suite as its primary job, or settle product decisions.
license: MIT
keywords: [code-review, review, pull-request, bugs, security, verification]
metadata:
  category: workflow
  author: harness-skills
  version: "2.0.0"
  workflow:
    follows: [test, build]
    precedes: [ship]
---

# Code Review Skill

Look for concrete reasons not to trust the change. Review is read-only and
independent from implementation; it may correctly return no actionable
findings. It is not a formatter, generic best-practice lecture, or substitute
for `hs-test`.

## Review input

Read the intent or acceptance criteria, broad diff shape, changed files,
relevant callers and callees, changed tests, and repository conventions. For a
pull request, include its body, linked issues, comments, head/base revisions,
and current check state. Inspect the exact revision under review.

Separate two passes:

1. **Intent/spec compliance:** does the change implement the requested outcome,
   acceptance criteria, and non-goals?
2. **Repository/system conformity:** does it fit existing boundaries,
   contracts, error handling, persistence, configuration, compatibility, and
   shared rules?

Navigate risk-first: find the changed path with the largest correctness,
security, compatibility, reliability, or user impact, then inspect its
surrounding context before scanning lower-risk files.

## Review lenses

Apply the lenses that fit the diff:

- intent and acceptance;
- correctness and edge/failure behavior;
- repository conformity and compatibility;
- domain-specific security, data, reliability, UI, or platform risk;
- verification gaps;
- unnecessary complexity and scope expansion.

Tests are review targets too. Check whether changed tests have meaningful
assertions, valid fixtures, relevant behavior coverage, intact negative paths,
and appropriate dependency boundaries. Passing tests do not make an incorrect
implementation correct.

The verification-gap lens asks whether a future regression in material
behavior would be noticed. Report a missing permission, payment, migration,
idempotency, API-compatibility, or workflow probe as a **Verification Gap**
when the current code appears correct but durable protection is absent. Do not
mislabel a missing test as a production defect.

## Finding contract

An actionable finding includes:

- `file:line` or another precise location;
- the violated invariant or incorrect behavior;
- a realistic failure path;
- why the current code does not already handle it;
- material impact and the evidence supporting the claim.

Use **Needs verification** when a concern matters but current evidence cannot
establish it. Static reasoning is enough for visible missing guards, unsafe
queries, incompatible signatures, exposed secrets, and obvious control-flow
defects. Runtime behavior, integration success, and visual claims require
`hs-test` evidence or a targeted verification request.

Do not report a preference, alternate architecture, formatting issue, or
speculation unless it produces a concrete current problem.

## Finding triage and severity

Validate a finding before handing it to `hs-build`:

- Is the behavior actually wrong or the protection actually absent?
- Is it already handled downstream or by repository convention?
- Is the concern only an alternate design preference?
- Would fixing it improve the requested change without unapproved scope?

Use this vocabulary:

- **Critical:** exploitable trust-boundary defect, data loss/corruption, or
  destructive incompatibility that blocks shipping.
- **High:** concrete correctness, security, or reliability defect in realistic
  expected use.
- **Medium:** real narrower-impact issue or meaningful edge case.
- **Low:** valid limited robustness or maintainability concern.
- **Verification Gap:** missing meaningful regression protection, not a proven
  production defect.
- **Needs verification:** material concern not established by current evidence.

## Domain routing

Follow `../_shared/domain-routing.md`. Detect domains from changed files and
wording, state the route in one line, apply `validate` for every applicable
domain, and use `review` when risk warrants it. Report frontend P0-P3 through
the workflow severity vocabulary and treat P0 as critical.

- **Frontend:** compare with the confirmed design brief, PRODUCT.md, and
  DESIGN.md. Render the relevant surface through `hs-test` when making visual,
  interaction, responsive, or accessibility claims.
- **Backend:** inspect only relevant contract, authorization, transaction,
  concurrency, resource, migration, and external-dependency lenses.
- **DevOps:** inspect blast radius, rollback, identity and permissions, supply
  chain, cost, drift, plan freshness, operational failure modes, and whether
  validation is non-destructive.

## Handoff

Report a concise summary, risk level, findings by severity with locations and
evidence, limitations, and a verdict. A clean review is a valid result:
`No actionable findings found in the reviewed scope.`

Send confirmed production findings to `hs-build`, missing behavioral evidence
to `hs-test`, and product or design disputes to the user or `hs-brainstorm`.
Do not edit code in this skill.

## References

- `references/checklist.md` - concrete high-signal categories.
- `../_shared/evidence-policy.md` - evidence for claims.
- `../_shared/domain-routing.md` - domain routing contract.
- `../hs-frontend-development/references/check.md` and `review.md` - frontend validation and critique.
- `../hs-backend-development/SKILL.md` - backend capabilities and scoped lenses.
- `../hs-devops/SKILL.md` - DevOps capabilities and mutation boundary.

## Boundaries

- Review critiques the exact change; it does not search for reasons to comment.
- Separate current defects, missing verification, and unproven concerns.
- List unresolved questions last when any remain.
