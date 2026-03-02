-- Migration: Reset all user data (wipe app content tables)
-- Purpose: Remove all tasks, habits, goals, notes, reminders, tags, inbox items, reflections,
--          saved views, and all dependent/join rows so no data remains linked to any users.
-- Notes:
-- - This does NOT delete Supabase auth users (auth.users).
-- - This is destructive and intended for dev/test resets.

BEGIN;

-- Storage note: Direct deletion from storage tables is not allowed in migrations.
-- If you want to wipe attachments too, do it via the Storage API (or Supabase dashboard),
-- e.g. delete all objects in the 'task-attachments' bucket.

-- Wipe all application tables (CASCADE clears dependent FK rows safely).
TRUNCATE TABLE
  task_checklist_items,
  task_checklists,
  task_dependencies,
  task_tags,
  tags,
  tasks,
  goal_history,
  goal_habits,
  goal_milestones,
  goals,
  habit_entries,
  habits,
  reminders,
  reflection_entries,
  inbox_items,
  saved_views,
  notes
RESTART IDENTITY
CASCADE;

COMMIT;

