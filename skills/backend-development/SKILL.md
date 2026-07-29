---
name: hs:backend-development
description: Understand the basics of RESTful API design, 3-layer architecture, and microservices. Use when designing an API, structuring a backend project, or deciding whether to split into microservices.
license: MIT
metadata:
  author: harness-skills
  version: "1.0.0"
---

# Backend Development Skill

A high-level map of backend fundamentals, not a full reference. It's meant
to give enough of the big picture that you can look up specifics yourself
and make implementation decisions for your own project.

<HARD-GATE>
See `../_shared/hard-gate.md` for the shared gate shape (`{scope}` = "a plan exists or the user has explicitly requested implementation"). Additionally: look at relevant project context before non-trivial changes; do NOT run migrations, backup/restore, deploy, or external writes without clear user confirmation.
</HARD-GATE>

## When to Use

- Designing a REST API for a new feature
- Structuring a backend project into layers
- Deciding whether a piece should become its own service
- Reviewing basic security and testing coverage before shipping

## Technology Starting Points (examples, not an exhaustive list)

| Need                        | One example      | Another example |
| --------------------------- | ---------------- | --------------- |
| Fast full-stack development | Node.js + NestJS | -               |
| Data/ML-heavy backend       | Python + FastAPI | -               |

These are just two starting points to anchor the discussion - pick whatever
stack fits what you're actually learning or building.

## Reference Navigation

- `references/api-design.md` - REST basics: methods, status codes, one example endpoint
- `references/architecture.md` - 3-layer architecture (Controller/Service/Repository) and when (not) to split into microservices
- `references/security.md` - OWASP Top 10, one line per item
- `references/testing.md` - the 70-20-10 testing pyramid

## Make it yours

This is a starting map, not a syllabus. Add your own reference files for
things you're actually using (a specific ORM, a specific auth flow, a
specific deployment target) instead of treating this list as complete.
