-- Migration: Add icon_name and category to goals for New Goal modal

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS icon_name TEXT NOT NULL DEFAULT 'potted_plant',
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (
    category IS NULL OR category IN (
      'health',
      'relationships',
      'work',
      'play',
      'personal_growth',
      'finance',
      'community',
      'other'
    )
  );

COMMENT ON COLUMN goals.icon_name IS 'Material Symbols icon name for goal display';
COMMENT ON COLUMN goals.category IS 'Life-area category aligned with identity categories';
