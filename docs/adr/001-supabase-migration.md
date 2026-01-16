# ADR-001: Supabase Migration Plan

## Status

**Proposed** - Documented for future implementation

## Date

2026-01-15

## Context

The ENEOS Sales Automation system currently uses **Google Sheets** as its primary database. While this works well for the MVP phase, we anticipate scaling challenges as the system grows.

### Current Architecture
- **Database**: Google Sheets (3 sheets: Leads, Deduplication_Log, Sales_Team)
- **Primary Key**: Row number (mutable, problematic for references)
- **Integrations**: LINE Postback uses row numbers to identify leads

### Problems with Google Sheets at Scale
1. **Performance**: Degrades with >5,000 rows
2. **Concurrency**: Limited concurrent access (quota limits)
3. **Queries**: No complex queries, filtering done in-memory
4. **Real-time**: No real-time subscriptions
5. **Row Number Instability**: Deleting rows breaks references

### Preparation Completed (2026-01-15)
UUID Migration Preparation story completed:
- Added `Lead_UUID` column (format: `lead_<uuid>`)
- Added `created_at`, `updated_at` timestamps (ISO 8601)
- LINE Postback now supports both `row_id` (legacy) and `lead_id` (UUID)
- `findLeadByUUID()` function implemented
- All 476 tests passing

## Decision

Migrate from Google Sheets to **Supabase** when trigger conditions are met.

### Why Supabase?

| Criteria | Google Sheets | Supabase |
|----------|---------------|----------|
| Performance | Degrades >5K rows | Scales to millions |
| Queries | In-memory filtering | PostgreSQL full power |
| Real-time | Polling only | Built-in subscriptions |
| Concurrency | Limited | Unlimited connections |
| Cost | Free | Free tier generous |
| Auth | Manual | Built-in Row Level Security |
| API | REST only | REST + GraphQL + Realtime |

### Alternatives Considered

1. **Firebase/Firestore**: NoSQL, less flexible for analytics
2. **PlanetScale**: MySQL, good but less features than Supabase
3. **MongoDB Atlas**: NoSQL, overkill for this use case
4. **Raw PostgreSQL**: More setup, less features out of box

**Decision: Supabase** - Best balance of features, cost, and developer experience.

## Trigger Conditions

Migrate when ANY of these conditions are met:

| Trigger | Threshold | Current |
|---------|-----------|---------|
| Lead volume | > 5,000 rows | ~200 |
| Team size | > 5 concurrent users | 2 |
| Real-time need | Required for LIFF | Not yet |
| Complex queries | Analytics dashboard | Basic |
| Mobile app | LIFF with offline | Not yet |

## Migration Phases

### Phase 0: Preparation (COMPLETED)
- [x] Add UUID column to Leads sheet
- [x] Add timestamp columns (created_at, updated_at)
- [x] Update LINE Postback to use UUID
- [x] Implement findLeadByUUID()
- [x] All tests passing (476)

### Phase 1: Setup & Dual-Write
- [ ] Create Supabase project
- [ ] Design PostgreSQL schema
- [ ] Implement Repository Pattern abstraction
- [ ] Enable dual-write (Sheets + Supabase)
- [ ] Keep reads from Sheets

### Phase 2: Data Sync & Validation
- [ ] Write migration script using UUID matching
- [ ] Migrate historical data
- [ ] Validate 100% data consistency
- [ ] Monitor for discrepancies

### Phase 3: Read Migration
- [ ] Switch read operations to Supabase
- [ ] Keep Sheets as backup/audit log
- [ ] Monitor performance improvements

### Phase 4: Full Cutover
- [ ] Disable dual-write
- [ ] Archive Sheets data
- [ ] Supabase is sole database
- [ ] Update documentation

## Consequences

### Positive
- Unlimited scalability
- Real-time subscriptions for LIFF
- Complex SQL queries for analytics
- Built-in authentication (Row Level Security)
- Better developer experience
- Automatic backups

### Negative
- Migration effort required
- New dependency to manage
- Team learning curve for Supabase
- Potential cost at very high scale

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during migration | UUID matching + validation script |
| LINE integration breaks | Dual-write period, gradual rollout |
| Supabase downtime | Keep Sheets backup initially |
| Cost overrun | Monitor usage, stay on free tier |

## Related Documents

- [Supabase Migration Roadmap](../future/supabase-migration-roadmap.md)
- [UUID Migration Preparation Story](_bmad-output/implementation-artifacts/stories/uuid-migration-preparation.md)
- [CLAUDE.md](../../CLAUDE.md) - Current system documentation

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-15 | Initial ADR created | Party Mode (Winston, Amelia, Bob, Mary) |
