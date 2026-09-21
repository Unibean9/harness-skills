# Domain Routing

How a workflow skill decides when to use a domain skill, so the user picks
the workflow and never has to say which domain it involves.

**Workflow owns sequencing. Domain skills own expertise. Routing is just
applicability.** `hs-brainstorm`, `hs-plan`, `hs-build`, `hs-code-review`,
and `hs-ship` decide the order of work and where the gates are. A domain skill
(`hs-frontend-development`, `hs-backend-development`, `hs-devops`, ...) answers one
question: when a workflow needs this domain, what should be done?

Routing is prose the agent follows, not code. Everything here is a default the
user can override.

## The capability contract

A domain skill takes part in routing by having a `## Capabilities` section
that maps some or all of these capabilities to its own references. A domain
without that section is skipped by routing and consulted directly instead.

| Capability | Question it answers | Writes anything? |
|---|---|---|
| `discover` | What are we making, for whom, and in what direction? | Only the confirmed decision (for frontend, the design brief) |
| `prepare` | What context and conventions must exist before we plan or write code? | Project context files, only after the user confirms |
| `validate` | Does the change meet the domain's technical bar? | No; it reports |
| `review` | Does the change hold up under expert critique? | No; it reports |

Not every domain needs all four, and not every workflow calls all of them.

## Which workflow calls what

| Workflow | Calls | When |
|---|---|---|
| `hs-brainstorm` | `discover` | The work is new for the domain (a new surface or feature, not a tweak) |
| `hs-plan` | `prepare` (context only) | Before drafting, so the plan rests on the domain's real context |
| `hs-build` | `prepare`, then `validate`, then the domain's finish guidance | Around the task loop, for each task that touches the domain |
| `hs-code-review` | `validate`, and `review` when the risk calls for it | On the changed files |
| `hs-ship` | `validate` | Before push, if it has not already passed on this exact diff |

`hs-test` is not a caller. It supplies evidence to `validate` and `review`,
for example browser screenshots for a UI change.

## Detecting the domain

Use the first signal that settles it:

1. **Explicit**: `--domain <name>` in the arguments. It forces the domain and
   turns off detection.
2. **Files**: what the change or the plan touches (`git diff --name-only`,
   the plan's file list, the PR's files).
3. **Task wording**: what the request or issue is about.
4. **Project context**: files a domain leaves behind (for frontend,
   PRODUCT.md and DESIGN.md).

| Domain | File signals | Wording signals |
|---|---|---|
| frontend | `*.tsx` `*.jsx` `*.vue` `*.svelte` `*.astro` `*.html` `*.css` `*.scss`, theme or token files, `components/`, `pages/`, `routes/` views | page, screen, component, form, dashboard, layout, style, responsive, UI, UX |
| backend | routes, controllers, services, repositories, migrations, `*.sql`, API schemas | endpoint, API, auth, database, query, schema, service |
| devops | Terraform/Bicep, `.github/workflows/`, Dockerfiles, Compose, Kubernetes/Helm manifests, deployment or observability configuration | infrastructure, Terraform, cloud, pipeline, GitHub Actions, Docker, container, deploy, health check, metrics, tracing, secrets |

A change can touch more than one domain; route each. When a signal is
ambiguous, say what you inferred and take the cheaper path. Ask once only
when a wrong guess would cost real effort, such as starting a long interview.

**Say it out loud.** When routing fires, the workflow states it in one line
before using the domain, for example: `Routing: frontend (changed
src/pages/Orders.tsx, orders.css) -> prepare`. The user should always be able
to see why a domain flow ran.

## Risk-based defaults

Routing scales the domain's work to the change. It never skips a gate.

- `prepare`: run the domain's full context step (for frontend, the setup
  interview) only when required context is missing and the work creates a new
  surface. For a small change with no project context, use the conventions
  already in the code, and mention once that the domain's setup would help. Do
  not interview for a one-line fix.
- `validate`: run on every change that touches the domain, scoped to the
  changed files. `--deep` widens it to the surrounding surface.
- `review`: run when the change adds or reshapes the domain's main surface.
  For frontend that is something a user sees (a new page, component, flow, or
  navigation); for backend it is an endpoint, auth or permission logic, a
  schema, or a hot path. Skip it for copy, style, or other low-risk changes.
  `--deep` forces it.
- A domain's own stops stay: the confirmation on a design brief, the approval
  before writing project context, the user's OK before anything is pushed. A
  workflow's own gates stay too (see `hard-gate.md`).

## Overrides

Flags are for overriding, not for describing the flow. They are read from the
arguments the same way `--gh` is.

| Flag | Effect |
|---|---|
| `--domain <name>` | Force this domain and skip detection |
| `--skip-check` | Skip `validate`; say so in the output |
| `--deep` | Widen `validate` and force `review` |

The happy path takes no flags: `hs-brainstorm`, `hs-plan`, `hs-build`,
`hs-code-review`, `hs-ship`. `--gh` on `hs-plan` is unrelated; it chooses
where the plan lives, not which domain applies.

A domain skill can also be invoked directly (`hs-frontend-development
check`, for example) when the user wants one capability on its own.

## Adding a domain

1. Give the domain skill a `## Capabilities` table mapping capabilities to its
   references, plus the direct invocation for each.
2. Add its file and wording signals to the detection table above.
3. The workflow skills route on their own. Add a short bullet for the domain
   in `hs-build` or `hs-code-review` only where it needs specifics, as
   frontend and backend have.
