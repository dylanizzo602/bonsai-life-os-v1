-- Migration: Add UPDATE RLS policy for reflection_entries (journal edits and briefing upserts)

DROP POLICY IF EXISTS "reflection_entries_update_own" ON reflection_entries;

CREATE POLICY "reflection_entries_update_own"
ON reflection_entries
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
