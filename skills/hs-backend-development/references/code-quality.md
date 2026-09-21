# Backend Code Quality Lens

Use code-quality guidance when the changed code is difficult to understand or
change; do not impose a style refactor on unrelated behavior.

- Preserve project conventions and use names that explain the domain.
- Keep responsibilities clear at the boundaries the repository already uses.
- Prefer readable code over cleverness and explicit error handling over
  catch-and-swallow behavior.
- Remove duplication of business knowledge, not merely similar-looking lines.
- Add an abstraction when it represents a demonstrated ownership, change,
  testability, or consistency boundary; leave a small amount of repetition
  alone when it is clearer.
- Keep refactoring separate from behavior changes when the repository's tests
  and workflow make that practical.

Use the shared code-review and debugging workflows for broader quality or
root-cause analysis.
