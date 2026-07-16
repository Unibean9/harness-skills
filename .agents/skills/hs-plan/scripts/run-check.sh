#!/usr/bin/env bash
# Usage: run-check.sh <label> -- <command...>
#
# Runs <command>, then writes the verdict to disk instead of letting the caller
# self-report it. This is the harness's basic feedback sensor: any skill that
# needs to know pass/fail can use this and read the result back as a fact.
set -uo pipefail

label="${1:?usage: run-check.sh <label> -- <command...>}"
shift
if [ "${1:-}" = "--" ]; then
  shift
fi
if [ "$#" -eq 0 ]; then
  echo "error: no command given after --" >&2
  exit 2
fi

mkdir -p .harness/state
log_file=".harness/state/${label}.log"
status_file=".harness/state/${label}.status"

"$@" > "$log_file" 2>&1
code=$?

if [ "$code" -eq 0 ]; then
  echo "PASS" > "$status_file"
else
  echo "FAIL" > "$status_file"
fi

echo "---- $label ($([ "$code" -eq 0 ] && echo PASS || echo FAIL)) ----"
tail -n 40 "$log_file"

exit "$code"
