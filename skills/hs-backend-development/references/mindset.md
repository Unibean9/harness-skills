# Backend Mindset: Problem-Solving and Trade-offs

Backend work is mostly choosing what can fail, how, and at what cost. This
file is about the thinking that comes before the code.

## See the request as a system

A single request usually crosses several components:

```
User -> load balancer -> API (auth, rate limit) -> business logic
     -> cache -> database -> queue / background jobs -> external services
```

For any change, ask:

- **What happens if this component is slow or down?** Timeout, retry,
  fallback, or fail loudly?
- **What does this do under ten times the load?** Where is the first
  bottleneck?
- **What does it depend on, and what depends on it?** That is the blast
  radius if it breaks.
- **What happens if the same request arrives twice?** Retries and
  double-clicks are normal, so decide on idempotency up front.

## Break a big problem down

1. **Requirement** - what problem, for whom, and how you'll know it works
   (see `hs-brainstorm`).
2. **Constraints** - performance, budget, deadline, the existing stack.
3. **Modules** - separate concerns (auth, data, business rules,
   integrations).
4. **Interfaces** - agree on the contracts between modules before building
   them.
5. **Critical path first** - build the part everything else depends on, or
   the part with the most unknowns.
6. **Iterate** - build, test, adjust.

"Build payment processing" sounds like one task. Decomposed, it's gateway
integration, order validation, payment intent creation, webhook handling,
**idempotency** (no double charges), retries for transient failures, an
audit log, refunds, and reconciliation. The unglamorous items are where
the real risk sits.

## Trade-offs worth knowing by name

### Consistency vs availability (CAP)

When the network between nodes of a distributed data store fails (a
partition), each request has to choose one of two things. It can refuse
or wait, which keeps the data **consistent**. Or it can answer with
possibly stale data, which keeps the system **available**. PACELC adds the
everyday case: even without a partition, stronger consistency costs
latency.

- Money, inventory counts, unique usernames: favor consistency.
- Feeds, catalogs, view counts: staleness for a few seconds is usually
  fine, so favor availability and speed.

With one relational database, you get consistency from transactions and
mostly don't need to think about this until you add replicas, caches, or
more services.

### Performance vs maintainability

| Favor | Where |
|---|---|
| Maintainability (plain ORM calls, obvious code) | CRUD, admin tools, anything not measured as slow |
| Performance (hand-tuned SQL, caching, denormalization) | Hot paths shown to be slow by measurement |
| Both, carefully | Payments, auth, core business rules |

Optimize only after measuring. Every optimization adds code someone has to
understand later (see `performance.md`).

### Technical debt

Debt is fine when it's **deliberate and recorded** ("ship now, clean up
after the demo", written in the plan or an issue). It's harmful when it's
reckless or invisible. Pay down first the debt that slows every change in
a part of the code you touch often. Debt in code nobody changes can wait.

## Before you commit to an approach

- [ ] You can state what fails, and how, when each dependency is down.
- [ ] Repeated requests are safe where they need to be.
- [ ] The consistency level matches what the data is (money vs. likes).
- [ ] You chose readability unless a measurement says otherwise.
- [ ] Any shortcut is written down as known debt.
