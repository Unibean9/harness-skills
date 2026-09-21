---
name: hs-devops
description: Provides project-aware platform and release-engineering guidance for infrastructure, CI/CD, containers, observability, secrets, and deployment safety. Use when a change touches Terraform or cloud resources, pipeline workflows, Docker or Kubernetes configuration, health signals, identity, or runtime operations. It treats local configuration as code and reserves explicit authorization for external mutations. Not for ordinary PR publication or merge waiting (hs-ship).
license: MIT
keywords: [devops, terraform, azure, github-actions, ci-cd, docker, observability]
metadata:
  category: domain
  author: harness-skills
  version: "2.0.0"
---

# DevOps Skill

Act as a project-aware platform and release-engineering lens, not a vendor
tutorial or second workflow engine. Read the repository's current IaC,
pipeline, container, deployment, identity, and observability conventions first;
then apply only the relevant reliability, security, cost, and rollback lenses.

Terraform, Bicep, workflow YAML, Dockerfiles, Compose, Kubernetes manifests,
Helm values, deployment manifests, and observability configuration are local
code. They can be inspected, edited, tested, reviewed, and shipped through the
normal `brainstorm -> plan -> build -> test/review -> ship` workflow.

Actual changes to shared or external state remain a separate authorization
boundary: apply, destroy, production deploy, registry push, cloud mutation,
secret or permission mutation, and similar actions require a clear target,
impact, recovery path, and explicit authorization unless the current request
already clearly authorizes that exact operation.

## Capabilities

Workflows call these through `../_shared/domain-routing.md`; they can also be
invoked directly.

| Capability | Role | Typical evidence |
|---|---|---|
| `discover` | Surface material platform, reliability, security, cost, and deployment decisions. | Current project context, risk and blast-radius analysis. |
| `prepare` | Read existing IaC, provider/module versions, workflows, container and runtime conventions before planning or editing. | Repository paths, policy, target environment, identity, and operational constraints. |
| `validate` | Run or read non-destructive deterministic checks and current plans/diffs where context permits. | Format/validate output, policy checks, workflow syntax, image/manifest checks, plan freshness. |
| `review` | Critique blast radius, rollback, supply chain, least privilege, cost, reliability, drift, and operational failure modes. | Evidence-backed findings and unresolved risks. |

### Proportional behavior

For a clear request that follows repository conventions, inspect, change local
configuration, and validate without a generic interview or architecture lock.
Ask only when an unresolved decision cannot be inferred and would materially
change security, cost, availability, connectivity, identity, or rollback.

Use current official provider and platform documentation for time-sensitive
features, limits, pricing, regional availability, provider capabilities, and
security behavior. Do not freeze those facts into generic skill guidance.

## Infrastructure truth model

For infrastructure:

- IaC code is desired managed configuration.
- Terraform state is the recorded mapping and state representation.
- Cloud or cluster state is external reality.
- A Terraform plan or policy result is time-bound feedback between them.

Plans become stale through drift, another apply, changed variables, provider
behavior, credentials, or state. For high-impact execution, recompute and
review the final plan close to apply time and prefer applying the reviewed
saved plan when the repository workflow supports it.

## Risk lenses

Apply only the relevant concerns:

- environment, target, blast radius, and ownership;
- least privilege, identity federation, secret exposure, and trust boundary;
- availability, dependency failure, health signals, and observability;
- rollback, backward-compatible rollout, schema/data migration, canary or
  progressive exposure;
- cost, quotas, capacity, redundant work, and job duration;
- supply chain, action pinning, dependency review, provenance, and artifact
  integrity;
- drift, plan freshness, replacement or destroy operations, and recovery.

Treat Terraform plans, scanners, policy engines, health checks, and CI results
as feedback. A green tool is evidence for a claim, not proof that the system
is secure or correct.

## References

- `references/azure-terraform-iac.md` - repository-first Azure/Terraform decisions.
- `references/github-actions-cicd.md` - workflow security, identity, and supply chain.
- `references/containerization.md` - container build/runtime guidance.
- `references/observability-and-secrets.md` - health, signals, identity, and secrets.
- `references/release-safety.md` - rollout, rollback, and mutation impact.
- `../_shared/domain-routing.md` - workflow capability routing.

## Boundaries

- Reuse repository or organization modules and policies before generic patterns.
- Consider current Azure Verified Modules when no suitable repository module
  exists, without rewriting an existing platform solely to adopt them.
- Use deterministic validation for deterministic facts and judgment for trade-offs.
- List unresolved questions last when any remain.
