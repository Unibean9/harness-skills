# Architecture: 3 Layers, and When to Split Further

## The 3 layers

```
Request
  |
  v
Controller  --  parses input, calls a service, shapes the response
  |
  v
Service     --  business logic, orchestrates repositories, enforces rules
  |
  v
Repository  --  talks to the database, knows nothing about HTTP
  |
  v
Database
```

- **Controller**: knows about HTTP (routes, status codes, request/response
  shape). Should not contain business rules.
- **Service**: the "what should happen" layer. Validates business rules,
  coordinates multiple repositories/services, has no HTTP knowledge.
- **Repository**: the "how do I fetch/store this" layer. Wraps SQL/ORM
  calls behind a small interface so the service layer doesn't care which
  database is underneath.

## One request, traced through the layers

A `POST /orders` request:

1. Controller receives the HTTP request, validates the shape of the body,
   calls `orderService.createOrder(userId, items)`.
2. Service checks business rules (items in stock? user allowed to order?),
   computes the total, calls `orderRepository.save(order)` and
   `inventoryRepository.decrement(items)`.
3. Repository runs the actual `INSERT`/`UPDATE` queries against the
   database.
4. Service returns the created order object back up.
5. Controller turns that into a `201 Created` JSON response.

Each layer only talks to the layer directly below it - the controller never
touches the database directly, and the repository never sees the HTTP
request.

## Layering rules

- **Dependencies point down only.** A service never imports a controller,
  and a repository never imports a service. If two services need each
  other, the shared logic belongs in a third, lower-level module.
- **Validate in two places, for two reasons.** The controller checks the
  *shape* of the input (types, required fields). The service checks the
  *business rules* (stock available, user allowed). A service called from a
  job or a queue consumer still gets its rules enforced.
- **Don't leak persistence upward.** Return plain objects or domain types
  from a repository, not ORM rows with lazy-loading attached, so a
  controller can't trigger queries by accident while serializing.
- **Transactions live in the service.** It's the layer that knows which
  writes must succeed or fail together (save the order *and* decrement the
  stock).
- **Organize by feature once the app grows.** `orders/{controller,service,repository}`
  scales better than one giant `controllers/` folder, and it's also where a
  future service boundary would be cut.

## Microservices: when to split, when not to

**Consider splitting into a separate service when:**

- A part of the system has a genuinely different scaling need (e.g. an
  image-processing job vs. the main API).
- Different teams need to deploy independently without blocking each other.
- A component has a stable, well-understood boundary (e.g. billing).

**Don't split when:**

- You're a single developer/small team and the whole app still fits in one
  mental model.
- The boundary between the "services" is still guesswork - you'll just be
  making cross-service calls for things that would otherwise be a single
  in-process function call.
- You're doing it because "microservices sound more professional." Splitting
  adds network calls, deployment complexity, and data-consistency problems
  you don't have yet in a monolith. Start with a well-organized monolith
  (like the 3 layers above); split later once a real boundary and a real
  scaling/team reason both exist.

## Choosing an architecture

| Pattern | When to use | Complexity | What you get |
|---|---|---|---|
| **Monolith** (layered, organized by feature) | Small team, MVP, unclear boundaries | Low | Simple development and deployment, ACID transactions, easy local testing |
| **Microservices** | Several teams, clear domain boundaries, parts that must scale independently | High | Independent deploys, fault isolation, per-service tech choice |
| **Serverless functions** | Spiky or event-triggered workloads | Low to start | Auto-scaling, pay per use; cold starts and vendor limits to live with |

Event-driven designs and CQRS are further options for async workflows and
very different read/write loads. They aren't covered here; look them up
once one of those needs is actually real.

## Microservices patterns

Once a split is justified, these are the patterns you'll meet first:

- **Database per service** - each service owns its data and no other
  service touches its tables. The price: no cross-service joins, some
  duplicated data, and no single transaction across services.
- **API gateway** - one entry point (e.g. Kong, NGINX) that routes requests
  to services and handles cross-cutting concerns once: authentication,
  rate limiting, request shaping.
- **Service discovery** - services register themselves with a health-check
  URL and find each other by name instead of a hard-coded address (Consul,
  or Kubernetes Services and DNS).
- **Circuit breaker** - stop calling a dependency that keeps failing, so
  one slow service doesn't tie up every caller. It has three states:
  *closed* (calls pass through), *open* (calls fail fast, often with a
  fallback), and *half-open* (a trial call checks for recovery). Always pair
  it with a timeout on the call itself.
- **Saga** - a multi-service "transaction" as a chain of local steps, each
  with a *compensating* step that undoes it on failure (e.g. refund the
  payment if stock can't be reserved). It comes in two forms:
  *choreography* (services react to each other's events) and
  *orchestration* (one coordinator tells each service what to do next,
  which is easier to follow).

## Anti-patterns to avoid

1. **Distributed monolith** - services that must be deployed together
   because they all call each other synchronously.
2. **Chatty services** - one user request fans out into dozens of
   inter-service calls, adding latency and failure points.
3. **Shared database** - several services reading and writing the same
   tables, so none of them can change its schema alone.
4. **Over-engineering** - microservices for an app one team can hold in
   its head.
5. **No timeouts or circuit breakers** - one hung dependency cascades into
   a full outage.

## Architecture checklist

- [ ] Layers depend downward only; controllers hold no business rules.
- [ ] Each module or service has a clear boundary named after a business
      capability.
- [ ] If split: database per service, with no shared tables.
- [ ] Every outbound call has a timeout, and the critical ones have a
      circuit breaker.
- [ ] Every service exposes a health check.
- [ ] Multi-service workflows define what happens when a step fails
      (compensation), not just the happy path.
- [ ] Requests can be traced across services (a correlation ID at minimum).

Further reading: https://microservices.io/patterns/ and
https://martinfowler.com/articles/microservices.html
