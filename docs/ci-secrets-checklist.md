# CI Secrets Checklist

## Required Secrets

Configure these in **GitHub → Repository Settings → Secrets and variables → Actions**.

### Production Deployment

| Secret | Required By | Description |
|--------|------------|-------------|
| `RAILWAY_TOKEN` | `deploy-railway` job | Railway deployment token |

### Test Environment (NOT secrets - hardcoded in CI)

The following values are **hardcoded as dummy test values** in `ci.yml` and do NOT need to be configured as secrets:

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `test` | Test mode |
| `BREVO_WEBHOOK_SECRET` | `test-secret` | Brevo webhook validation (mocked) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `test@test.iam...` | Google Sheets (mocked) |
| `GOOGLE_PRIVATE_KEY` | `test-key` | Google auth (mocked) |
| `GOOGLE_SHEET_ID` | `test-sheet-id` | Sheet ID (mocked) |
| `GEMINI_API_KEY` | `test-api-key` | Gemini AI (mocked) |
| `LINE_CHANNEL_ACCESS_TOKEN` | `test-token` | LINE SDK (mocked) |
| `LINE_CHANNEL_SECRET` | `test-secret` | LINE signature (mocked) |
| `LINE_GROUP_ID` | `test-group-id` | LINE group (mocked) |

These are safe because all external services are mocked in tests.

## Optional Secrets (Future)

| Secret | Required By | Description |
|--------|------------|-------------|
| `RENDER_API_KEY` | `deploy-render` (commented out) | Render deployment |
| `RENDER_SERVICE_ID` | `deploy-render` (commented out) | Render service ID |
| `SLACK_WEBHOOK` | Notifications (not configured) | Slack failure alerts |
| `CODECOV_TOKEN` | Coverage upload (not configured) | Codecov integration |

## Security Best Practices

1. **Never commit secrets** - Use GitHub Secrets, not `.env` files in CI
2. **Least privilege** - Railway token should be scoped to this project only
3. **Rotate regularly** - Rotate deployment tokens quarterly
4. **Audit access** - Review who has access to repository secrets
5. **No secrets in logs** - CI config uses `${{ secrets.* }}` which are masked in logs
