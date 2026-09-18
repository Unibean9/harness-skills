# Testing: the 70-20-10 Pyramid

A rough guide for how much of each test type to write:

- **70% unit tests** - test one function/class in isolation, fast, no network/DB.
- **20% integration tests** - test a few real components together (e.g. service + real DB).
- **10% end-to-end (E2E) tests** - test a full user flow through the real system.

More unit tests because they're cheap and pinpoint failures precisely; fewer
E2E tests because they're slow and brittle, but they catch issues unit tests
can't (wiring between real components).

## Minimal pseudocode example

```
test "createOrder rejects an out-of-stock item":
    inventory = fakeInventoryWith({ sku: "abc", stock: 0 })
    service = OrderService(inventory)

    result = service.createOrder(userId, [{ sku: "abc", qty: 1 }])

    assert result.error == "OUT_OF_STOCK"
```

This is a unit test: the service is exercised directly, with a fake
inventory instead of a real database, so it runs fast and only tests one
rule at a time.

Running the suite and reporting evidence is `hs-test`'s job. This file is
about *what* to write for a backend.

## Unit tests

Use the test runner your stack already recommends.

- Test the **service layer's rules** directly: one behavior per test, named
  after that behavior, arranged as Arrange-Act-Assert.
- Cover the failure paths as deliberately as the happy path. Duplicates,
  invalid input, and boundaries are where the bugs are.

```text
UserService.createUser
  test "creates a user with valid data":
      user = service.createUser(email = "a@example.com", name = "A")
      assert user.id exists

  test "rejects a duplicate email":
      assert service.createUser(email = "taken@example.com", name = "B")
             fails with EmailAlreadyExists

  test "stores a hash, never the plain password":
      user = service.createUser(email = "c@example.com", password = "plain-pass")
      assert user.passwordHash != "plain-pass" and starts with "$argon2id$"
```

### Fakes and mocks

- Inject dependencies (see `code-quality.md`), so a test can pass a
  **fake**: an in-memory repository or a stub email sender.
- Mock only at the **edges you don't own**, such as email, payment, or
  third-party APIs. Then assert that the call happened with the right
  arguments.
- Don't mock the thing under test or the database layer inside a unit
  test of business rules. If a test needs more than a couple of mocks,
  the code probably wants splitting.

## Integration tests

These exercise the real HTTP layer and a **real database**. They catch
wiring, SQL, and serialization bugs that unit tests can't.

```text
before each test: empty the users table                  # clean state per test

test "POST /api/users creates a user and persists it":
    res = http POST /api/users { email: "a@example.com", name: "A" }
    assert res.status == 201 and res.body.email == "a@example.com"
    assert the users table now has a row for "a@example.com"

test "POST /api/users returns 400 with field details for a bad email":
    res = http POST /api/users { email: "nope", name: "A" }
    assert res.status == 400 and res.body.error.code == "VALIDATION_ERROR"
```

Most frameworks provide an in-process HTTP test client for this, so the
test doesn't need a running server.

- **Use the same database engine as production.** A lightweight stand-in
  (an in-memory or file database instead of the real engine) hides real
  bugs. [Testcontainers](https://testcontainers.com/) starts a throwaway
  database in Docker per test run; a `docker compose` test database also
  works.
- **Isolate state**: truncate tables or wrap each test in a rolled-back
  transaction, so tests pass in any order.
- **Never point tests at a shared or production database.**
- Cover each endpoint's success status, its main validation failure, and
  its auth failure (`401`/`403`).

