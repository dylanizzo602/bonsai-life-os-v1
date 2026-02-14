-- Migration: Create saved_views table for custom task views (filter + sort + name per user)
-- Used by the Custom view dropdown: save and load named filter/sort combinations

CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  filter_json JSONB,
  sort_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON saved_views(user_id);
