# High-Signal Review Checklist

Use the categories that match the changed path. Cite a precise location and
skip categories that do not apply.

## Trust boundaries and data

- SQL, shell, template, HTML, path, or serialization input is safely handled.
- Authentication and object/function/property authorization cover every
  sensitive path.
- Secrets, tokens, personal data, and internal errors stay out of logs and
  client responses.
- Destructive writes, migrations, and external calls have safe failure and
  rollback behavior.

## Correctness and concurrency

- State transitions update all related data on success and failure paths.
- Retry, duplicate delivery, idempotency, and stale writes behave as intended.
- Read-check-write sequences are atomic where concurrent calls can race.
- Queries and work queues are bounded and do not introduce N+1 behavior.
- Public contracts remain compatible or the breaking change is intentional.

## Tests and verification

- Changed tests assert behavior that would fail if the protected behavior
  regressed.
- Fixtures and dependencies reflect the risk under test.
- Negative paths and relevant boundaries are covered.
- A material behavior has a regression probe, or the gap is reported as
  `Verification Gap` rather than a production defect.
- Claims that require runtime or rendered evidence are backed by `hs-test` or
  marked `Needs verification`.

## Complexity and scope

- New abstractions, configuration, utilities, or public API surface solve a
  demonstrated current problem.
- The diff does not duplicate an existing repository mechanism or expand
  beyond the accepted scope.

## Do not flag

- Formatting or lint issues that deterministic tooling already owns.
- Alternate architecture or style preferences without concrete impact.
- Concerns already handled elsewhere in the current system.
- Speculation stated as a confirmed defect.
