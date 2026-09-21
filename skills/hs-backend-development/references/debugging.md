# Backend Failure Hypotheses and Logging

Use the shared debugging workflow to reproduce, observe, hypothesize, test,
fix, and verify. Backend-specific hypotheses commonly involve:

- query shape, transaction boundaries, and connection exhaustion;
- cache staleness, invalidation, and stampedes;
- queue delivery, retry, duplicate, and idempotency behavior;
- authentication or object-level authorization;
- serialization, schema, and migration compatibility;
- concurrency, races, resource saturation, and external dependency failure.

Capture a reproduction and evidence that distinguishes the leading hypothesis
from its rivals. Preserve the original regression check after the fix.

Use the project's structured logger and correlation identifiers. Log the
context needed to diagnose an operation and security event, but keep
passwords, tokens, API keys, session identifiers, payment data, and sensitive
payloads out of logs and error responses.
