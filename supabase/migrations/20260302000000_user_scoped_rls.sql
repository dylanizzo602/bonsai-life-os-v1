-- Migration: Enforce user-scoped data via RLS across app tables
-- Goal: Ensure data is never shared between accounts by defaulting user_id to auth.uid()
--       and applying RLS policies to all tables (including join/child tables).

-- =========================
-- 1) Ensure user_id columns + defaults
-- =========================

-- Notes: previously single-user; add ownership column
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- Default user_id to current authenticated user for new rows
ALTER TABLE tasks
  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE goals
  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE habits
  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE reminders
  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE tags
  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE reflection_entries
  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE inbox_items
  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE saved_views
  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE notes
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Helpful indexes for user-scoped reads
CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, updated_at DESC);

-- =========================
-- 2) Enable Row Level Security
-- =========================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- =========================
-- 3) Drop legacy policies (idempotent)
-- =========================

-- Tasks + related
DROP POLICY IF EXISTS "tasks_select_own" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_own" ON tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON tasks;

DROP POLICY IF EXISTS "task_checklists_select_own" ON task_checklists;
DROP POLICY IF EXISTS "task_checklists_insert_own" ON task_checklists;
DROP POLICY IF EXISTS "task_checklists_update_own" ON task_checklists;
DROP POLICY IF EXISTS "task_checklists_delete_own" ON task_checklists;

DROP POLICY IF EXISTS "task_checklist_items_select_own" ON task_checklist_items;
DROP POLICY IF EXISTS "task_checklist_items_insert_own" ON task_checklist_items;
DROP POLICY IF EXISTS "task_checklist_items_update_own" ON task_checklist_items;
DROP POLICY IF EXISTS "task_checklist_items_delete_own" ON task_checklist_items;

DROP POLICY IF EXISTS "task_dependencies_select_own" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_insert_own" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_delete_own" ON task_dependencies;

DROP POLICY IF EXISTS "tags_select_own" ON tags;
DROP POLICY IF EXISTS "tags_insert_own" ON tags;
DROP POLICY IF EXISTS "tags_update_own" ON tags;
DROP POLICY IF EXISTS "tags_delete_own" ON tags;

DROP POLICY IF EXISTS "task_tags_select_own" ON task_tags;
DROP POLICY IF EXISTS "task_tags_insert_own" ON task_tags;
DROP POLICY IF EXISTS "task_tags_delete_own" ON task_tags;

-- Goals + related
DROP POLICY IF EXISTS "goals_select_own" ON goals;
DROP POLICY IF EXISTS "goals_insert_own" ON goals;
DROP POLICY IF EXISTS "goals_update_own" ON goals;
DROP POLICY IF EXISTS "goals_delete_own" ON goals;

DROP POLICY IF EXISTS "goal_milestones_select_own" ON goal_milestones;
DROP POLICY IF EXISTS "goal_milestones_insert_own" ON goal_milestones;
DROP POLICY IF EXISTS "goal_milestones_update_own" ON goal_milestones;
DROP POLICY IF EXISTS "goal_milestones_delete_own" ON goal_milestones;

DROP POLICY IF EXISTS "goal_habits_select_own" ON goal_habits;
DROP POLICY IF EXISTS "goal_habits_insert_own" ON goal_habits;
DROP POLICY IF EXISTS "goal_habits_delete_own" ON goal_habits;

DROP POLICY IF EXISTS "goal_history_select_own" ON goal_history;
DROP POLICY IF EXISTS "goal_history_insert_own" ON goal_history;

-- Habits + related
DROP POLICY IF EXISTS "habits_select_own" ON habits;
DROP POLICY IF EXISTS "habits_insert_own" ON habits;
DROP POLICY IF EXISTS "habits_update_own" ON habits;
DROP POLICY IF EXISTS "habits_delete_own" ON habits;

DROP POLICY IF EXISTS "habit_entries_select_own" ON habit_entries;
DROP POLICY IF EXISTS "habit_entries_insert_own" ON habit_entries;
DROP POLICY IF EXISTS "habit_entries_update_own" ON habit_entries;
DROP POLICY IF EXISTS "habit_entries_delete_own" ON habit_entries;

