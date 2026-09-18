# `.hs.json` Artifacts Convention

Shared pattern for resolving default output directories, used by skills
that produce persisted output (plans, PRDs, test evidence).

## Pattern

1. Read the repository-root `.hs.json` (optional; skills only read it,
   never write it).
2. Look up `artifacts.<kind>.directory`, where `<kind>` is a skill-specific
   key (e.g. `plans`, `brainstorms`).
3. If the key or file is absent/unreadable, fall back to that skill's own
   hardcoded default directory name.
4. An explicit path argument from the user always overrides both.

## Known `<kind>` keys in use

| Skill | `<kind>` key | Fallback if absent |
|---|---|---|
| `hs-plan` | `artifacts.plans.directory` | `plans` |
| `hs-brainstorm` | `artifacts.brainstorms.directory` (for the optional PRD report) | `plans/reports` |
| `hs-test` | `artifacts.test_evidence.directory` (for captured black-box evidence) | `plans/reports/evidence` |

`artifacts.plans.archiveDirectory` (default `plans/archive`) is not read by
any skill. The scout guard in `hooks/scout-block.mjs` reads it to block
broad reads of archived plans unless the folder is in
`guardrails.hooks.scout.allowlist`.
