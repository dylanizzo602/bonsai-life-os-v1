-- Migration: Task schema v2 - User-scoped tasks, parent_id for subtasks, checklists, dependencies
-- Extends tasks table with new fields and migrates subtasks into tasks via parent_id

-- Step 1: Add new columns to tasks table (parent_id first for subtask migration)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS user_id UUID, -- links to auth.users(id) when auth is enabled
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tag TEXT,
  ADD COLUMN IF NOT EXISTS time_estimate INTEGER, -- minutes
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing subtasks into tasks (as tasks with parent_id)
INSERT INTO tasks (id, title, parent_id, description, due_date, priority, category, status, recurrence_pattern, completed_at, created_at, updated_at)
SELECT s.id, s.title, s.task_id, NULL, NULL, 'medium', NULL, 'active', NULL, NULL, s.created_at, s.created_at
FROM subtasks s
ON CONFLICT (id) DO NOTHING;

-- Step 3: Drop subtasks table (subtasks are now tasks with parent_id)
DROP TABLE IF EXISTS subtasks;

-- Step 4: Task checklists - each task can have multiple checklists
CREATE TABLE IF NOT EXISTS task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 5: Checklist items - items within each checklist
CREATE TABLE IF NOT EXISTS task_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES task_checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 6: Task dependencies - blocker_id blocks blocked_id (blocker must be done before blocked)
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_dependency CHECK (blocker_id != blocked_id),
  CONSTRAINT unique_dependency UNIQUE (blocker_id, blocked_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id ON task_checklists(task_id);
CREATE INDEX IF NOT EXISTS idx_task_checklist_items_checklist_id ON task_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_blocker ON task_dependencies(blocker_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_blocked ON task_dependencies(blocked_id);
