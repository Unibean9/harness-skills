# Azure and Terraform Decisions

Use this reference for Azure or Terraform work after reading the repository's
modules, provider constraints, variables, state configuration, environment
conventions, and deployment workflow.

## Decision order

1. Reuse a suitable repository or organization module and follow its naming,
   tagging, identity, networking, state, and environment policy.
2. If no suitable module exists, consider a current Azure Verified Module
   before hand-rolling a generic abstraction.
3. Use direct provider resources when they are clearer or better fit the
   repository, and record the reason for a material choice.
4. Check current HashiCorp and Microsoft documentation for provider/resource
   capability, regional availability, quota, SKU, subnet, private endpoint,
   import, and pricing questions.

Do not treat example Cloud Adoption Framework names or tags as universal
organization policy. Follow existing policy; when none exists, choose names
and tags that make ownership, environment, workload, cost attribution, and
governance clear within current resource limits.

## Network and environment reasoning

Choose public endpoints, private endpoints, VNet integration, subnets, and
DNS from the workload threat model, data sensitivity, connectivity needs,
landing-zone policy, service capabilities, cost, and operability. A production
label alone does not prove that a VNet or private endpoint is required.

Check current service documentation for SKU features, subnet delegation,
regional support, quotas, provider behavior, and resource naming limits. Avoid
static subnet sizes, SKU assumptions, and hardcoded numeric defaults in generic
guidance.

## Terraform safety

Use the repository's Terraform and provider versions. Validate and inspect:

```text
format -> initialize with the repository's policy -> validate -> plan -> review
```

Treat a plan as time-bound feedback. Drift, changed variables, provider/API
behavior, credentials, and state can make it stale. Before a high-impact apply,
confirm the target account/subscription/workspace, inspect create/change/
replace/destroy operations, understand recovery, and recompute close to the
operation. Prefer applying the reviewed saved plan where supported.

Do not add `-auto-approve` to a production mutation without explicit project
policy and user authorization. `apply`, `destroy`, state mutation, and cloud
resource changes are external operations; local Terraform code and validation
are not.

## Review questions

- Is state stored and locked according to repository policy?
- Does the change preserve backward compatibility and safe replacement order?
- Are identity, network, secret, and data boundaries explicit?
- Is rollback or recovery possible, especially for schema or state changes?
- Are cost, quota, capacity, and deletion risks visible?
- Are organization policy and current official documentation the sources for
  volatile decisions?
