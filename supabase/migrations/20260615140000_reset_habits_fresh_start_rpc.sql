-- RPC: reset current user's habits to a fresh-start state (entries, reminders, push dedupe cleared; created_at bumped)

CREATE OR REPLACE FUNCTION reset_habits_fresh_start()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  habit_ids uuid[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT array_agg(id) INTO habit_ids FROM habits WHERE user_id = uid;

  IF habit_ids IS NOT NULL THEN
    DELETE FROM habit_entries WHERE habit_id = ANY(habit_ids);
  END IF;

  DELETE FROM habit_reminder_notifications WHERE user_id = uid;
  DELETE FROM notifications WHERE user_id = uid AND type = 'habit_reminder_due';

  /* Bump created_at so missed-occurrence lookback starts from today */
  UPDATE habits
  SET
    created_at = TIMEZONE('utc', NOW()),
    updated_at = TIMEZONE('utc', NOW())
  WHERE user_id = uid;
END;
$$;

REVOKE ALL ON FUNCTION reset_habits_fresh_start() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_habits_fresh_start() TO authenticated;

CREATE POLICY "habit_reminder_notifications_delete_own"
ON habit_reminder_notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
