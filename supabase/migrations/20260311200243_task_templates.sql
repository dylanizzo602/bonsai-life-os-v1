-- Migration: Create task_templates table for per-user task templates
-- Stores a JSONB snapshot of a task (fields, checklists, subtasks) scoped by user_id via RLS.

-- Create task_templates table if it does not exist
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to efficiently fetch templates by user and created_at
CREATE INDEX IF NOT EXISTS idx_task_templates_user_id_created_at
  ON task_templates(user_id, created_at DESC);

-- Ensure user_id defaults to the authenticated user for new templates
ALTER TABLE task_templates
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Enable Row Level Security so templates are scoped per user
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Drop any legacy policies if they exist (idempotent)
DROP POLICY IF EXISTS "task_templates_select_own" ON task_templates;
DROP POLICY IF EXISTS "task_templates_insert_own" ON task_templates;
DROP POLICY IF EXISTS "task_templates_update_own" ON task_templates;
DROP POLICY IF EXISTS "task_templates_delete_own" ON task_templates;

-- Only allow authenticated users to access their own templates
CREATE POLICY "task_templates_select_own"
ON task_templates
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "task_templates_insert_own"
ON task_templates
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_templates_update_own"
ON task_templates
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_templates_delete_own"
ON task_templates
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
