# CI/CD Pipeline Guide

## Overview

The ENEOS Sales Automation CI/CD pipeline runs on **GitHub Actions** and enforces quality gates before code reaches production.

**Pipeline architecture:**

```
quality (lint + typecheck)
  └─► test (coverage enforcement + build)
        ├─► burn-in (PR only - flaky detection)
        └─► build-docker (push only)
              └─► deploy-railway (main branch only)
```

**Configuration file:** `.github/workflows/ci.yml`

## Pipeline Stages

### 1. Quality Gate (`quality`)

**Trigger:** All pushes and PRs
**Timeout:** 5 minutes

Runs lint and type checking. Fails fast before expensive test execution.

- `npm run lint` - ESLint checks
- `npm run typecheck` - TypeScript strict mode validation

### 2. Test & Coverage (`test`)

**Trigger:** All pushes and PRs (after quality passes)
**Timeout:** 10 minutes

Runs full test suite with coverage enforcement.

- `npm run test:coverage` - Vitest with v8 coverage
- `npm run build` - TypeScript compilation
- Coverage thresholds (from `vitest.config.ts`):
  - Lines: 25%
  - Functions: 60%
  - Branches: 60%
  - Statements: 25%
- **Artifact:** Coverage HTML report uploaded (14-day retention)

### 3. Burn-In (`burn-in`)

**Trigger:** Pull requests only (after test passes)
**Timeout:** 15 minutes

Detects flaky tests by running them multiple times.

- **Changed test files detected:** 5 iterations on changed files only
- **No test files changed:** 3 iterations of full suite
- **Failure = flaky:** Even 1 failure in any iteration means tests are not stable

### 4. Build Docker (`build-docker`)

**Trigger:** Push to main/develop only
**Depends on:** test

Builds Docker image with BuildKit caching. Does not push to registry (build validation only).

### 5. Deploy Railway (`deploy-railway`)

**Trigger:** Push to main only
**Depends on:** test + build-docker
**Environment:** production

Deploys to Railway using the Railway CLI.

## Triggers

| Event | quality | test | burn-in | build-docker | deploy-railway |
|-------|---------|------|---------|--------------|----------------|
| Push to main | Yes | Yes | No | Yes | Yes |
| Push to develop | Yes | Yes | No | Yes | No |
| Pull request to main | Yes | Yes | Yes | No | No |
| Weekly cron (Sun 03:00 UTC) | Yes | Yes | No | No | No |

## Concurrency

The pipeline uses concurrency groups to cancel in-progress runs when a new commit is pushed to the same branch. This saves CI minutes on rapid iteration.

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Running Locally

### Full CI Mirror

```bash
bash scripts/ci-local.sh
```

Mirrors the full pipeline: lint → typecheck → test:coverage → build → burn-in (3x).

### Burn-In Changed Tests

```bash
# Default: 5 iterations, compare to main
bash scripts/burn-in-changed.sh

# Custom: 10 iterations, compare to develop
bash scripts/burn-in-changed.sh 10 develop
```

Detects changed test files via `git diff` and runs them multiple times.

## Debugging Failed CI Runs

### 1. Check the failed job

Go to the GitHub Actions tab → click the failed workflow run → expand the failed step.

### 2. Download coverage artifact

If the test job failed, download the `coverage-report` artifact from the workflow run to see the HTML coverage report locally.

### 3. Mirror locally

```bash
bash scripts/ci-local.sh
```

### 4. Common failures

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Lint fails | ESLint rule violation | `npm run lint:fix` |
| Typecheck fails | TypeScript error | `npm run typecheck` locally |
| Tests fail | Test regression | Run `npm test` locally, check env vars |
| Coverage below threshold | Insufficient test coverage | Add tests for uncovered code |
| Burn-in fails | Flaky test detected | Fix non-deterministic test behavior |
| Build fails | TypeScript compilation error | Check `npm run build` locally |

### 5. Environment variables

CI uses test-safe dummy values for all external service credentials. If tests fail due to missing env vars, check the `env:` block in `ci.yml`.

## Future: Parallel Sharding

When the test suite exceeds 3 minutes execution time, enable parallel sharding by uncommenting the `test-sharded` job in `ci.yml`. Vitest supports native sharding:

```bash
npx vitest run --shard=1/4  # Run 1st quarter of tests
npx vitest run --shard=2/4  # Run 2nd quarter of tests
```

Current status: 1452 tests in ~50 seconds - sharding not needed yet.

## Secrets

See [ci-secrets-checklist.md](ci-secrets-checklist.md) for required secrets configuration.
