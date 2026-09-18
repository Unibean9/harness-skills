# PR Body Template

Use this shape when opening a PR in step 2 of `SKILL.md`. It exists so a
reviewer gets the evidence they need without having to ask for it - trim
sections that don't apply rather than leaving them as empty ceremony.

```markdown
## Summary
<what changed and why - the reader shouldn't need the issue open to follow this>

## Technical decisions
- <decision> - <rationale/evidence>
<or omit this section if nothing was non-obvious>

## Completion evidence
- Tests: <command + result, or "skipped: reason">
- Manual verification: <what you checked and how, if applicable>

## Checklist
- [x] <completed item>
- [ ] <incomplete/skipped item> - reason: <why>

## Linked issues
- Closes #XX
<or "No linked issue.">
```

## Notes

- Evidence-backed only - write "skipped: reason" instead of inventing a
  narrative for something that didn't actually run.
- Preserve `Closes #N` exactly - GitHub only auto-closes on that exact
  keyword form.
- Title stays a short conventional-commit summary (`type(scope): ...`);
  keep the detail in the body.
- If the PR already exists, use `gh pr edit --body-file <file>` to update it
  rather than opening a duplicate.
