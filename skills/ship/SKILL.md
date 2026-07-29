---
name: hs:ship
description: Commit, push, and open a pull request as three separately confirmed steps. Use when work is verified and ready to land.
license: MIT
metadata:
  author: harness-skills
  version: "1.0.0"
---

# Ship Skill

Each heading below is one separate confirmation from you - never chain all
three into one automatic action.

### 1. Commit

Commit only the paths you've confirmed belong to this change. Never commit
a secret, credential, or generated file. Write a short, clear commit
message.

### 2. Push

Confirm the target remote and branch before pushing. Push only after you're
sure the commit above is what you meant to push.

### 3. Pull Request

Open a PR only once you have evidence the change was checked (tests/build
ran and passed). Use `gh pr create` or your platform's equivalent.

## Make it yours

Switch to your own commit-message convention, or skip the PR step entirely
if you're working directly on the main branch for a solo assignment.
