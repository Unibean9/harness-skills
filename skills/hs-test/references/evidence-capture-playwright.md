# Evidence Capture via Playwright MCP

Use this when Playwright MCP tools are available in the session or the project
has a configured local Playwright runner, and the change under test touches a
UI or an HTTP-facing flow - black-box verification where behavior is only
observable from outside the process (see "White-box vs black-box" in
`SKILL.md`).

## Readiness

Treat session MCP access, the project's Playwright package, and its browser
binaries as separate prerequisites. Check MCP tools in the active session and
inspect the project's manifest, lockfile, scripts, and Playwright config before
installing anything. If Playwright is already declared but locked dependencies
are absent, install from the existing lockfile with the repository's package
manager. Use the local Playwright CLI's `install --list` to see available
browsers, then install only the configured or task-required browser if it is
missing. Browser installation downloads binaries into a user cache. Do not add
Playwright to a project that has no existing setup unless the user authorizes
that dependency change.

## Procedure

1. Navigate to the affected page or flow and reproduce the happy path, then
   the failure and boundary cases that matter to the accepted behavior.
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
4. If Playwright MCP isn't available, use the configured local Playwright
   runner when present. Otherwise use whatever black-box tooling the project
   already has (a curl script or another e2e runner) and report any required
   claim that remains unverified.

## What this is not

Capture is evidence for the current verification task, not an automatic
mandate to add a permanent end-to-end suite. Recommend a durable test when
the workflow is business-critical, regression-prone, stable enough to
maintain, and lower-level probes cannot protect it.
