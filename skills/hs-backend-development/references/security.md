# Backend Security Boundaries

Treat security as a property of the changed trust boundary. Scope the review
to the input, identity, authorization, data, and outbound-resource paths the
change actually touches.

Check for:

- schema validation and bounded payload, query, upload, and pagination sizes;
- parameterized database queries and safe command or template handling;
- object, function, and property authorization with negative-path coverage;
- restricted CORS, outbound request targets, redirects, and third-party
  credentials;
- rate limits or abuse controls where the endpoint or operation is sensitive;
- generic client errors that do not expose stack traces, tokens, secrets, or
  internal topology;
- secure logging and redaction of passwords, session data, payment data, and
  personal information;
- dependency and configuration evidence appropriate to the project's current
  security support.

For material security changes, consult current OWASP ASVS/API Security,
relevant IETF guidance, NIST guidance, and provider documentation. Do not turn
this lens into a universal checklist for an unrelated diff.
