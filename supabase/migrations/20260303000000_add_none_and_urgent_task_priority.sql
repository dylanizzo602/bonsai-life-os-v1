-- Migration: Extend tasks.priority allowed values to include 'none' and 'urgent'
-- Notes:
-- - Existing tasks.priority is TEXT with CHECK (priority IN ('low','medium','high')).
-- - This migration relaxes the CHECK constraint to allow 'none' and 'urgent' as valid values.
-- - There is no safe automatic DOWN migration for shrinking the allowed set if data already uses
--   'none' or 'urgent'; reversing this change would require manual cleanup first.

DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Look up the current CHECK constraint on tasks.priority
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.tasks'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%priority%'
  LIMIT 1;

  -- Drop the existing CHECK constraint if found
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', constraint_name);
  END IF;

  -- Add a new CHECK constraint that allows none, low, medium, high, urgent
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_priority_check
    CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent'));
END $$;

