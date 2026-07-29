# `.hs.json` Artifacts Convention

Shared pattern for resolving default output directories, used by skills
that produce persisted output (plans, journals, etc.).

## Pattern

1. Read the repository-root `.hs.json` (optional; skills only read it,
   never write it).
2. Look up `artifacts.<kind>.directory`, where `<kind>` is a skill-specific
   key (e.g. `plans`, `journals`).
3. If the key or file is absent/unreadable, fall back to that skill's own
   hardcoded default directory name.
4. An explicit path argument from the user always overrides both.

## Known `<kind>` keys in use

| Skill | `<kind>` key | Fallback if absent |
|---|---|---|
| `hs:plan` | `artifacts.plans.directory` | `plans` |
| `hs:build` | `artifacts.journals.directory` (for the journal step) | `docs/journals` |
