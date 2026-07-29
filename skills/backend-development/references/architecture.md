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
  making cross-service calls for things that used to be a function call.
- You're doing it because "microservices sound more professional." Splitting
  adds network calls, deployment complexity, and data-consistency problems
  you don't have yet in a monolith. Start with a well-organized monolith
  (like the 3 layers above); split later once a real boundary and a real
  scaling/team reason both exist.
