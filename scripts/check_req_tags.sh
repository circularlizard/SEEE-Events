#!/usr/bin/env bash
set -euo pipefail

# Enforce that every .feature file contains at least one @REQ- tag.
# Tier 2 rule: requirement traceability.

fail=0

while IFS= read -r -d '' file; do
  if ! grep -Eq "@REQ-[A-Z]+-[0-9]+" "$file"; then
    echo "Missing @REQ-* tag in: $file" >&2
    fail=1
  fi
done < <(find tests/e2e/features -type f -name "*.feature" -print0)

if [ "$fail" -ne 0 ]; then
  echo "REQ tag enforcement failed." >&2
  exit 1
fi

echo "REQ tag enforcement passed."
