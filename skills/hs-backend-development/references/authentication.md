# Authentication & Authorization

*Authentication* answers "who is this?" and *authorization* answers "what
are they allowed to do?". Get both from well-tested libraries or an
identity provider. Hand-rolled crypto and token handling are where
beginner backends get breached.

## OAuth 2.1 + PKCE (signing in through a provider)

OAuth 2.1 consolidates OAuth 2.0 and its later security best practices. The
parts that matter when you build a client:

- Use the **authorization code flow with PKCE** for every client, including
  server-side ones.
- **Match redirect URIs exactly** and send a random **`state`** value
  (CSRF protection) that you check on the callback.
- Don't use the implicit grant or the password grant, and never put a
  bearer token in a query string.

The flow is three steps:

```text
1. Client creates code_verifier (random) and
   code_challenge = base64url(sha256(code_verifier))
2. Redirect the user to /authorize?response_type=code&client_id=...
   &redirect_uri=...&scope=openid profile email&state=<random>
   &code_challenge=<challenge>&code_challenge_method=S256
3. On the callback, check state, then POST /token with
   grant_type=authorization_code, the code, redirect_uri, and code_verifier
```

PKCE ensures that a stolen authorization code is useless without the
verifier, which never left the client.

## JWT (stateless access tokens)

A JWT is `header.payload.signature`. Anyone can *read* the payload; the
signature only proves it wasn't changed. So:

- **Short-lived access tokens** (minutes) plus longer-lived **refresh
  tokens** that rotate: each use issues a new refresh token and invalidates
  the old one.
- **Verify everything**: signature, an explicit algorithm allowlist, `iss`,
  `aud`, and `exp`. Never accept `alg: none`.
- **Asymmetric signing** (RS256/ES256) when other services verify tokens,
  so only the issuer holds the private key.
- **Minimal claims**: user id, roles, expiry. No personal or secret data.

```text
issue:  sign({ sub: user.id, roles: user.roles },
             key = private_key, algorithm = RS256, expires_in = 15 min,
             issuer = "https://api.example.com", audience = "https://app.example.com")

verify: claims = verify(token, key = public_key,
                        allowed_algorithms = [RS256],
                        expected_issuer = ..., expected_audience = ...)
        reject if any check fails (signature, alg, iss, aud, exp)
```

Because a JWT stays valid until it expires, logout and revocation need
either short lifetimes or a server-side denylist. If you need instant
revocation, sessions (below) are often simpler.

## Password storage

- Hash with a slow, salted algorithm built for passwords: **Argon2id**
  first, with bcrypt or scrypt as acceptable fallbacks. Never use MD5 or
  SHA-*, and never use reversible encryption.
- Let the library generate the salt, and store its output string as-is
  (it includes the parameters).
- Follow current NIST SP 800-63B guidance: favor length over composition
  rules, allow passphrases and all printable characters, check new
  passwords against known-breached lists, and require a change only after
  a compromise, not on a schedule.

```text
on signup: stored = password_hash(password, algorithm = argon2id)   # salt + params inside
on login:  ok = password_verify(stored, attempt)                     # constant-time compare
```

## Sessions (stateful, server-side)

- Session cookie flags: `HttpOnly` (no JS access), `Secure` (HTTPS only),
  and `SameSite=Lax` or `Strict` (CSRF defense). Add CSRF tokens for
  state-changing forms.
- **Regenerate the session ID** after login and after any privilege change,
  which prevents session fixation.
- Set both an idle timeout and an absolute timeout.
- Keep session data on the server (a shared store such as Redis when there
  are several instances); the cookie carries only the ID.

## RBAC (role-based access control)

```
Users -> Roles -> Permissions -> Resources
```

- **Deny by default**: an endpoint with no rule attached is forbidden, not
  open.
- **Least privilege**: give each role only what it needs. Check
  *permissions* in code (`orders:refund`), not role names, so roles can
  change without a code edit.
- **Check ownership too**: "is an editor" isn't enough if the resource
  belongs to another user or tenant. That gap is IDOR, one of the most
  common access-control bugs.
- Enforce the check in one place (middleware or guard) on every route, and
  log role changes.

## MFA (multi-factor authentication)

- **TOTP** (authenticator apps): store the per-user secret encrypted, show
  it once as a QR code, and accept a small clock-drift window. Give users
  recovery codes at enrollment.
- **WebAuthn / passkeys**: phishing-resistant and nothing shared to leak.
  Prefer them when your users' devices support them. Use a maintained
  WebAuthn library for your stack rather than implementing the protocol
  yourself.
- Ask for the second factor again for sensitive actions (changing the
  email or password, payouts).
