# Architecture Boundaries

Preserve the architecture already present in the repository. Before adding a
layer or splitting a service:

1. Find analogous behavior and identify its ownership boundary.
2. Put the new behavior where comparable behavior already lives.
3. Keep existing boundaries unless they cause a demonstrated responsibility,
   testability, consistency, ownership, scaling, or deployment problem.
4. Add an abstraction only when it resolves that concrete problem and has a
   clear owner and verification path.

Controller/service/repository, hexagonal, modular monolith, and other shapes
are options, not a universal starting point. A service split is an operational
and domain-boundary decision, not an architecture upgrade. It may be justified
by independent deployment or team ownership, materially different scaling or
reliability needs, a stable domain boundary, or clear data ownership.

When reviewing a boundary, check coupling, data ownership, failure behavior,
deployment and rollback impact, observability, and compatibility. Avoid adding
an interface, factory, queue, cache, or service with one caller merely to make
the design look more layered.
