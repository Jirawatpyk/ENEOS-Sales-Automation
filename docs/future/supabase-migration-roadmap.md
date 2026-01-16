# Supabase Migration Roadmap

> **Status**: Future Enhancement - Not scheduled
> **ADR**: [001-supabase-migration.md](../adr/001-supabase-migration.md)
> **Last Updated**: 2026-01-15

## Overview

This document provides a detailed technical roadmap for migrating the ENEOS Sales Automation system from Google Sheets to Supabase.

## Prerequisites Completed

### UUID Migration Preparation (2026-01-15)

| Item | Status | Details |
|------|--------|---------|
| Lead_UUID column | ✅ Done | Format: `lead_<uuid>` |
| created_at column | ✅ Done | ISO 8601 timestamp |
| updated_at column | ✅ Done | Auto-updated on changes |
| LINE Postback UUID support | ✅ Done | Both `lead_id` and `row_id` |
| findLeadByUUID() | ✅ Done | O(n) lookup, optimize later |
| Test coverage | ✅ Done | 476 tests passing |

## Trigger Conditions

Start migration when ANY condition is met:

```yaml
triggers:
  lead_volume:
    threshold: 5000
    current: ~200
    check: "Count rows in Leads sheet"

  concurrent_users:
    threshold: 5
    current: 2
    check: "Active sales team members"

  realtime_required:
    threshold: true
    current: false
    check: "LIFF app needs real-time updates"

  complex_analytics:
    threshold: true
    current: false
    check: "Dashboard needs SQL aggregations"
```

---

## Phase 1: Setup & Dual-Write

### 1.1 Supabase Project Setup

```bash
# Create project at supabase.com
# Save credentials to .env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # For backend only
```

### 1.2 PostgreSQL Schema

```sql
-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid VARCHAR(50) UNIQUE NOT NULL,  -- For migration matching

  -- Core fields
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(255),

  -- AI Analysis
  industry_ai VARCHAR(255),
  website VARCHAR(500),
  capital VARCHAR(100),
  talking_point TEXT,

  -- Status & Ownership
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  sales_owner_id VARCHAR(50),
  sales_owner_name VARCHAR(255),

  -- Campaign
  campaign_id VARCHAR(50),
  campaign_name VARCHAR(255),
  email_subject VARCHAR(500),
  source VARCHAR(50) DEFAULT 'Brevo',

  -- Brevo Integration
  brevo_lead_id VARCHAR(50),
  event_id VARCHAR(50),
  clicked_at TIMESTAMPTZ,

  -- Status Timestamps
  closed_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  unreachable_at TIMESTAMPTZ,

  -- Contact Attributes
  lead_source VARCHAR(100),
  job_title VARCHAR(255),
  city VARCHAR(100),

  -- Metadata
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_lead_uuid ON leads(lead_uuid);
CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX idx_leads_sales_owner ON leads(sales_owner_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Deduplication Log
CREATE TABLE deduplication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  campaign_id VARCHAR(50),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sales Team
CREATE TABLE sales_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(20) DEFAULT 'sales',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_team ENABLE ROW LEVEL SECURITY;

-- Policies (adjust based on auth strategy)
CREATE POLICY "Service role can do everything" ON leads
  FOR ALL USING (auth.role() = 'service_role');
```

### 1.3 Repository Pattern Implementation

```typescript
// src/repositories/lead.repository.ts
export interface ILeadRepository {
  addLead(lead: Partial<Lead>): Promise<number>;
  getRow(rowNumber: number): Promise<LeadRow | null>;
  findByUUID(uuid: string): Promise<LeadRow | null>;
  updateWithLock(rowNumber: number, updates: Partial<Lead>): Promise<LeadRow>;
  claimLead(rowNumber: number, userId: string, userName: string, status: LeadStatus): Promise<ClaimResult>;
  // ... other methods
}

// src/repositories/sheets.lead.repository.ts
export class SheetsLeadRepository implements ILeadRepository {
  // Current implementation (extract from sheets.service.ts)
}

// src/repositories/supabase.lead.repository.ts
export class SupabaseLeadRepository implements ILeadRepository {
  // New Supabase implementation
}

// src/repositories/dual-write.lead.repository.ts
export class DualWriteLeadRepository implements ILeadRepository {
  constructor(
    private sheets: SheetsLeadRepository,
    private supabase: SupabaseLeadRepository
  ) {}

  async addLead(lead: Partial<Lead>): Promise<number> {
    // Write to both, return Sheets row number
    const [sheetsRow] = await Promise.all([
      this.sheets.addLead(lead),
      this.supabase.addLead(lead)
    ]);
    return sheetsRow;
  }
}
```

