-- habit_reminder_notifications: one actionable in-app/push instance per habit per missed calendar day

CREATE TABLE IF NOT EXISTS habit_reminder_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dismissed', 'resolved')),
  pushed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE (user_id, habit_id, occurrence_date)
);

ALTER TABLE habit_reminder_notifications
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_habit_reminder_notifications_user_pending
  ON habit_reminder_notifications (user_id, status, occurrence_date)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_habit_reminder_notifications_habit_date
  ON habit_reminder_notifications (habit_id, occurrence_date);

CREATE OR REPLACE FUNCTION set_habit_reminder_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS habit_reminder_notifications_set_updated_at ON habit_reminder_notifications;
CREATE TRIGGER habit_reminder_notifications_set_updated_at
BEFORE UPDATE ON habit_reminder_notifications
FOR EACH ROW
EXECUTE FUNCTION set_habit_reminder_notifications_updated_at();

ALTER TABLE habit_reminder_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_reminder_notifications_select_own"
ON habit_reminder_notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "habit_reminder_notifications_update_own"
ON habit_reminder_notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "habit_reminder_notifications_insert_own"
ON habit_reminder_notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
