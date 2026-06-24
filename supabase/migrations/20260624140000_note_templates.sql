-- Migration: Create note_templates table for per-user note templates
-- Stores a JSONB snapshot of a note document (title, pages, subpages) scoped by user_id via RLS.

CREATE TABLE IF NOT EXISTS note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  icon TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_templates_user_id_created_at
  ON note_templates(user_id, created_at DESC);

ALTER TABLE note_templates
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "note_templates_select_own" ON note_templates;
DROP POLICY IF EXISTS "note_templates_insert_own" ON note_templates;
DROP POLICY IF EXISTS "note_templates_update_own" ON note_templates;
DROP POLICY IF EXISTS "note_templates_delete_own" ON note_templates;

CREATE POLICY "note_templates_select_own"
ON note_templates
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "note_templates_insert_own"
ON note_templates
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "note_templates_update_own"
ON note_templates
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "note_templates_delete_own"
ON note_templates
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
