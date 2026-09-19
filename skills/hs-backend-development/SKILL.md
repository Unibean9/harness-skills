---
name: hs-backend-development
description: Backend fundamentals map - REST API design, layered architecture and when to split into microservices, authentication and authorization (OAuth/JWT, sessions, RBAC, MFA), input validation and OWASP security, database performance and caching, code quality, debugging and logging, stack selection, and unit/integration test design. Use when designing an endpoint, structuring a backend into layers, adding auth, choosing a stack, or tracking down a slow query or a backend bug. Not for Docker, CI/CD, monitoring setup, or cloud provisioning (hs-devops), running the test suite (hs-test), or UI work (hs-frontend-development).
license: MIT
category: domain
keywords: [backend, rest-api, architecture, auth, security, performance, debugging]
metadata:
  author: harness-skills
  version: "2.2.0"
---

# Backend Development Skill

A high-level map of backend fundamentals, not a full reference. It's meant
to give enough of the big picture that you can look up specifics yourself
and make implementation decisions for your own project.

Everything here is language-agnostic. Examples are pseudocode (plus SQL and
JSON where the database or the wire format is the point), so apply each
idea with whatever language and framework the project already uses.

<HARD-GATE>
See `../_shared/hard-gate.md` for the shared gate shape (`{scope}` = "a plan exists or the user has explicitly requested implementation"). Additionally: look at relevant project context before non-trivial changes; do NOT run migrations, backup/restore, deploy, or external writes without clear user confirmation.
</HARD-GATE>

## When to Use

- Designing a REST API for a new feature
- Structuring a backend project into layers, or deciding whether to split
  a service
- Adding sign-in, sessions, tokens, or permission checks
- Validating input and hardening an endpoint
- Finding why a query or endpoint is slow, or why a backend bug happens
- Choosing a language, framework, or database for a new backend

## Capabilities

The workflow skills call these on their own (`../_shared/domain-routing.md`):
the user picks `hs-brainstorm`, `hs-plan`, `hs-build`, `hs-code-review`, or
`hs-ship`, and the workflow decides when backend applies. Each capability can
also be invoked directly, for example `hs-backend-development validate`.

| Capability | Called by | What it does here | Read |
|---|---|---|---|
| `discover` | `hs-brainstorm`, for a new endpoint, service, or stack choice | Frame the request as a system, weigh the trade-offs, and decide layering or splitting, the resource contract, and the stack before any code | `references/mindset.md`, `references/architecture.md`, `references/technologies.md`, `references/api-design.md` |
| `prepare` | `hs-plan` (context only), `hs-build` | Read the project's existing layers, stack, API conventions, error format, and auth approach, then load the guidance for the piece being built | The project's code first, then `references/architecture.md`, `references/api-design.md`, `references/authentication.md` as the task needs |
| `validate` | `hs-build`, `hs-code-review`, `hs-ship` | Read-only technical check of the changed files: input validation and access control, N+1 queries and missing indexes, negative-path tests, error handling, and what gets logged | `references/security.md`, `references/performance.md`, `references/testing.md`, `references/debugging.md` (what never to log) |
| `review` | `hs-code-review`, for a change that adds or reshapes an endpoint, auth or permission logic, a schema, or a hot path | Design critique: layering violations, API contract and backward compatibility, the auth model, trade-offs, maintainability | `references/architecture.md`, `references/api-design.md`, `references/authentication.md`, `references/security.md`, `references/code-quality.md`, `references/mindset.md` |
| on demand | none | Root-causing a bug or slow query, and refactoring | `references/debugging.md`, `references/code-quality.md` |

`validate` and `review` only read and report; running the test suite is
`hs-test`. Report severity as Critical, High, Medium, or Low, as the
`code-reviewer` subagent does: Critical (trust-boundary defects, data loss,
breaking changes) blocks `hs-ship`. The HARD-GATE above still holds under
routing: no capability runs migrations, backup or restore, deploys, or
external writes without the user's confirmation.

## References

Read only the file the task needs.

| Need | Read |
|---|---|
| Resource naming, methods, status codes, error format, pagination, filtering, versioning | `references/api-design.md` |
| Controller/service/repository layers, monolith vs microservices, microservices patterns, anti-patterns | `references/architecture.md` |
| OAuth 2.1 + PKCE, JWT, password storage, sessions, RBAC, MFA | `references/authentication.md` |
| OWASP Top 10, input validation, rate limiting, security headers, secrets, API security checklist | `references/security.md` |
| Indexes, N+1 queries, connection pools, caching and invalidation | `references/performance.md` |
| SOLID, clean code, refactoring techniques | `references/code-quality.md` |
| Debugging loop, structured logging, log levels, what never to log | `references/debugging.md` |
| Problem decomposition, failure thinking, consistency and other trade-offs | `references/mindset.md` |
| Choosing a language, framework, database, and queue | `references/technologies.md` |
| Test pyramid, unit tests with fakes, integration tests against a real DB | `references/testing.md` |

Containerizing the service, health checks, metrics and tracing, and
runtime secrets live in `hs-devops`
(`../hs-devops/references/containerization.md`,
`../hs-devops/references/observability-and-secrets.md`).

## Make it yours

This is a starting map, not a syllabus. Add your own reference files for
things you're actually using (a specific ORM, a specific auth provider, a
specific framework's conventions) instead of treating this list as
complete.
