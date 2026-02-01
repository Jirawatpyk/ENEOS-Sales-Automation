#!/bin/bash
# ===========================================
# Local CI Mirror
# Mirrors the GitHub Actions pipeline locally for debugging
# Usage: bash scripts/ci-local.sh
# ===========================================

set -e

echo "============================================"
echo "  ENEOS Sales Automation - Local CI Runner"
echo "============================================"
echo ""

# Stage 1: Quality Gate
echo "--- Stage 1/4: Quality Gate ---"
echo "Running linter..."
npm run lint || { echo "LINT FAILED"; exit 1; }
echo "Linter passed"
echo ""

echo "Running type check..."
npm run typecheck || { echo "TYPECHECK FAILED"; exit 1; }
echo "Type check passed"
echo ""

# Stage 2: Tests with Coverage
echo "--- Stage 2/4: Tests + Coverage ---"
echo "Running tests with coverage..."
npm run test:coverage || { echo "TESTS FAILED"; exit 1; }
echo "Tests passed with coverage"
echo ""

# Stage 3: Build
echo "--- Stage 3/4: Build ---"
echo "Building TypeScript..."
npm run build || { echo "BUILD FAILED"; exit 1; }
echo "Build passed"
echo ""

# Stage 4: Burn-in (reduced: 3 iterations)
echo "--- Stage 4/4: Burn-In (3 iterations) ---"
for i in 1 2 3; do
  echo "Burn-in iteration $i/3"
  npm run test || { echo "BURN-IN FAILED on iteration $i"; exit 1; }
done
echo "Burn-in passed (3/3)"
echo ""

echo "============================================"
echo "  LOCAL CI PIPELINE PASSED"
echo "============================================"
echo ""
echo "All stages completed successfully."
echo "Safe to push to remote."
