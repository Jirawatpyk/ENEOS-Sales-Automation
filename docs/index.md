# ENEOS Sales Automation - Documentation Index

**Generated:** 2026-02-01
**Repository Type:** Multi-part (2 projects)
**Primary Tech:** Express.js 4.21 (Backend) + Next.js 16.1 (Dashboard)

---

## Project Overview

| Part | Type | Root | Tech Stack |
|------|------|------|------------|
| **Backend API** | backend | `eneos-sales-automation/` | Express.js, TypeScript 5.6, Node 20 |
| **Admin Dashboard** | web | `eneos-admin-dashboard/` | Next.js 16, React 19, TypeScript 5 |

**Architecture:** Service-oriented backend with React Query frontend
**Database:** Supabase PostgreSQL (UUID = PK, version = optimistic lock)
**Auth:** Google OAuth (NextAuth.js → Backend JWT validation)

---

## Quick Reference

### Backend API
- **Entry Point:** `src/app.ts`
- **Port:** 3000
- **Tests:** 711 tests (79%+ coverage)
- **Deploy:** Railway, Docker, Render

### Admin Dashboard
- **Entry Point:** `src/app/layout.tsx`
- **Port:** 3001
- **Tests:** 242 unit tests + 4 E2E
- **Deploy:** Vercel-ready (serverless)

---

## Generated Documentation

### Multi-Part Overview
- [Integration Architecture](./integration-architecture.md) - How parts communicate

### Backend API
- [API Contracts - Backend](./api-contracts-backend.md) - 25+ REST endpoints
- [Data Models - Backend](./data-models-backend.md) - Supabase PostgreSQL schema + TypeScript types
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture with diagrams
- [services.md](./services.md) - Business logic layer documentation
- [data-flow.md](./data-flow.md) - Detailed data flow diagrams
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions

### Admin Dashboard
- [Component Inventory](./component-inventory-dashboard.md) - 186 React components + 45 hooks
- [admin-dashboard/architecture.md](./admin-dashboard/architecture.md) - Frontend architecture
- [admin-dashboard/technical-design.md](./admin-dashboard/technical-design.md) - Implementation details
- [admin-dashboard/api-specification.md](./admin-dashboard/api-specification.md) - API specs
- [admin-dashboard/ux-ui.md](./admin-dashboard/ux-ui.md) - UI/UX specifications (137K)

### Diagrams
- [Auth Flow Diagram](./diagrams/auth-flow.md) - Complete authentication sequence diagrams (OAuth, Token Refresh, RBAC)
- [Lead State Machine](./diagrams/lead-state-machine.md) - Lead status lifecycle, transitions, race condition handling
- [Database Schema](./diagrams/database-schema.md) - ER diagram of 6 Supabase tables, relationships, optimistic locking
- [Brevo Webhooks Flow](./diagrams/brevo-webhooks-flow.md) - Workflow Automation + Email Marketing webhooks data flow

### Security & Auth
- [admin-dashboard/security.md](./admin-dashboard/security.md) - Security architecture
- [admin-auth-middleware.md](./admin-auth-middleware.md) - OAuth middleware

### Testing
- [admin-dashboard/testing-strategy.md](./admin-dashboard/testing-strategy.md) - Test strategy
- [brevo-webhook-test.md](./brevo-webhook-test.md) - Webhook testing guide

### CI/CD
- [ci.md](./ci.md) - CI/CD pipeline documentation
- [ci-secrets-checklist.md](./ci-secrets-checklist.md) - Secrets management

### API Reference
- [api-reference.md](./api-reference.md) - Endpoint reference
- [api/api-contract.md](./api/api-contract.md) - Frontend/backend contract

### Planning & Progress
- [admin-dashboard/PROGRESS.md](./admin-dashboard/PROGRESS.md) - Development progress
- [admin-dashboard/epics.md](./admin-dashboard/epics.md) - Epic breakdowns
- [admin-dashboard/CLAUDE-CONTEXT.md](./admin-dashboard/CLAUDE-CONTEXT.md) - AI development context

### Future
- [future/supabase-migration-roadmap.md](./future/supabase-migration-roadmap.md) - Database migration plan
- [adr/001-supabase-migration.md](./adr/001-supabase-migration.md) - Migration ADR

---

## Development Guides

### Getting Started - Backend
```bash
cd eneos-sales-automation
npm install
npm run dev        # Start on :3000
npm test           # Run 711 tests
```

### Getting Started - Dashboard
```bash
cd eneos-admin-dashboard
npm install
npm run dev        # Start on :3001
npm test           # Run unit tests
npm run test:e2e   # Run Playwright E2E
```

---

## Key Technical Details

### ES Modules (Backend)
- All imports require `.js` extension
- Use `import type` for type-only imports
- NodeNext module resolution

### React Query (Dashboard)
- TanStack React Query for server state
- Custom hooks wrap all API calls
- URL state for filters/pagination

### Supabase PostgreSQL Database
- UUID = Primary Key (leads use `lead_<uuid>` format)
- Version column = Optimistic locking
- Parameterized queries via Supabase JS client
- 6 tables: leads, sales_team, status_history, deduplication_log, campaign_events, campaign_stats

### Authentication
- Google OAuth via NextAuth.js (Dashboard)
- ID Token validated by Backend
- Role stored in Supabase sales_team table
- RBAC: admin (full) / viewer (read-only)

---

## For AI Agents

When implementing features in this project:

1. **Read first:** Load relevant documentation before coding
2. **Backend patterns:** Controllers → Services → Utils (thin controllers)
3. **Dashboard patterns:** Components → Hooks → API clients
4. **Testing required:** 75%+ coverage enforced
5. **Type safety:** Strict TypeScript, no `any`

**Primary context files:**
- Backend: `CLAUDE.md`, `project-context.md`
- Dashboard: `CLAUDE.md`, `docs/CLAUDE-CONTEXT.md`

---

*Last Updated: 2026-02-01 (Documentation fixes: Admin API, Services, Auth Middleware)*
