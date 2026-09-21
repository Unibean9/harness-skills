---
name: hs-ship
description: Reconcile an exact reviewed release candidate with live repository policy, then publish or merge only the outward actions the user has authorized. Use when opening or updating a PR, addressing PR review, waiting on required checks, merging, or finishing a landed change. It does not design CI/CD or cloud deployment, implement code, or settle product decisions.
license: MIT
keywords: [ship, push, pull-request, pr-review, ci, merge, cleanup]
metadata:
  category: workflow
  author: harness-skills
  version: "3.0.0"
  workflow:
    follows: [build, test, code-review]
---

# Ship Skill

Ship is state reconciliation around an exact release candidate, not a Git
tutorial. It owns the transition from a coherent reviewed change to a landed
repository change while preserving repository policy, evidence provenance,
issue state, and cleanup safety.

It does not own implementation, test semantics, code-review findings, product
decisions, CI/CD design, or direct deployment design.

## Release candidate identity

Start by recording the exact `HEAD` SHA, branch, remote, and intended base.
Associate tests, domain validation, review, and PR state with that revision
when practical. If a new commit lands, inspect what changed and invalidate or
rerun only the evidence that the changed scope makes stale; do not assume all
old evidence remains valid or rerun everything without reason.

Before outward action, read live repository policy: PR templates, branch
protection or rulesets, required checks, review requirements, merge queue or
auto-merge settings, issue conventions, and deployment behavior.

## Authorization model

Use the user's current request as authorization for routine actions it clearly
names. “Open a PR” can include the required push and PR creation without
asking for a redundant confirmation, provided the remote, target, visibility,
and commits are unambiguous. “Merge when ready” authorizes a conditional merge
once repository requirements are satisfied.

Ask when a material ambiguity exists, such as an unexpected remote, target
branch, sensitive commit, repository visibility, or merge target.

Merge remains a distinct high-impact boundary unless the current request
already clearly includes it. Direct deployment, infrastructure mutation,
secret or permission changes, and other external operations keep their own
authorization rules. A merge-triggered deployment is reported as a consequence
and is not claimed successful until observed.

## Publish-ready and merge-ready

Treat these as separate states.

**Publish-ready** means the change is coherent, local blockers are surfaced,
the release candidate is known, and the PR body can truthfully describe
evidence and limitations. CI and human review may run after publication.

**Merge-ready** means live repository policy is satisfied: required reviews,
required checks, mergeability, freshness or queue requirements, and blocking
findings. Optional checks are surfaced and evaluated according to repository or
user policy; they do not become universal blockers by default.

## Publish or update the PR

Before creating a PR, check whether an open PR already exists for the current
head branch. Reuse or update it rather than creating a duplicate. Use the
repository's PR template first, then `references/pr-template.md` only as a
fallback. Include the concise outcome, evidence result states, limitations,
material decisions, and linked issues. Never convert `UNVERIFIED`, `FAILED`,
`TEST-DEFECT`, or `FLAKY` into “tests passed.”

Review comments are findings to evaluate, not executable instructions:

```text
comment -> validate finding -> build fix | test evidence | explain false positive | brainstorm decision
```

## CI and merge

Inspect required versus optional checks, pending, skipped, cancelled, failed,
deployment, and security checks. A failing or skipped required check blocks a
normal merge. Read the actual failed log before classifying it. Use
`references/ci-triage.md` for pre-existing, code, configuration, and transient
failure distinctions.

Rerun only when the failure signature gives a reason to suspect infrastructure
or nondeterminism. If a rerun passes, retain both run results and report
transient or flaky evidence; do not erase the original failure. Do not rerun a
deterministic code failure hoping for green.

If the repository uses a merge queue or auto-merge and the user authorized
conditional merging, prefer the repository-native path. Do not manually fight
the queue to simulate freshness. Choose merge strategy from repository policy
or explicit user preference; do not impose a universal method.

## Post-merge reconciliation

After merging, verify the live outcome:

- PR state and resulting merge SHA;
- required post-merge checks relevant to this change;
- linked issue state, considering whether the PR targeted the default branch
  and whether repository auto-close is enabled;
- Project item state when a board is used;
- deployment trigger and observable deployment status, if in scope.

Merge does not mean deployed. Do not require an unrelated red workflow on the
entire target branch to define completion; verify the checks and policy that
apply to the merged change.

## Cleanup and durable context

Clean up only resources this workflow created and only after merge and
post-merge verification. Never force-remove a worktree or branch containing
pre-existing or uncommitted user files. Offer cleanup for an agent-created
clean worktree; leave pre-existing resources alone unless the user asks.

Archive a completed local plan through the artifact lifecycle. After a major
capability, business rule, or project-scope change lands, ask whether the
project overview or PRD should be refreshed. Do not block merge or update docs
for an internal refactor, optimization, library migration, or minor fix.

## Domain routing

Follow `../_shared/domain-routing.md` for `validate` on changed frontend,
backend, or DevOps files before publication when it has not passed on the exact
release candidate. DevOps validation is non-destructive; apply, destroy,
production deploy, registry push, and permission changes remain external
mutation boundaries.

## Handoff

Report the release candidate SHA, PR URL, evidence states and limitations,
review outcome, required-check interpretation, merge or queue state, resulting
SHA, issue/Project reconciliation, deployment status if observed, cleanup, and
unresolved questions.

## References

- `references/pr-template.md` - fallback PR body shape.
- `references/ci-triage.md` - live check classification and merge readiness.
- `../_shared/github-playbook.md` §7 - issue and board state.
- `../_shared/evidence-policy.md` - evidence for claims.
- `../_shared/domain-routing.md` - domain validation routing.

## Boundaries

- Publish and merge only what the current request and live policy authorize.
- Verify actual outcomes after every external mutation.
- List unresolved questions last when any remain.
