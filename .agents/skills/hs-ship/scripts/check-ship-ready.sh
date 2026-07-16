#!/usr/bin/env bash
# Usage: check-ship-ready.sh
#
# Refuses to say "ready" unless every gate the harness cares about is actually
# on record in .harness/ — this is what stands between "looks done" and the
# agent being allowed to say "done." Resolves the active spec via
# .harness/state/current-spec, since progress.md now lives per-spec.
set -uo pipefail

fail=0

current_spec_file=".harness/state/current-spec"
if [ ! -f "$current_spec_file" ]; then
  echo "MISSING: $current_spec_file — no active spec on record, run hs-brainstorm first"
  exit 1
fi

active_spec="$(cat "$current_spec_file")"
progress_file=".harness/specs/${active_spec}/progress.md"

if [ ! -f "$progress_file" ]; then
  echo "MISSING: $progress_file (no record that any task was completed)"
  fail=1
elif grep -q '^- \[ \]' "$progress_file"; then
  echo "INCOMPLETE: unchecked tasks remain in $progress_file:"
  grep '^- \[ \]' "$progress_file"
  fail=1
fi

if [ ! -f .harness/state/verify-all.status ]; then
  echo "MISSING: .harness/state/verify-all.status — run hs-verify first"
  fail=1
elif [ "$(cat .harness/state/verify-all.status)" != "PASS" ]; then
  echo "NOT GREEN: verify-all.status is $(cat .harness/state/verify-all.status)"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "READY"
  exit 0
else
  echo "NOT READY"
  exit 1
fi
