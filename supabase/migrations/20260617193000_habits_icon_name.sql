-- Migration: Add icon_name to habits for Material icon picker in Add/Edit Habit modal
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS icon_name TEXT NOT NULL DEFAULT 'spa';

COMMENT ON COLUMN habits.icon_name IS 'Material Symbols icon name for habit display';
