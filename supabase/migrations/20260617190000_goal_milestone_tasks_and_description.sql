-- Migration: Add milestone description, multi-task junction table, migrate legacy task_id

-- A. Add optional description on milestones
ALTER TABLE goal_milestones
  ADD COLUMN IF NOT EXISTS description TEXT;

-- B. Junction table for multiple linked tasks per task-type milestone
CREATE TABLE IF NOT EXISTS goal_milestone_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES goal_milestones(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(milestone_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_goal_milestone_tasks_milestone_id
  ON goal_milestone_tasks(milestone_id);

CREATE INDEX IF NOT EXISTS idx_goal_milestone_tasks_task_id
  ON goal_milestone_tasks(task_id);

-- C. Migrate existing single task_id links into junction table
INSERT INTO goal_milestone_tasks (milestone_id, task_id, sort_order)
SELECT id, task_id, 0
FROM goal_milestones
WHERE type = 'task'
  AND task_id IS NOT NULL
ON CONFLICT (milestone_id, task_id) DO NOTHING;

-- D. Drop legacy single-task column
DROP INDEX IF EXISTS idx_goal_milestones_task_id;
ALTER TABLE goal_milestones DROP COLUMN IF EXISTS task_id;

-- E. RLS for goal_milestone_tasks (mirror goal_habits pattern)
ALTER TABLE goal_milestone_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goal_milestone_tasks_select_own" ON goal_milestone_tasks;
DROP POLICY IF EXISTS "goal_milestone_tasks_insert_own" ON goal_milestone_tasks;
DROP POLICY IF EXISTS "goal_milestone_tasks_update_own" ON goal_milestone_tasks;
DROP POLICY IF EXISTS "goal_milestone_tasks_delete_own" ON goal_milestone_tasks;

CREATE POLICY "goal_milestone_tasks_select_own"
ON goal_milestone_tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM goal_milestones gm
    JOIN goals g ON g.id = gm.goal_id
    WHERE gm.id = goal_milestone_tasks.milestone_id
      AND g.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = goal_milestone_tasks.task_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "goal_milestone_tasks_insert_own"
ON goal_milestone_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM goal_milestones gm
    JOIN goals g ON g.id = gm.goal_id
    WHERE gm.id = goal_milestone_tasks.milestone_id
      AND g.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = goal_milestone_tasks.task_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "goal_milestone_tasks_update_own"
ON goal_milestone_tasks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM goal_milestones gm
    JOIN goals g ON g.id = gm.goal_id
    WHERE gm.id = goal_milestone_tasks.milestone_id
      AND g.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = goal_milestone_tasks.task_id
      AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM goal_milestones gm
    JOIN goals g ON g.id = gm.goal_id
    WHERE gm.id = goal_milestone_tasks.milestone_id
      AND g.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = goal_milestone_tasks.task_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "goal_milestone_tasks_delete_own"
ON goal_milestone_tasks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM goal_milestones gm
    JOIN goals g ON g.id = gm.goal_id
    WHERE gm.id = goal_milestone_tasks.milestone_id
      AND g.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = goal_milestone_tasks.task_id
      AND t.user_id = auth.uid()
  )
);
