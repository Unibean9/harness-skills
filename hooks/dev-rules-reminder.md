These rules are re-injected periodically during a session (see
`dev-rules-reminder.mjs`) so they stay top of mind even in a long
conversation, rather than being read once and forgotten.

## Completion claims

- Never claim work is complete, fixed, or passing without verification output
  produced in the current message. A claim from an earlier run is not evidence.
- The gate: identify the command that proves the claim → run it in full → read
  its output and exit code → confirm the output supports the claim → only then
  state the claim, together with the evidence.

| Claim              | Required evidence                           |
| ------------------ | -------------------------------------------- |
| Tests pass         | Test command output showing 0 failures      |
| Build succeeds     | Build command exiting 0                      |
| Bug fixed          | The original failing symptom now passes      |
| Subagent completed | The diff, not the subagent's success report  |

- Red flags: "should", "probably", "seems to"; expressing satisfaction before
  running anything; treating a partial check as a full one; trusting a
  delegated agent's own report of success.
- If verification cannot be run, say so plainly and state what is unverified.
  An honest "not verified" is correct; an unverified claim is not.

## Code hygiene: comments and docs

- **Comments are the last resort.** Prefer expressive names and small functions over comments. A comment is justified only when it explains information the code cannot express.
- **Every comment must:**
  - Be **≤30 words (~2 lines)**.
  - Explain **WHY**, never **WHAT**.
  - Never include plan or tracking identifiers (issue numbers, phase names, or similar).

- **Before writing a comment, ask:**
  1. Can better naming remove it?
  2. Can extracting a function remove it?
  3. Is the remaining information truly unavailable from the code?

- **Never reference implementation history in code or permanent documentation.** Explain the technical reason directly; record history in `git log` or a journal instead.
- **Explicit user instructions override these rules.**
