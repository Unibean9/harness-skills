# Debugging Mindset and Logging

Debugging is an experiment, not a guessing game. Most wasted hours come
from changing code before the cause is known.

## The loop

1. **Reproduce** - get a reliable way to trigger the bug: a failing test, a
   curl command, exact steps. Without a reproduction, you can't tell
   whether a fix worked.
2. **Observe** - read the actual error, stack trace, and logs. Error
   messages usually name the file, line, and value involved.
3. **Hypothesize** - state one specific cause ("the token expired because
   the server clock is UTC and the client's isn't"), not "something with
   auth".
4. **Test the hypothesis** - add a log line, a breakpoint, or a smaller
   input that would prove or disprove it. Change one thing at a time.
5. **Fix the cause**, not the symptom. A `try/catch` that hides the error
   isn't a fix.
6. **Verify** - the original reproduction now passes. Turn it into a
   regression test so the bug can't quietly return.

Habits that keep the loop honest:

- **Shrink the problem** - cut the input, disable unrelated parts, or
  `git bisect` to find the commit that broke it.
- **Check your assumptions** - "this function is definitely called" and
  "the env var is definitely set" are the usual culprits. Print them and
  see.
- **Write down what you ruled out**, so you don't test the same idea
  twice, and so the fix's reasoning survives in the commit message or
  implementation notes.

## Structured logging

Log events as key-value fields rather than concatenated strings, so logs
can be filtered and searched ("every error for `userId=123`"):

```text
log.info("user logged in",  userId = "123", action = "login")
log.error("payment failed", orderId = order.id, error = e)     # stack included

emitted as one JSON object per line:
{"level":"error","msg":"payment failed","orderId":"o-42","requestId":"r-9","error":"..."}
```

Every mainstream stack has a structured logger; use the one your framework
recommends.

Attach a **request ID** (or correlation ID) to every log line of a request,
and pass it along to downstream services. It's what lets you follow one
failing request through the whole system.

## Log levels

| Level | Use for | Example |
|---|---|---|
| DEBUG | Detail needed only while debugging | SQL issued, cache hit or miss |
| INFO | Normal events worth a record | user logged in, order created |
| WARN | Something off that the system recovered from | retry succeeded, deprecated endpoint used |
| ERROR | An operation failed | payment call failed, unhandled exception |

Run production at INFO, and make the level configurable (`LOG_LEVEL`) so
you can turn on DEBUG briefly without a redeploy.

## What to log, what never to log

**Log:** request metadata (method, path, status, duration), errors with
their context and stack, security events (logins, permission changes), and
business events (order placed, payment captured).

**Never log:** passwords, tokens, API keys, session IDs, card numbers, or
personal data. That also rules out full request bodies in production,
since they often contain some of these. Redact fields by name in the
logger config, so one careless "log the whole request body" can't leak
them.
