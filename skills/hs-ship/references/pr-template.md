# PR Body Template

Use this fallback only when the repository has no PR template. Trim sections
that do not apply.

```markdown
## Summary
<what changed and why>

## Release candidate
- Head SHA: <exact revision reviewed and tested>
- Base: <target branch>

## Evidence
- Tests: <result state, command, and result, or skipped/unverified reason>
- Domain validation: <result state and scope, if applicable>
- Review: <verdict and remaining limitations>

## Material decisions
- <decision> - <reason/evidence>
<omit when none>

## Linked issues
- Closes #XX
<or “No linked issue.”>

## Limitations
- <unverified, flaky, optional, or environment-dependent item>
<omit when none>
```

Use the project's title convention rather than imposing conventional commits.
Preserve accepted closing-keyword syntax exactly. If a PR already exists,
update its body instead of creating a duplicate. Evidence states such as
`VERIFIED`, `FAILED`, `TEST-DEFECT`, `UNVERIFIED`, and `FLAKY` must remain
truthful in the body.