-- Other user-scoped tables
DROP POLICY IF EXISTS "reminders_select_own" ON reminders;
DROP POLICY IF EXISTS "reminders_insert_own" ON reminders;
DROP POLICY IF EXISTS "reminders_update_own" ON reminders;
DROP POLICY IF EXISTS "reminders_delete_own" ON reminders;

DROP POLICY IF EXISTS "reflection_entries_select_own" ON reflection_entries;
DROP POLICY IF EXISTS "reflection_entries_insert_own" ON reflection_entries;
DROP POLICY IF EXISTS "reflection_entries_delete_own" ON reflection_entries;

DROP POLICY IF EXISTS "inbox_items_select_own" ON inbox_items;
DROP POLICY IF EXISTS "inbox_items_insert_own" ON inbox_items;
DROP POLICY IF EXISTS "inbox_items_update_own" ON inbox_items;
DROP POLICY IF EXISTS "inbox_items_delete_own" ON inbox_items;

DROP POLICY IF EXISTS "saved_views_select_own" ON saved_views;
DROP POLICY IF EXISTS "saved_views_insert_own" ON saved_views;
DROP POLICY IF EXISTS "saved_views_update_own" ON saved_views;
DROP POLICY IF EXISTS "saved_views_delete_own" ON saved_views;

DROP POLICY IF EXISTS "notes_select_own" ON notes;
DROP POLICY IF EXISTS "notes_insert_own" ON notes;
DROP POLICY IF EXISTS "notes_update_own" ON notes;
DROP POLICY IF EXISTS "notes_delete_own" ON notes;

-- =========================
-- 4) Create RLS policies (authenticated users only)
-- =========================

-- Tasks: owner-only access
CREATE POLICY "tasks_select_own"
ON tasks
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "tasks_insert_own"
ON tasks
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "tasks_update_own"
ON tasks
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "tasks_delete_own"
ON tasks
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Task checklists: visible only if parent task belongs to user
CREATE POLICY "task_checklists_select_own"
ON task_checklists
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_checklists.task_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "task_checklists_insert_own"
ON task_checklists
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_checklists.task_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "task_checklists_update_own"
ON task_checklists
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_checklists.task_id
      AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_checklists.task_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "task_checklists_delete_own"
ON task_checklists
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_checklists.task_id
      AND t.user_id = auth.uid()
  )
);

-- Checklist items: visible only if checklist belongs to a user-owned task
CREATE POLICY "task_checklist_items_select_own"
ON task_checklist_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM task_checklists c
    JOIN tasks t ON t.id = c.task_id
    WHERE c.id = task_checklist_items.checklist_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "task_checklist_items_insert_own"
ON task_checklist_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM task_checklists c
    JOIN tasks t ON t.id = c.task_id
    WHERE c.id = task_checklist_items.checklist_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "task_checklist_items_update_own"
ON task_checklist_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM task_checklists c
    JOIN tasks t ON t.id = c.task_id
    WHERE c.id = task_checklist_items.checklist_id
      AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM task_checklists c
    JOIN tasks t ON t.id = c.task_id
    WHERE c.id = task_checklist_items.checklist_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "task_checklist_items_delete_own"
ON task_checklist_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM task_checklists c
    JOIN tasks t ON t.id = c.task_id
    WHERE c.id = task_checklist_items.checklist_id
      AND t.user_id = auth.uid()
  )
);

-- Task dependencies: both tasks must belong to user
CREATE POLICY "task_dependencies_select_own"
ON task_dependencies
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_dependencies.blocker_id AND t.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_dependencies.blocked_id AND t.user_id = auth.uid())
);

CREATE POLICY "task_dependencies_insert_own"
ON task_dependencies
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_dependencies.blocker_id AND t.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_dependencies.blocked_id AND t.user_id = auth.uid())
);

CREATE POLICY "task_dependencies_delete_own"
ON task_dependencies
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_dependencies.blocker_id AND t.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_dependencies.blocked_id AND t.user_id = auth.uid())
);

-- Tags: owner-only access
CREATE POLICY "tags_select_own"
ON tags
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "tags_insert_own"
ON tags
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "tags_update_own"
ON tags
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "tags_delete_own"
ON tags
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Task tags junction: both task and tag must belong to user
CREATE POLICY "task_tags_select_own"
ON task_tags
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_tags.task_id AND t.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM tags g WHERE g.id = task_tags.tag_id AND g.user_id = auth.uid())
);

