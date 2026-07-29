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
