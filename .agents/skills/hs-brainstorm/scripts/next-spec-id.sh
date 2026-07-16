#!/usr/bin/env bash
# Usage: next-spec-id.sh
# Prints the next spec ID (zero-padded to 3 digits) based on existing
# .harness/specs/NNN-* directories. A tiny deterministic helper so the agent
# doesn't have to compute this by eye and risk colliding with an existing spec.
set -uo pipefail

mkdir -p .harness/specs
max=0
for d in .harness/specs/*/; do
  [ -d "$d" ] || continue
  n="$(basename "$d" | grep -oE '^[0-9]+' || true)"
  if [ -n "$n" ]; then
    n=$((10#$n))
    [ "$n" -gt "$max" ] && max="$n"
  fi
done
printf "%03d\n" "$((max + 1))"
