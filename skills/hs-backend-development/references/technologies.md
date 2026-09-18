# Choosing a Backend Stack

The strongest signal is usually **what you or your team already know
well**. A familiar stack shipped beats an optimal one half-learned. Use the
criteria below when you're genuinely starting fresh or learning on
purpose. They describe what to look for, not which language to pick.

## Selection flowchart

```
Language / framework
  Already have a stack the team knows?        -> use it
  Backend is mostly data / ML work?           -> the ecosystem where those libraries live
  Mostly real-time (chat, live updates)?      -> a runtime with first-class async I/O and WebSocket support
  Very high concurrency, small services?      -> a compiled language with lightweight concurrency
  Hard latency or memory limits?              -> a systems language, accepting a steeper learning curve
  None of the above                           -> a mainstream ecosystem with a mature web framework

Database
  Default                                     -> a relational database
  Data truly document-shaped, few relations   -> a document store
  (Relational data forced into a document store is the classic regret.)

Cache
  Only once a measured hot path needs it      -> an in-memory key-value store (see performance.md)

Message queue / events
  Background jobs, task queues                -> a job queue or a managed queue service
  Event streaming, replay, very high volume   -> an event log / streaming platform
```

## Judging a framework

Frameworks sit on a spectrum. Knowing where one sits tells you what you'll
build yourself.

| Style | What you get | What it costs | Good for |
|---|---|---|---|
| Minimal (routing + middleware) | Full control, little to learn up front | You choose and wire validation, DI, structure yourself | Learning, small APIs |
| Opinionated (modules, DI, conventions) | Structure that maps onto controller/service/repository | A steeper start; you work its way | Larger apps and teams |
| Batteries-included (ORM, admin, auth built in) | Common features ready on day one | Harder to swap the built-in parts | Full web apps with standard needs |

Whatever you pick, check that it has:

- An active maintainer and recent releases.
- Documentation good enough that you rarely need to read its source.
- A standard answer for validation, auth, database access, and testing.
- An in-process HTTP test client, so integration tests stay cheap.

## Common pitfalls

1. **A document store for relational data** - joins come back as
   application code and consistency bugs.
2. **Picking a stack for the résumé** - the learning cost lands on the
   project's timeline.
3. **Microservices from day one** - start with a layered monolith (see
   `architecture.md`).
4. **Adding a cache, a queue, and friends before they're needed** - every
   extra moving part needs running, monitoring, and securing.
