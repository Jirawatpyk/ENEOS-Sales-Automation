#!/bin/bash
# ===========================================
# Burn-In Runner for Changed Test Files
# Detects changed test files and runs them multiple times
# Usage: bash scripts/burn-in-changed.sh [iterations] [base-branch]
# ===========================================

set -e

ITERATIONS=${1:-5}
BASE_BRANCH=${2:-main}
SPEC_PATTERN='src/__tests__/.*\.test\.ts$'

echo "============================================"
echo "  Burn-In Test Runner"
echo "============================================"
echo "Iterations:  $ITERATIONS"
echo "Base branch: $BASE_BRANCH"
echo ""

# Detect changed test files
echo "Detecting changed test files..."
CHANGED_SPECS=$(git diff --name-only $BASE_BRANCH...HEAD | grep -E "$SPEC_PATTERN" || echo "")

if [ -z "$CHANGED_SPECS" ]; then
  echo "No test files changed. Skipping burn-in."
  exit 0
fi

SPEC_COUNT=$(echo "$CHANGED_SPECS" | wc -l | xargs)
echo "Found $SPEC_COUNT changed test file(s):"
echo "$CHANGED_SPECS" | sed 's/^/  - /'
echo ""

# Burn-in loop
for i in $(seq 1 $ITERATIONS); do
  echo "============================================"
  echo "Burn-in iteration $i/$ITERATIONS"
  echo "============================================"

  if npx vitest run $CHANGED_SPECS; then
    echo "Iteration $i passed"
  else
    echo ""
    echo "BURN-IN FAILED on iteration $i"
    echo "Tests are flaky - fix before merging"
    exit 1
  fi
  echo ""
done

echo "============================================"
echo "  BURN-IN PASSED"
echo "============================================"
echo "All $ITERATIONS iterations passed for $SPEC_COUNT test file(s)"
echo "Changed tests are stable and ready to merge."
