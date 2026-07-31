---
name: hs:devops
description: High-level map of DevOps domains — infrastructure as code / cloud provisioning, CI/CD pipelines, containers & orchestration, observability — pointing to focused references for each. Use when provisioning cloud infrastructure (e.g. writing Terraform for Azure), designing a deployment/CI pipeline, containerizing a service, or setting up monitoring, even if the user only says "set up infra", "write terraform for X", or "deploy this" without naming DevOps explicitly.
license: MIT
metadata:
  author: harness-skills
  version: "1.0.0"
---

# DevOps Skill

A high-level map of DevOps domains, not a full reference. It's meant to
route you to the right focused workflow instead of trying to cover every
domain in one file — DevOps spans infrastructure as code, CI/CD,
containers/orchestration, and observability, and each deserves its own
depth.

<HARD-GATE>
See `../_shared/hard-gate.md` for the shared gate shape (`{scope}` = "a plan
exists or the user has explicitly requested implementation"). Additionally:
never run destructive infra operations (`terraform apply`, `terraform
destroy`, cluster deletes, production deploys) without explicit user
confirmation — see the relevant reference file for domain-specific gates
(e.g. the Terraform architect workflow's own confirmation checkpoint).
</HARD-GATE>

## When to Use

- Provisioning cloud infrastructure with IaC (e.g. Terraform on Azure)
- Designing or reviewing a CI/CD pipeline
- Containerizing a service or choosing a container orchestration target
- Setting up monitoring, logging, or alerting for a service

## Domain Starting Points (examples, not an exhaustive list)

| Domain | One example | Another example |
| --- | --- | --- |
| IaC / cloud provisioning | Terraform on Azure (CAF-compliant) | - |
| CI/CD | GitHub Actions | Azure Pipelines |
| Containers & orchestration | Docker + Kubernetes | Azure Container Apps |
| Observability | Azure Monitor / Log Analytics | Prometheus + Grafana |

These are starting points to anchor the discussion, not a ranking — pick
whatever fits the platform the user is already on.

## Reference Navigation

- `references/azure-terraform-iac.md` - interactive 6-phase Azure Terraform
  architect workflow: env selection (DEV/STAGING/PROD), service selection,
  FinOps guardrails, CAF naming/tagging/security standards, code generation,
  and a plan-style validation report. This is the only fully-fleshed-out
  domain today.

## Make it yours

This is a starting map, not a syllabus. Add your own reference files for the
DevOps domains you're actually using — a CI/CD pipeline convention, a
Kubernetes deployment pattern, a specific monitoring stack — instead of
treating this list as complete.
