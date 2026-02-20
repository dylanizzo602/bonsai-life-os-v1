-- Migration: Create reflection_entries table for morning briefings and other reflection types
-- Used by Briefing section (morning_briefing) and listed in Reflections section

CREATE TABLE IF NOT EXISTS reflection_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  type TEXT NOT NULL DEFAULT 'morning_briefing',
  title TEXT,
  responses JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reflection_entries_user_id ON reflection_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_reflection_entries_created_at ON reflection_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reflection_entries_user_created ON reflection_entries(user_id, created_at DESC);
