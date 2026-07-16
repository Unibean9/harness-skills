#!/usr/bin/env bash
# Wires this repo's canonical skills (.agents/skills/) into whatever coding
# agent(s) are set up for this project.
#
# Codex CLI and Gemini CLI read .agents/skills/ natively — nothing to do for
# them. Claude Code looks in .claude/skills/ instead, so this creates a symlink
# per skill there, pointing back at the canonical copy. Because it's a symlink,
# editing a SKILL.md under .agents/skills/ takes effect for every agent
# immediately — no reinstall needed when the harness itself changes.
set -euo pipefail
cd "$(dirname "$0")"

force=false
if [ "${1:-}" = "--force" ]; then
  force=true
  shift
fi
if [ "$#" -ne 0 ]; then
  echo "usage: $0 [--force]" >&2
  exit 2
fi

if [ ! -d .agents/skills ]; then
  echo "error: .agents/skills not found — run this from the harness-skills repo root" >&2
  exit 1
fi

mkdir -p .claude/skills

conflicts=()
for skill_dir in .agents/skills/*/; do
  name="$(basename "$skill_dir")"
  target=".claude/skills/$name"
  if [ -e "$target" ] || [ -L "$target" ]; then
    if [ ! -L "$target" ] || [ "$(cd -P "$target" && pwd)" != "$(cd -P "$skill_dir" && pwd)" ]; then
      conflicts+=("$target")
    fi
  fi
done
if [ "${#conflicts[@]}" -gt 0 ] && [ "$force" != true ]; then
  for target in "${conflicts[@]}"; do
    echo "error: refusing to replace non-harness target: $target (rerun with --force to replace it)" >&2
  done
  exit 1
fi

for skill_dir in .agents/skills/*/; do
  name="$(basename "$skill_dir")"
  target=".claude/skills/$name"
  if [ -e "$target" ] || [ -L "$target" ]; then
    if [ -L "$target" ] && [ "$(cd -P "$target" && pwd)" = "$(cd -P "$skill_dir" && pwd)" ]; then
      echo "already linked $target -> $(cd -P "$skill_dir" && pwd)"
      continue
    fi
    rm -rf "$target"
  fi
  ln -s "../../.agents/skills/$name" "$target"
  echo "linked $target -> $(cd -P "$skill_dir" && pwd)"
done

node .agents/scripts/generate-claude-scout.mjs

echo
echo "Done. Codex CLI and Gemini CLI already read .agents/skills/ directly — no action needed for them."
echo "Claude Code hook example (optional): merge hooks/claude-code/settings.snippet.json into .claude/settings.json"
