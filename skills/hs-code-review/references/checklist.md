# Starter Checklist

A concrete starting point for the "clear quality or security problems?"
question in `SKILL.md` - categories that are easy to miss when reading code
top-to-bottom instead of hunting for them. Cite `file:line` for anything you
flag; skip anything that's fine.

## Injection & data safety

- String interpolation in SQL/database queries (even with type casting -
  use parameterized queries).
- Unsanitized user input written to a database or rendered in HTML.
- Raw HTML output from user-controlled data (`innerHTML`,
  `dangerouslySetInnerHTML`, `html_safe`, `raw()`, `| safe`).
- Command injection via string concatenation in shell commands (use
  argument arrays).
- Path traversal via user input in file operations.

## Race conditions & concurrency

- Read-check-write without an atomic operation (check-then-set should be
  one atomic `WHERE` + `UPDATE`).
- Find-or-create without a unique database constraint (concurrent calls
  create duplicates).
- Shared mutable state accessed without synchronization.

## Auth & access control

- Missing authentication check on a new endpoint/route.
- Missing authorization check (authenticated but not authorized) -
  privilege escalation or IDOR (one user reaching another user's data).
- Secrets in logs, error responses, or client-side code.
- Token/JWT comparison using `==` instead of constant-time comparison.

## Correctness gaps easy to miss

- A branch handles one condition but forgets the side effect on another
  (e.g. sets status but not the associated data).
- Missing negative-path tests (error cases, validation failures).
- N+1 queries or unbounded queries with no `LIMIT`/pagination on a list
  endpoint.

## Don't flag

- Style/formatting - that's a linter's job, not a review finding.
- "Consider X instead of Y" when Y already works fine.
- Anything the diff already addresses - read the full diff before
  commenting.