CREATE POLICY "task_tags_insert_own"
ON task_tags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_tags.task_id AND t.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM tags g WHERE g.id = task_tags.tag_id AND g.user_id = auth.uid())
);

CREATE POLICY "task_tags_delete_own"
ON task_tags
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_tags.task_id AND t.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM tags g WHERE g.id = task_tags.tag_id AND g.user_id = auth.uid())
);

-- Goals: owner-only access
CREATE POLICY "goals_select_own"
ON goals
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "goals_insert_own"
ON goals
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "goals_update_own"
ON goals
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "goals_delete_own"
ON goals
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Goal milestones/history/habit links: visible only if parent goal belongs to user
CREATE POLICY "goal_milestones_select_own"
ON goal_milestones
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()));

CREATE POLICY "goal_milestones_insert_own"
ON goal_milestones
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()));

CREATE POLICY "goal_milestones_update_own"
ON goal_milestones
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()));

CREATE POLICY "goal_milestones_delete_own"
ON goal_milestones
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()));

CREATE POLICY "goal_history_select_own"
ON goal_history
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_history.goal_id AND g.user_id = auth.uid()));

CREATE POLICY "goal_history_insert_own"
ON goal_history
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_history.goal_id AND g.user_id = auth.uid()));

CREATE POLICY "goal_habits_select_own"
ON goal_habits
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_habits.goal_id AND g.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM habits h WHERE h.id = goal_habits.habit_id AND h.user_id = auth.uid())
);

CREATE POLICY "goal_habits_insert_own"
ON goal_habits
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_habits.goal_id AND g.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM habits h WHERE h.id = goal_habits.habit_id AND h.user_id = auth.uid())
);

CREATE POLICY "goal_habits_delete_own"
ON goal_habits
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_habits.goal_id AND g.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM habits h WHERE h.id = goal_habits.habit_id AND h.user_id = auth.uid())
);

-- Habits: owner-only access
CREATE POLICY "habits_select_own"
ON habits
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "habits_insert_own"
ON habits
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "habits_update_own"
ON habits
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "habits_delete_own"
ON habits
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Habit entries: visible only if parent habit belongs to user
CREATE POLICY "habit_entries_select_own"
ON habit_entries
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM habits h WHERE h.id = habit_entries.habit_id AND h.user_id = auth.uid()));

CREATE POLICY "habit_entries_insert_own"
ON habit_entries
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM habits h WHERE h.id = habit_entries.habit_id AND h.user_id = auth.uid()));

CREATE POLICY "habit_entries_update_own"
ON habit_entries
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM habits h WHERE h.id = habit_entries.habit_id AND h.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM habits h WHERE h.id = habit_entries.habit_id AND h.user_id = auth.uid()));

CREATE POLICY "habit_entries_delete_own"
ON habit_entries
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM habits h WHERE h.id = habit_entries.habit_id AND h.user_id = auth.uid()));

-- Reminders: owner-only access
CREATE POLICY "reminders_select_own"
ON reminders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "reminders_insert_own"
ON reminders
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "reminders_update_own"
ON reminders
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "reminders_delete_own"
ON reminders
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Reflection entries: owner-only access
CREATE POLICY "reflection_entries_select_own"
ON reflection_entries
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "reflection_entries_insert_own"
ON reflection_entries
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "reflection_entries_delete_own"
ON reflection_entries
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Inbox items: owner-only access
CREATE POLICY "inbox_items_select_own"
ON inbox_items
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "inbox_items_insert_own"
ON inbox_items
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "inbox_items_update_own"
ON inbox_items
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "inbox_items_delete_own"
ON inbox_items
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Saved views: owner-only access
CREATE POLICY "saved_views_select_own"
ON saved_views
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "saved_views_insert_own"
ON saved_views
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_views_update_own"
ON saved_views
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_views_delete_own"
ON saved_views
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Notes: owner-only access
CREATE POLICY "notes_select_own"
ON notes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notes_insert_own"
ON notes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notes_update_own"
ON notes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notes_delete_own"
ON notes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

