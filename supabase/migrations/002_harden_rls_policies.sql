-- ============================================================
-- Migration 002: Harden RLS Policies
-- Epic 9 Retrospective Action Item #4
-- ============================================================
-- Context: Initial schema (001) used allow-all RLS policies.
-- This migration replaces them with deny-all for anon key.
-- The service_role key (used by our Express backend) bypasses RLS entirely.
-- These policies are defense-in-depth: if anon key leaks, data is protected.
-- ============================================================

-- Drop existing allow-all policies
DROP POLICY IF EXISTS "Allow all for service role" ON leads;
DROP POLICY IF EXISTS "Allow all for service role" ON dedup_log;
DROP POLICY IF EXISTS "Allow all for service role" ON sales_team;
DROP POLICY IF EXISTS "Allow all for service role" ON status_history;
DROP POLICY IF EXISTS "Allow all for service role" ON campaign_events;
DROP POLICY IF EXISTS "Allow all for service role" ON campaign_stats;

-- Create deny-all policies for anon/authenticated roles
-- Service role key always bypasses RLS, so backend operations are unaffected.
-- If a LIFF app or client-side access is added later, add specific policies then.

CREATE POLICY "Deny all for anon" ON leads
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Deny all for anon" ON dedup_log
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Deny all for anon" ON sales_team
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Deny all for anon" ON status_history
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Deny all for anon" ON campaign_events
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Deny all for anon" ON campaign_stats
  FOR ALL USING (false) WITH CHECK (false);
