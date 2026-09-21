# API Contract Decisions

Start with the repository's existing API conventions. Preserve its resource
naming, methods, status codes, error shape, pagination, filtering, and version
strategy unless the requested change requires a compatible extension.

For a material contract change, check:

- success and failure response behavior, including malformed and missing input;
- backward compatibility for existing clients;
- object, function, and property-level authorization;
- idempotency and safe retry behavior for mutations;
- pagination and resource bounds for lists and payloads;
- concurrency preconditions where stale writes can overwrite newer data;
- machine-readable errors that match the project convention;
- versioning only when the change is genuinely breaking.

Do not introduce a custom error envelope or a new version merely because it is
common elsewhere. For a greenfield HTTP API, current standards such as RFC
9457 may inform the choice, but current authoritative sources and project
constraints decide it.