### 1.4 Configuration Switch

```typescript
// src/config/index.ts
export const config = {
  // ... existing config

  database: {
    provider: process.env.DB_PROVIDER || 'sheets', // 'sheets' | 'supabase' | 'dual-write'
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  }
};

// src/services/index.ts
function createLeadRepository(): ILeadRepository {
  switch (config.database.provider) {
    case 'supabase':
      return new SupabaseLeadRepository();
    case 'dual-write':
      return new DualWriteLeadRepository(
        new SheetsLeadRepository(),
        new SupabaseLeadRepository()
      );
    default:
      return new SheetsLeadRepository();
  }
}
```

---

## Phase 2: Data Sync & Validation

### 2.1 Migration Script

```typescript
// scripts/migrate-to-supabase.ts
async function migrateLeads() {
  const sheetsService = new SheetsService();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get all leads from Sheets
  const leads = await sheetsService.getAllLeads();

  console.log(`Migrating ${leads.length} leads...`);

  for (const lead of leads) {
    // Use lead_uuid for matching
    const { data, error } = await supabase
      .from('leads')
      .upsert({
        lead_uuid: lead.leadUUID,
        email: lead.email,
        // ... map all fields
      }, {
        onConflict: 'lead_uuid'
      });

    if (error) {
      console.error(`Failed to migrate lead ${lead.leadUUID}:`, error);
    }
  }
}
```

### 2.2 Validation Script

```typescript
// scripts/validate-migration.ts
async function validateMigration() {
  const sheetsLeads = await sheetsService.getAllLeads();
  const { data: supabaseLeads } = await supabase.from('leads').select('*');

  const mismatches: string[] = [];

  for (const sheetLead of sheetsLeads) {
    const supabaseLead = supabaseLeads.find(l => l.lead_uuid === sheetLead.leadUUID);

    if (!supabaseLead) {
      mismatches.push(`Missing in Supabase: ${sheetLead.leadUUID}`);
      continue;
    }

    // Compare fields
    if (sheetLead.email !== supabaseLead.email) {
      mismatches.push(`Email mismatch for ${sheetLead.leadUUID}`);
    }
    // ... compare other fields
  }

  console.log(`Validation complete: ${mismatches.length} mismatches found`);
  return mismatches;
}
```

---

## Phase 3: Read Migration

### 3.1 Switch Read Operations

```typescript
// Update config
DB_PROVIDER=supabase  // or use feature flag

// SupabaseLeadRepository handles all reads
// SheetsLeadRepository still receives writes (optional backup)
```

### 3.2 Performance Monitoring

```typescript
// Add latency tracking
async findByUUID(uuid: string): Promise<LeadRow | null> {
  const start = Date.now();
  const result = await this.supabase
    .from('leads')
    .select('*')
    .eq('lead_uuid', uuid)
    .single();

  metrics.dbLatency.observe(Date.now() - start);
  return result.data;
}
```

---

## Phase 4: Full Cutover

### 4.1 Disable Dual-Write

```bash
# .env
DB_PROVIDER=supabase
```

### 4.2 Archive Sheets Data

```typescript
// Keep Sheets as read-only archive
// Or export to CSV/backup storage
```

### 4.3 Update Documentation

- Update CLAUDE.md
- Update API docs
- Update deployment guides

---

## Estimated Effort

| Phase | Stories | Effort |
|-------|---------|--------|
| Phase 0 | UUID Preparation | ✅ Done |
| Phase 1 | Setup + Dual-Write | 3-4 stories |
| Phase 2 | Data Sync + Validation | 2 stories |
| Phase 3 | Read Migration | 1-2 stories |
| Phase 4 | Full Cutover | 1 story |
| **Total** | | **7-9 stories** |

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss | Low | High | UUID matching, validation script |
| LINE breaks | Medium | High | Dual-write period, gradual rollout |
| Downtime | Low | Medium | Feature flag, instant rollback |
| Performance regression | Low | Medium | Monitoring, benchmarks |

---

## Success Criteria

- [ ] Zero data loss during migration
- [ ] All 476+ tests passing
- [ ] LINE Postback works with Supabase
- [ ] Query latency < 100ms (p95)
- [ ] No increase in error rate

---

## References

- [ADR-001: Supabase Migration](../adr/001-supabase-migration.md)
- [Supabase Documentation](https://supabase.com/docs)
- [UUID Migration Story](../../_bmad-output/implementation-artifacts/stories/uuid-migration-preparation.md)
