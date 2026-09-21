# Backend Technology Decisions

Prefer the stack and conventions the team and repository already use unless a
real constraint requires change. For a greenfield or material technology
decision, research current official sources and evaluate:

- team familiarity and hiring or operating cost;
- maintenance, release health, security support, and ecosystem maturity;
- fit with deployment, observability, testing, and data requirements;
- performance and resource constraints supported by the workload;
- interoperability, exit cost, and migration path;
- documentation quality and the team's ability to diagnose failures.

Choose a relational database when relationships and transactional consistency
are central. Choose a document store only when the data and access patterns
are genuinely document-shaped. Add a cache, queue, event log, or service split
when measured workload or a stable ownership and reliability boundary justifies
the operational cost.

Do not freeze library versions, protocol drafts, provider behavior, or static
tuning constants into generic guidance. Verify current capabilities when they
affect the decision.
