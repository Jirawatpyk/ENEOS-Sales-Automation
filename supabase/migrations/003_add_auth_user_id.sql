-- Migration 003: Add auth_user_id to sales_team
-- Links sales_team rows to Supabase Auth users (auth.users)
-- Story 10-1: Backend Auth Foundation

ALTER TABLE sales_team
  ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id);

CREATE INDEX idx_sales_team_auth_user ON sales_team(auth_user_id)
  WHERE auth_user_id IS NOT NULL;
