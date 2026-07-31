# Shared HARD-GATE Convention

Canonical shape of the "no implementation before {scope}" gate used across
several skills. Each consuming skill fills in its own `{scope}` (what must
exist/be approved before implementation) directly below its link to this
file.

## Canonical shape

```
<HARD-GATE>
Do NOT write or modify implementation code until {scope}.
This applies regardless of perceived task simplicity - unexamined assumptions
waste the most time on "simple" tasks.
A user may explicitly override this ordering, but never a required safety,
privacy, or confirmation guard.
</HARD-GATE>
```

## Known `{scope}` values in use

| Skill | `{scope}` |
|---|---|
| `hs:backend-development`, `hs:frontend-development` | "a plan exists or the user has explicitly requested implementation" |
| `hs:brainstorm` | "a direction has been chosen and written down" |
| `hs:build` | "a plan exists and has been reviewed" |
| `hs:devops` | "the domain's own confirmation checkpoint has been explicitly approved by the user" (e.g. Terraform Architecture Lock, Pipeline Lock) |

`hs:plan` and `hs:code-review` don't use this gate - `hs:plan` only ever
produces plan documents, and `hs:code-review` is read-only by default.
