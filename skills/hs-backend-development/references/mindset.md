# Backend Decision Lenses

Use these questions to focus backend reasoning on decisions that can change
the outcome. They are prompts for inspection, not a universal checklist.

- What invariant must remain true?
- What happens when a dependency is slow, unavailable, or returns malformed
  data?
- What happens when the same request or event arrives twice?
- What can race, and where is the transaction or consistency boundary?
- Which data may be stale, and for how long?
- What trust boundary is crossed, and which actor is authorized for each
  object, function, or property?
- What contract do other components rely on, and what is backward-compatible?
- What resource limit is relevant: rows, payloads, connections, queue depth,
  retries, or time?
- What does the blast radius look like if this fails?
- What must be observable so the failure can be diagnosed?

Read the repository and its tests before answering these questions. Use only
the lenses that affect the requested change, then pair each material risk with
evidence the workflow can verify.
