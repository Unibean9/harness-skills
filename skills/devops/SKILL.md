---
name: hs:devops
description: DevOps domain skill covering infrastructure as code / cloud provisioning (Terraform on Azure) and CI/CD pipeline design (GitHub Actions with shift-left security), pointing to focused references for each. Use when provisioning cloud infrastructure, designing a deployment/CI pipeline, or adding security scanning to a pipeline, even if the user only says "set up infra", "write terraform for X", "add a github actions workflow", or "deploy this" without naming DevOps explicitly.
license: MIT
metadata:
  author: harness-skills
  version: "1.2.0"
---

# DevOps Skill

A high-level map of DevOps domains, not a full reference. Each fully-fleshed
domain below is an interactive, gated workflow rather than a code
generator — infra and pipeline changes are expensive to reverse, so the
value is in the front-loaded decision interview and confirmation checkpoint.

<HARD-GATE>
See `../_shared/hard-gate.md` for the shared gate shape (`{scope}` = the
domain's own confirmation checkpoint has been explicitly approved by the
user). Additionally: never run destructive infra operations (`terraform
apply`, `terraform destroy`, cluster deletes, production deploys) without
explicit user confirmation — see the relevant reference file for
domain-specific gate mechanics.
</HARD-GATE>

## When to Use

- Provisioning cloud infrastructure with IaC (e.g. Terraform on Azure)
- Designing or reviewing a CI/CD pipeline (e.g. GitHub Actions)
- Adding shift-left security scanning (secret/SAST/SCA/IaC/container) to a pipeline
- Choosing an auth strategy (OIDC vs long-lived secrets) for cloud deploys
- Containerizing a service or setting up monitoring (no dedicated reference yet — see "Make it yours")

## Domain Starting Points (examples, not an exhaustive list)

| Domain | One example | Another example |
| --- | --- | --- |
| IaC / cloud provisioning | Terraform on Azure (CAF-compliant) | - |
| CI/CD | GitHub Actions (shift-left DevSecOps) | Azure Pipelines |
| Containers & orchestration | Docker + Kubernetes | Azure Container Apps |
| Observability | Azure Monitor / Log Analytics | Prometheus + Grafana |

These are starting points to anchor the discussion, not a ranking — pick
whatever fits the platform the user is already on.

## Reference Navigation

- `references/azure-terraform-iac.md` - interactive 6-phase Azure Terraform
  architect workflow: env selection (DEV/STAGING/PROD), service selection,
  FinOps guardrails, CAF naming/tagging/security standards, code generation,
  and a plan-style validation report.
- `references/github-actions-cicd.md` - interactive 6-phase shift-left
  GitHub Actions workflow: scope/target selection, security tool stack,
  OIDC auth strategy, a pipeline lock confirmation checkpoint, YAML
  generation with least-privilege permissions and SHA-pinned actions, and a
  security/FinOps posture report.

## Make it yours

This is a starting map, not a syllabus. Add your own reference files for the
DevOps domains you're actually using — a CI/CD pipeline convention, a
Kubernetes deployment pattern, a specific monitoring stack — instead of
treating this list as complete.
