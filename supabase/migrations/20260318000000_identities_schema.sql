-- Migration: Identity categories and badge metadata
-- Identities represent user "badge" cards (Health, Relationships, etc.) that can hold 3 active goal/habit slots.

-- Note: Categories are stored as slugs (snake_case) for stable references.
CREATE TABLE IF NOT EXISTS identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),

  -- One identity per category per user
  category TEXT NOT NULL CHECK (
    category IN (
      'health',
      'relationships',
      'work',
      'play',
      'personal_growth',
      'finance',
      'community',
      'other'
    )
  ),

  -- Badge metadata (for categories except 'other')
  badge_storage_path TEXT,
  badge_url TEXT,

  -- Display identity name + description (shown on the flip card)
  name TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Active/passive group toggle in the UI (not the same concept as goals.is_active).
  is_active BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, category)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_identities_user_id ON identities(user_id);
CREATE INDEX IF NOT EXISTS idx_identities_user_id_is_active ON identities(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_identities_category ON identities(category);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_identities_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on identity updates
DROP TRIGGER IF EXISTS update_identities_updated_at ON identities;
CREATE TRIGGER update_identities_updated_at
  BEFORE UPDATE ON identities
  FOR EACH ROW
  EXECUTE FUNCTION update_identities_updated_at_column();

-- =========================
-- RLS: user-scoped identities
-- =========================
ALTER TABLE identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS identities_select_own ON identities;
DROP POLICY IF EXISTS identities_insert_own ON identities;
DROP POLICY IF EXISTS identities_update_own ON identities;
DROP POLICY IF EXISTS identities_delete_own ON identities;

CREATE POLICY identities_select_own
ON identities
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY identities_insert_own
ON identities
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY identities_update_own
ON identities
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY identities_delete_own
ON identities
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

