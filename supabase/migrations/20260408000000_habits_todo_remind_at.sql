-- Add habits.todo_remind_at: next scheduled instant for habit todo reminders (replaces reliance on reminders table for scheduling).
-- Backfill from linked reminders rows so existing schedules stay aligned.

ALTER TABLE habits ADD COLUMN IF NOT EXISTS todo_remind_at TIMESTAMPTZ;

UPDATE habits h
SET todo_remind_at = r.remind_at
FROM reminders r
WHERE h.reminder_id IS NOT NULL
  AND r.id = h.reminder_id
  AND h.todo_remind_at IS NULL;
