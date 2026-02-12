-- Migration 004: Normalize legacy 'sales' role to 'viewer'
-- Story 13-1 AC-5: UI/API only accept admin|viewer going forward
-- Cleans up existing data to prevent inconsistency

UPDATE sales_team SET role = 'viewer' WHERE role = 'sales';

-- Add CHECK constraint to prevent future invalid roles
ALTER TABLE sales_team ADD CONSTRAINT sales_team_role_check CHECK (role IN ('admin', 'viewer'));
