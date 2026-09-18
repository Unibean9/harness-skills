# Coverage and Test-Quality Checklist

Use this when you need to decide whether the tests you ran are *enough*,
not just whether they passed.

## Coverage

Coverage tells you which lines never ran under test. It can't tell you
whether the assertions were meaningful: a test with no `expect` still
counts as covering the lines it touched. Read it as a map of untested
code, not as a grade.

```bash
npx vitest run --coverage     # Vitest
npx jest --coverage           # Jest
pytest --cov=src              # pytest-cov
go test -cover ./...          # Go
```

- **Look at coverage of the diff, not only the total.** New code with no
  tests is the actionable signal. A dip in the overall percentage often
  isn't.
- **Critical paths deserve full branch coverage**: authentication and
  authorization, payments, and anything that writes or deletes user data.
- **No threshold is assumed.** If the project wants one, pick it
  deliberately and enforce it in CI (numbers like "80% overall, higher on
  new code" are a common starting point, not a rule). Never game a
  threshold with tests that execute code without asserting on it.

## What makes a test trustworthy

- **Arrange-Act-Assert**, with a name that states the behavior:
  `rejects a duplicate email`, not `test2`.
- **Deterministic**: no `sleep()`; wait for the actual condition. Control
  time and randomness (fake clocks, seeded data).
- **Independent**: each test sets up and cleans its own state, and passes
  in any order and in parallel.
- **Fast enough to run on every change**: slow tests stop getting run.
- **Edge cases included**: empty inputs, boundaries (0, 1, max), null or
  missing fields, unicode, duplicates, concurrent requests where they
  matter.
- **A flaky test is a bug.** Fix it or quarantine it with an issue.
  Retrying until it passes hides a real race as often as a test problem.

## Checklist before calling a change verified

- [ ] Every changed behavior has a test that would fail without the change.
- [ ] Failure and boundary cases are covered, not only the happy path.
- [ ] Integration tests cover the endpoints the change touches, against
      the real database engine.
- [ ] Critical paths in the diff are fully covered.
- [ ] No test was skipped, loosened, or deleted to make the suite pass.
- [ ] The suite is green, and the command plus its output are recorded as
      evidence.
- [ ] Tests run in CI on every pull request (setting that up belongs to
      `hs-devops`).
