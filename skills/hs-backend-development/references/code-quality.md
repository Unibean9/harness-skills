# Code Quality: SOLID, Clean Code, Refactoring

These are principles for code a teammate (or you, in three months) can
change safely. Use them as lenses when something feels hard to change, not
as rules to apply everywhere up front. Three similar lines are often better
than a premature abstraction.

## SOLID

**S - Single responsibility.** A module has one reason to change. A `User`
class that saves itself, sends emails, and builds reports changes for
three unrelated reasons. Split it into `UserRepository`, `EmailService`,
and `ReportGenerator`, which is exactly the controller/service/repository
split from `architecture.md`.

**O - Open/closed.** Add behavior by adding code, not by editing a growing
`if/else` chain:

```text
interface PaymentMethod:  charge(amount) -> PaymentResult
CardPayment   implements PaymentMethod
WalletPayment implements PaymentMethod

Checkout(payment: PaymentMethod):
    pay(amount): return payment.charge(amount)
```

A new provider is a new class; `Checkout` doesn't change.

**L - Liskov substitution.** A subtype must work anywhere its parent does.
If `Penguin extends Bird` has to throw from `fly()`, the hierarchy is
wrong. Model what they actually share (`move()`) instead.

**I - Interface segregation.** Keep interfaces small enough that no
implementer has to stub out methods it can't support. `Workable` and
`Eatable` beat one `Worker` interface that a `Robot` implements by
throwing.

**D - Dependency inversion.** Depend on an interface and have the
concrete implementation passed in, rather than `new`-ing it inside:

```text
UserService(users: UserRepository):        # injected, not created inside
    getUser(id): return users.findById(id)
```

This is what makes the service unit-testable: pass in a fake
`UserRepository`.

## Clean code

- **Names say what and in which unit**: `calculateAreaInMeters(widthInInches, heightInInches)`,
  not `d(a, b)`.
- **Small functions that read like the steps they perform**:

  ```text
  processOrder(orderId):
      order   = validateOrder(orderId)
      reserveInventory(order)
      payment = chargePayment(order)
      markPaid(order.id)
      sendConfirmation(order, payment)
  ```

- **Named constants instead of magic numbers**:
  `ONE_DAY_MS = 24 * 60 * 60 * 1000`, not `86400000`.
- **Never swallow errors.** Catching an error, printing it, and returning
  an empty value turns a failure into a wrong answer somewhere else. Either handle the
  error meaningfully, or log it with context and rethrow a typed error that
  keeps the cause:

  ```text
  on error e:
      log.error("user fetch failed", userId = id, error = e)
      raise DatabaseError("user fetch failed", cause = e)
  ```

- **DRY for knowledge, not for look-alike code.** When the same rule (e.g.
  "what is a valid email") appears on two endpoints, extract it so it can't
  drift. Two blocks that merely look similar but change for different
  reasons can stay separate.
- **Comments explain why**, never what the code already says.

## Refactoring techniques

Refactor in small steps with the tests green before and after each one,
and keep refactoring commits separate from behavior changes.

- **Extract function** - pull a block that does one nameable thing into a
  function named after it (`printOrderHeader`, `printOrderItems`).
- **Replace conditional with polymorphism** - a `switch` on a type field
  that shows up in several places (`shippingMethod == "express"` ->
  cost, ETA, label) becomes one class per case implementing a shared
  interface.
- **Introduce parameter object** - a function taking many related
  arguments (`from, to, timezone`) takes one `DateRange` instead.
- **Rename** - the cheapest refactor with the highest payoff; do it as
  soon as a name stops matching what the code does.

## Checklist

- [ ] Each module or class has one clear responsibility.
- [ ] Dependencies are injected, so the code can be tested with fakes.
- [ ] Names are descriptive; no unexplained numbers or strings.
- [ ] Functions are short enough to read at a glance and do one thing.
- [ ] No swallowed errors; failures are logged with context and surfaced.
- [ ] Shared business rules live in one place.
- [ ] Comments explain why, not what.
- [ ] Readable over clever.

Further reading: *Refactoring* (Martin Fowler), and
https://refactoring.guru/ for patterns and refactorings with examples.
