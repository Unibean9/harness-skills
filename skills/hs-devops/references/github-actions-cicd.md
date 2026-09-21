# GitHub Actions and CI/CD Decisions

Read existing workflows, reusable workflows, organization rulesets, required
workflows, environments, security features, package managers, and deployment
conventions before editing YAML. A simple build/test workflow should not
require a pipeline design interview or scanner shopping exercise.

## Least privilege and identity

Set the smallest useful workflow default and elevate permissions only on the
job that needs them. For example:

```yaml
permissions:
  contents: read

jobs:
  deploy:
    permissions:
      contents: read
      id-token: write
```

Grant `security-events` or other permissions only to the reporting job that
requires them. Prefer OIDC/workload identity and short-lived federation over
long-lived cloud credentials. Use environment protection and required reviews
where repository policy calls for them.

## Supply-chain controls

Inspect current native capabilities before adding third-party tools. Consider
only controls that fill a real gap:

- secret scanning and push protection;
- dependency review and dependency update automation;
- code, IaC, or container scanning where the relevant artifact exists;
- full-length SHA action pinning with an update/review policy;
- artifact attestations, SBOM, and provenance when releasing consumable
  artifacts or policy requires them.

An attestation or scanner result is evidence about provenance or a detected
condition, not proof that an artifact is secure. Do not hardcode a universal
High/Critical blocking threshold; follow repository or organization policy and
make a risk-based choice explicit when no policy exists.

## Stage controls by their inputs

Place each check at the earliest stage where it has the inputs it needs and
produces useful feedback. Dependency review can run before a build; SAST may
need build metadata; image scanning needs an image; attestation follows the
build. Do not force every security scan before build or test.

Use repository policy for required checks, merge gates, environment approvals,
and deployment permissions. Keep jobs understandable and avoid redundant work.
Choose timeouts, paths, concurrency, and caches from observed workload and
cost rather than universal constants. Bound runaway jobs and cache only safe,
stable inputs.

## Validation and mutation boundary

Validate YAML and action references with project tooling, inspect job-level
permissions, and test the workflow path with safe local or repository checks.
Workflow code is local implementation. Enabling a workflow, dispatching a
deployment, changing repository settings, publishing artifacts, or mutating
cloud state is an external operation with its own authorization.

For Azure deployment, use OIDC/federated identity, environment protection, and
the repository's current provider guidance. For any other cloud or platform,
follow its current official identity and deployment documentation.
