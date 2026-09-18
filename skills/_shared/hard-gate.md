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

## Writing the gate in a skill

Keep the link sentence on one line, with `{scope}` in double quotes, exactly
as the existing skills do:

```
<HARD-GATE>
See `../_shared/hard-gate.md` for the shared gate shape (`{scope}` = "a plan exists and has been reviewed"). Optional extra clause.
</HARD-GATE>
```

`install/lib/generate-runtime.mjs` matches that exact shape to inline the
gate into every generated runtime, so the gate reads correctly in the ported
skill file on its own even though `_shared/` is installed alongside it. A
wrapped or unquoted scope is left un-inlined and ships as a bare link.

`hs-plan`, `hs-test`, `hs-code-review`, and `hs-ship` don't carry this gate:
they produce plans, evidence, findings, or git/GitHub actions that already
need their own user confirmation, not implementation code.
