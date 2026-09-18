# Evidence Capture via Playwright MCP

Use this when Playwright MCP tools are available in the session and the
change under test touches a UI or an HTTP-facing flow - i.e. black-box
verification where the behavior is only observable from outside the
process (see "White-box vs black-box" in `SKILL.md`).

## Procedure

1. Navigate to the affected page/flow and reproduce the happy path, then
   each failure/boundary case identified from the requirement.
2. Capture evidence as you go, not just the final state:
   - a screenshot at each meaningful state (before/after an action, an
     error state);
   - the network requests/responses for the calls under test;
   - console errors, if any appear.
   Capture what proves the *specific* behavior under test, not a generic
   "it loaded" screenshot.
3. Save captured evidence under `artifacts.test_evidence.directory` from
   `.hs.json` if set (see `../../_shared/hs-json-artifacts-convention.md`),
   else `plans/reports/evidence/`. Name each file so the flow and case are
   obvious without opening it (e.g. `login-invalid-password.png`,
   `checkout-happy-path-network.json`).
4. If Playwright MCP isn't available in this session, say so plainly and
   fall back to whatever black-box tooling the project already has (a curl
   script, an existing e2e runner) rather than skipping black-box
   verification silently.

## What this is not

Capture is for verification, not a replacement for a checked-in e2e suite.
If a flow is worth verifying once this way, it's usually worth a durable
test too - flag that to the user rather than deciding alone whether to add
one.
