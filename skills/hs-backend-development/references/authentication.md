# Authentication and Authorization

Use maintained identity and authentication libraries or providers, and follow
the actual token or session profile rather than copying a protocol tutorial.
For a material change, research current authoritative guidance from the
relevant IETF RFCs, NIST, OWASP, and provider documentation.

Check the applicable invariants:

- validate token signature, profile, issuer, audience, expiry, type, and
  allowed algorithms as required by the actual token format;
- authorize the actor for the object, function, and sensitive properties,
  with deny-by-default behavior where the project requires it;
- protect session and token lifecycle against replay, fixation, leakage, and
  unsafe logout or rotation behavior;
- validate input and resource bounds at every trust boundary;
- protect outbound requests and third-party credentials;
- keep secrets, tokens, session identifiers, passwords, and sensitive payloads
  out of logs and error responses;
- test negative paths, not only successful authentication.

Do not freeze a draft protocol, signing algorithm, provider behavior, or
configuration constant into generic guidance without current evidence.
