---
name: hs-backend-development
description: Backend fundamentals map - REST API design, layered architecture and when to split into microservices, authentication and authorization (OAuth/JWT, sessions, RBAC, MFA), input validation and OWASP security, database performance and caching, code quality, debugging and logging, stack selection, and unit/integration test design. Use when designing an endpoint, structuring a backend into layers, adding auth, choosing a stack, or tracking down a slow query or a backend bug. Not for Docker, CI/CD, monitoring setup, or cloud provisioning (hs-devops), running the test suite (hs-test), or UI work (hs-frontend-development).
license: MIT
category: domain
keywords: [backend, rest-api, architecture, auth, security, performance, debugging]
metadata:
  author: harness-skills
  version: "2.1.0"
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
