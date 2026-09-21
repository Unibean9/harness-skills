# Coverage and Test-Quality Checklist

Use this to decide whether evidence is sufficient, not to turn coverage into
a correctness score.

## Coverage

Coverage reveals executed lines and branches. It cannot show whether an
assertion was meaningful or whether the behavior is desired. Prefer changed
path and material-branch coverage over repository-wide percentage, and use
the project's configured threshold only when it represents an explicit policy.

Critical paths should have evidence for every material branch and invariant;
the percentage is not proof by itself. A test that executes code without
asserting the protected behavior does not establish verification.

## Trustworthy tests

- Name the behavior, not an arbitrary test number.
- Arrange, act, and assert observable behavior.
- Control time, randomness, and external state instead of sleeping.
- Isolate data so tests pass independently and in parallel when expected.
- Cover relevant empty, boundary, missing, duplicate, failure, and concurrency
  cases.
- Use a real dependency when its semantics are under test; use a focused fake
  when the dependency is not the subject.
- Keep mocks at meaningful boundaries and do not mock away the behavior being
  claimed.
- Treat a flaky test as ambiguous feedback: classify and track it rather than
  retrying it into a false pass.

## Verification review

- Each material changed behavior has executable evidence or an explicit reason
  a one-off probe is sufficient.
- Negative paths and boundaries match the risk.
- Tests trace their expectations to intent, policy, a public contract, or an
  implementation invariant.
- Changed tests would fail if the protected behavior regressed.
- No test was skipped, weakened, deleted, or snapshot-updated solely to make a
  command pass.
- Commands, result state, output, and evidence paths are recorded.
- Missing regression protection is reported as a verification gap, not as a
  production defect.
