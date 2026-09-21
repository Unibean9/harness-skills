# Backend Verification

Choose the cheapest test that directly proves the changed risk. `hs-test`
owns running the suite and reporting evidence; this reference helps the
domain capability recommend useful evidence.

| Risk | Evidence |
|---|---|
| Business rule | Focused unit test at the rule boundary. |
| Database, query, transaction, or serialization behavior | Integration test with the relevant real dependency or engine. |
| HTTP contract, auth, error, or permission behavior | API integration or contract test, including negative paths. |
| Third-party integration | Contract or fake at the owned boundary plus targeted integration evidence. |
| Regression bug | A test at the lowest level that reliably reproduces the failure. |
| Critical end-to-end workflow | Broader workflow evidence when lower layers cannot provide enough confidence. |

Prefer the project's existing test conventions. Assert behavior and failure
semantics rather than merely executing lines. Isolate test data, never use a
shared or production database, and use the production database engine when a
database-specific behavior is material.

For backend changes, make success, validation failure, authorization failure,
duplicate or retry behavior, and compatibility evidence explicit when they
apply. Do not require every category for an unrelated change.
