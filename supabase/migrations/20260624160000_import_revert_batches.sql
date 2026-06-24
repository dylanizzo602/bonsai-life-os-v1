-- Migration: Single-slot import revert batch per user (undo last CSV import)

CREATE TABLE IF NOT EXISTS import_revert_batches (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('tasks', 'reflections', 'notes')),
  import_mode TEXT NOT NULL CHECK (import_mode IN ('create', 'merge')),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE import_revert_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own import revert batch"
  ON import_revert_batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import revert batch"
  ON import_revert_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own import revert batch"
  ON import_revert_batches FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own import revert batch"
  ON import_revert_batches FOR DELETE
  USING (auth.uid() = user_id);
