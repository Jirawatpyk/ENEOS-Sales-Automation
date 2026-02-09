-- ===========================================
-- ENEOS Sales Automation - Initial Schema
-- Migration: 001_initial_schema.sql
-- Date: 2026-02-09
-- Source: ADR-002-supabase-migration.md
-- ===========================================

-- ===========================================
-- Table 1: leads
-- ===========================================
CREATE TABLE leads (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  phone         TEXT DEFAULT '',
  company       TEXT DEFAULT '',
  industry_ai   TEXT DEFAULT '',
  website       TEXT,
  capital       TEXT,
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','claimed','contacted','closed','lost','unreachable')),
  sales_owner_id   TEXT,
  sales_owner_name TEXT,
  workflow_id        TEXT DEFAULT '',
  brevo_campaign_id  TEXT,
  campaign_name      TEXT DEFAULT '',
  email_subject      TEXT DEFAULT '',
  source             TEXT DEFAULT 'Brevo',
  lead_id    TEXT DEFAULT '',
  event_id   TEXT DEFAULT '',
  clicked_at TIMESTAMPTZ,
  talking_point TEXT,
  closed_at      TIMESTAMPTZ,
  lost_at        TIMESTAMPTZ,
  unreachable_at TIMESTAMPTZ,
  contacted_at   TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  lead_source TEXT,
  job_title   TEXT,
  city        TEXT,
  juristic_id  TEXT,
  dbd_sector   TEXT,
  province     TEXT,
  full_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- Table 2: dedup_log
-- ===========================================
CREATE TABLE dedup_log (
  key          TEXT PRIMARY KEY,
  info         TEXT,
  source       TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- Table 3: sales_team
-- ===========================================
CREATE TABLE sales_team (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT UNIQUE,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE,
  phone        TEXT,
  role         TEXT NOT NULL DEFAULT 'sales'
               CHECK (role IN ('admin', 'sales')),
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'inactive')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- Table 4: status_history
-- ===========================================
CREATE TABLE status_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  changed_by_id   TEXT,
  changed_by_name TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- Table 5: campaign_events
-- ===========================================
CREATE TABLE campaign_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      TEXT NOT NULL,
  campaign_id   TEXT NOT NULL,
  campaign_name TEXT,
  email         TEXT NOT NULL,
  event         TEXT NOT NULL,
  event_at      TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  url           TEXT,
  tag           TEXT,
  segment_ids   JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, campaign_id, event)
);

-- ===========================================
-- Table 6: campaign_stats
-- ===========================================
CREATE TABLE campaign_stats (
  campaign_id   TEXT PRIMARY KEY,
  campaign_name TEXT,
  delivered     INTEGER NOT NULL DEFAULT 0,
  opened        INTEGER NOT NULL DEFAULT 0,
  clicked       INTEGER NOT NULL DEFAULT 0,
  unique_opens  INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,
  open_rate     NUMERIC(5,2) NOT NULL DEFAULT 0,
  click_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  hard_bounce   INTEGER NOT NULL DEFAULT 0,
  soft_bounce   INTEGER NOT NULL DEFAULT 0,
  unsubscribe   INTEGER NOT NULL DEFAULT 0,
  spam          INTEGER NOT NULL DEFAULT 0,
  first_event   TIMESTAMPTZ,
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- Trigger: auto-update updated_at on leads
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- Indexes (12 total)
-- ===========================================

-- leads indexes (5)
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_sales_owner ON leads(sales_owner_id) WHERE sales_owner_id IS NOT NULL;
CREATE INDEX idx_leads_brevo_campaign ON leads(brevo_campaign_id) WHERE brevo_campaign_id IS NOT NULL;
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- sales_team indexes (2)
CREATE INDEX idx_sales_team_email ON sales_team(email) WHERE email IS NOT NULL;
CREATE INDEX idx_sales_team_line ON sales_team(line_user_id) WHERE line_user_id IS NOT NULL;

-- status_history indexes (2)
CREATE INDEX idx_status_history_lead ON status_history(lead_id);
CREATE INDEX idx_status_history_created ON status_history(created_at DESC);

-- campaign_events indexes (3)
CREATE INDEX idx_campaign_events_email ON campaign_events(email);
CREATE INDEX idx_campaign_events_campaign ON campaign_events(campaign_id);
CREATE INDEX idx_campaign_events_email_recent ON campaign_events(email, event_at DESC);

-- ===========================================
-- Row Level Security (RLS)
-- ===========================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE dedup_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_stats ENABLE ROW LEVEL SECURITY;

-- Allow-all policies (service role bypasses anyway, but defense-in-depth)
CREATE POLICY "Allow all for service role" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON dedup_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON sales_team FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON status_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON campaign_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON campaign_stats FOR ALL USING (true) WITH CHECK (true);
