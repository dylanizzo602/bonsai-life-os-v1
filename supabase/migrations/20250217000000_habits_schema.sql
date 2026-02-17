-- Migration: Create habits and habit_entries tables for habit tracking
-- Habits have name, frequency, optional reminder link; habit_entries store completed/skipped per day

-- Habits table: main habit entity with frequency, reminder, and color
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'times_per_day', 'every_x_days')) DEFAULT 'daily',
  frequency_target INT,
  add_to_todos BOOLEAN DEFAULT FALSE,
  reminder_time TEXT,
  reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
  color TEXT DEFAULT 'green',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habit entries: one row per habit per day; no row = open, status = completed or skipped
CREATE TABLE IF NOT EXISTS habit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(habit_id, entry_date)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_sort_order ON habits(sort_order);
CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_id ON habit_entries(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_date ON habit_entries(habit_id, entry_date);

-- Trigger to update updated_at on habit updates
CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
