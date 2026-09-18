# OWASP Top 10 - Quick Names

One line per category, as a checklist to look up further when relevant.

1. **Broken Access Control** - users can act outside their intended permissions.
2. **Cryptographic Failures** - sensitive data exposed due to weak/missing encryption.
3. **Injection** - untrusted input executed as code/query (SQL, command, etc.).
4. **Insecure Design** - missing security controls in the design itself, not just the code.
5. **Security Misconfiguration** - default credentials, verbose errors, open ports left on.
6. **Vulnerable and Outdated Components** - unpatched dependencies with known CVEs.
7. **Identification and Authentication Failures** - weak login/session handling.
8. **Software and Data Integrity Failures** - unsigned/unverified code or updates.
9. **Security Logging and Monitoring Failures** - attacks go undetected due to missing logs/alerts.
10. **Server-Side Request Forgery (SSRF)** - server tricked into making requests to unintended targets.

Full details: https://owasp.org/www-project-top-ten/ and the practical
how-tos in https://cheatsheetseries.owasp.org/

## Input validation

Most injection and logic bugs start with input that was trusted too
early. Validate **on the server, at the boundary**, for every source:
body, query, path params, headers, webhooks, and queue messages. Client-side
checks are only for user experience.

- **Validate with a schema** that parses into a typed object, and reject
  anything that doesn't fit, rather than checking fields by hand:

  ```text
  CreateUser schema (unknown fields rejected):
      email: string, valid email format
      name:  string, length 1..100
      age:   integer, >= 18

  input = CreateUser.parse(request.body)   # failure -> 400 with field details
  ```

  Most frameworks ship or recommend a schema-validation library; use it
  instead of hand-written `if` checks.
- **Allowlist, don't denylist**: accept the known-good fields and values
  (strict schemas, enums, the sortable field list). Blocking "bad"
  characters always misses one, and passing the raw request body straight
  into an ORM update lets a client set `isAdmin` (mass assignment).
- **Bound everything**: string lengths, array sizes, numeric ranges, and
  request body size, so a single request can't exhaust memory.
- **Validation is not escaping.** Still use parameterized queries for SQL,
  argument arrays for shell commands, and output encoding (or a sanitizer
  when you must accept HTML) where data is rendered.

## Rate limiting

Rate limiting protects login and signup from brute force, and protects the
whole API from one noisy client:

```text
/api/*       -> at most 100 requests per client per 15 minutes
/api/auth/*  -> at most 10 requests per client per 15 minutes   (much stricter)
over the limit -> 429 Too Many Requests + Retry-After
```

- Key the limit by user ID once authenticated, and by IP before that.
- Return `429 Too Many Requests` with a `Retry-After` header.
- With several app instances, keep counters in a shared store (Redis), or
  enforce limits at the gateway. Otherwise each instance counts
  separately.
- The numbers are a starting guess; tune them from real traffic.

## Security headers

Set these once in middleware (or at the gateway or reverse proxy) rather
than per route:

| Header | Value to start from | Stops |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | downgrade to plain HTTP |
| `Content-Security-Policy` | `default-src 'self'` (then loosen as needed) | injected scripts (XSS) |
| `X-Content-Type-Options` | `nosniff` | MIME-type confusion |
| `X-Frame-Options` / CSP `frame-ancestors` | `DENY` / `'none'` | clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | leaking URLs to other sites |

Configure **CORS** with an explicit list of allowed origins. Never use `*`
together with credentials.

## Secrets

- Never commit secrets. Keep `.env` git-ignored and commit a
  `.env.example` with the names only.
- Read secrets from the environment or a secret manager, and fail fast at
  startup when one is missing:

  ```text
  on startup:
      db_url = env("DATABASE_URL")
      if db_url is missing: stop with "DATABASE_URL is not set"
  ```

- Use separate secrets per environment, and give each one only the access
  it needs.
- Generate tokens and IDs with your platform's cryptographically secure
  random generator, never the general-purpose one meant for games and
  shuffling.
- Where secrets come from at runtime (Key Vault, Kubernetes, managed
  identity) and how to rotate them: see
  `../../hs-devops/references/observability-and-secrets.md`.

## API security checklist

- [ ] HTTPS only, with HSTS.
- [ ] Every route is authenticated and authorized by default (see
      `authentication.md`).
- [ ] Every input is schema-validated on the server, with unknown fields
      rejected.
- [ ] Parameterized queries only; no string-built SQL or shell commands.
- [ ] Rate limits on auth endpoints and the public API.
- [ ] Security headers set; CORS restricted to known origins.
- [ ] Errors return a generic message plus a code, with no stack traces or
      internals.
- [ ] Auth events (logins, failures, role changes) are logged, without
      secrets.
- [ ] No secrets in the repo, the image, or the logs.
- [ ] Dependencies scanned for known vulnerabilities (your package
      manager's audit command, or Dependabot).

