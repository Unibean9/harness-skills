---
name: hs-backend-development
description: Provides backend domain guidance for API, data, authorization, reliability, and service-boundary decisions. Workflow skills use it when backend context, validation, or expert review is needed. Follow the repository's existing architecture and conventions before applying generic patterns. Not for running tests, Docker or CI/CD operations, cloud provisioning, or UI work.
license: MIT
keywords: [backend, api, data, auth, security, reliability, performance]
metadata:
  category: domain
  author: harness-skills
  version: "3.0.0"
---

# Backend Development Skill

Act as a project-aware backend decision and validation lens, not a backend
textbook. Read the repository first, preserve its architecture by default,
and surface only the invariants, risks, trade-offs, and evidence relevant to
the user's change.

Domain routing supplies expertise; workflow skills own sequencing and
confirmation. This skill never grants permission for migrations, destructive
data changes, backup or restore, deploys, production writes, or other
irreversible external actions.

## When to use

Use this skill when a workflow touches an endpoint or API contract, data or a
transaction boundary, authorization, a service boundary, a hot path, or an
external backend integration. Do not load the full backend reference set for a
small change that clearly follows existing conventions.

## Capabilities

Workflow skills call these capabilities through
`../_shared/domain-routing.md`; a capability can also be invoked directly,
such as `hs-backend-development validate`.

| Capability | Called by | Purpose | Read |
|---|---|---|---|
| `discover` | `hs-brainstorm` | Identify material backend decisions and invariants; compare only viable directions. | Repository first, then the relevant decision lens, architecture, API, or technology reference. |
| `prepare` | `hs-plan`, `hs-build` | Establish project conventions and constraints before planning or writing code. | Analogous code, tests, configuration, then only the relevant references. |
| `validate` | `hs-build`, `hs-code-review`, `hs-ship` | Report scoped correctness, security, compatibility, reliability, and evidence risks in the changed surface. | The references that match the diff. |
| `review` | `hs-code-review` | Critique material API, auth, schema, boundary, hot-path, or integration decisions. | Relevant decision lenses and contract/security references. |

### `discover`

Identify which backend choices actually affect the outcome. Consider:

- the invariant that must remain true;
- retry, duplicate delivery, race, and failure behavior;
- consistency and transaction boundaries;
- trust boundaries and authorization scope;
- contracts other components depend on;
- compatibility, resource, and operational constraints;
- whether a new layer, service, technology, cache, or queue is justified.

Do not design layers, REST shapes, queues, caches, or services automatically.
If one direction is already supported by repository evidence, record it
without manufacturing an alternatives exercise. If a material choice remains,
return it to `hs-brainstorm`.

### `prepare`

Read the repository before the references. Identify the analogous feature or
module, module boundaries, API and error conventions, auth model, persistence
and transaction patterns, migration strategy, integration conventions, tests,
and observability relevant to the requested change. Follow existing patterns
unless a demonstrated constraint requires a change.

### `validate`

Scope validation to the changed concern. Examples:

- query or data change: correctness, query shape, resource bounds,
  permission/data isolation, and verification evidence;
- auth change: identity and token validation, object/function authorization,
  negative paths, lifecycle, and sensitive logging;
- webhook or integration: trust boundary, signature, replay/idempotency,
  timeout, retry, resource bounds, and error handling;
- endpoint change: contract compatibility, validation, authorization,
  pagination, error behavior, and regression evidence.

Report findings without running the test suite; `hs-test` owns execution and
evidence collection.

### `review`

Use expert review when the change adds or materially reshapes an API contract,
auth or permission model, schema or transaction boundary, service/module
boundary, hot path, queue semantics, or external integration. Challenge
compatibility and risk; do not refactor toward a preferred architecture merely
because a reference describes it.

## References

Read only the reference that matches the task:

| Need | Read |
|---|---|
| Invariants, failure modes, consistency, and decision questions | `references/mindset.md` |
| Existing boundaries, service splits, and abstraction decisions | `references/architecture.md` |
| API compatibility, errors, pagination, retries, and resource bounds | `references/api-design.md` |
| Auth, authorization, sessions, tokens, and security boundaries | `references/authentication.md`, `references/security.md` |
| Transactions, idempotency, queries, caches, and resource behavior | `references/performance.md` |
| Verification evidence by risk | `references/testing.md` |
| Current-standard research and stack selection | `references/technologies.md` |
| Backend-specific bug hypotheses and safe logging | `references/debugging.md` |

Generic debugging belongs to the shared debugging workflow, and running tests
belongs to `hs-test`. Treat current framework, library, protocol, and provider
behavior as live facts: research authoritative current sources when a material
decision depends on them.

## Boundaries

- Preserve repository architecture and conventions unless evidence supports a
  change.
- Keep recommendations proportional to the changed surface.
- Do not turn domain expertise into a second planning or approval workflow.
- Report unresolved questions last when any remain.
