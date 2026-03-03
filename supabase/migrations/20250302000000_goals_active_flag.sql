-- Migration: Add is_active flag to goals for active/inactive categorization
-- Active goals show up in widgets/briefings; inactive goals stay only in the Goals section.

-- Add is_active column with default TRUE so existing goals remain active
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Index to efficiently filter goals by user and active state
CREATE INDEX IF NOT EXISTS idx_goals_user_id_is_active
  ON goals(user_id, is_active);

