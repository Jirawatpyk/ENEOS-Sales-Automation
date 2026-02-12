-- Migration 004: Normalize legacy 'sales' role to 'viewer'
-- Story 13-1 AC-5: UI/API only accept admin|viewer going forward
-- Cleans up existing data and constraints to prevent inconsistency
--
-- IMPORTANT: migration 001 created an inline CHECK (role IN ('admin', 'sales'))
-- which PostgreSQL auto-names 'sales_team_role_check'. We must drop it first.

-- Step 1: Drop the original inline CHECK constraint from migration 001
ALTER TABLE sales_team DROP CONSTRAINT sales_team_role_check;

-- Step 2: Change column DEFAULT from 'sales' to 'viewer'
-- Without this, ensureSalesTeamMember() (LINE auto-create) would use DEFAULT 'sales'
-- which violates the new CHECK constraint
ALTER TABLE sales_team ALTER COLUMN role SET DEFAULT 'viewer';

-- Step 3: Normalize existing 'sales' rows to 'viewer'
UPDATE sales_team SET role = 'viewer' WHERE role = 'sales';

-- Step 4: Add new CHECK constraint (same name, updated values)
ALTER TABLE sales_team ADD CONSTRAINT sales_team_role_check CHECK (role IN ('admin', 'viewer'));
