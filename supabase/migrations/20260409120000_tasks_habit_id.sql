-- Link each habit to at most one task (habit reminders + Tasks list row).
-- Backfill creates a recurring task for existing habits that do not yet have one.

/* Build recurrence_pattern JSON from habits.frequency / frequency_target (matches app habitTodoSchedule.recurrencePatternJsonForHabit). */
CREATE OR REPLACE FUNCTION public.habit_recurrence_json(freq text, ft int)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts text := '';
  i int;
  codes text[] := ARRAY['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  sep text := '';
BEGIN
  IF freq IN ('daily', 'times_per_day') THEN
    RETURN '{"freq":"day","interval":1}';
  END IF;
  IF freq = 'every_x_days' AND ft IS NOT NULL AND ft > 0 THEN
    RETURN format('{"freq":"day","interval":%s}', ft);
  END IF;
  IF freq = 'weekly' AND ft IS NOT NULL AND ft >= 1 AND ft <= 127 THEN
    FOR i IN 0..6 LOOP
      IF (ft & (power(2, i))::int) <> 0 THEN
        parts := parts || sep || to_json(codes[i + 1])::text;
        sep := ',';
      END IF;
    END LOOP;
    IF parts = '' THEN
      RETURN '{"freq":"week","interval":1,"byDay":["MO"]}';
    END IF;
    RETURN format('{"freq":"week","interval":1,"byDay":[%s]}', parts);
  END IF;
  RETURN '{"freq":"day","interval":1}';
END;
$$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_habit_id_unique
  ON public.tasks(habit_id)
  WHERE habit_id IS NOT NULL;

/* One linked task per habit for existing rows */
INSERT INTO public.tasks (
  id,
  user_id,
  parent_id,
  title,
  description,
  start_date,
  due_date,
  priority,
  category,
  status,
  recurrence_pattern,
  completed_at,
  goal_id,
  attachments,
  time_estimate,
  habit_id
)
SELECT
  gen_random_uuid(),
  h.user_id,
  NULL,
  COALESCE(NULLIF(trim(h.desired_action), ''), h.name),
  NULL,
  NULL,
  COALESCE(h.todo_remind_at, (CURRENT_DATE::text || 'T09:00:00')::timestamptz),
  'medium',
  NULL,
  'active',
  public.habit_recurrence_json(h.frequency::text, COALESCE(h.frequency_target, 0)),
  NULL,
  NULL,
  '[]'::jsonb,
  NULL,
  h.id
FROM public.habits h
WHERE h.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.tasks t WHERE t.habit_id = h.id);

DROP FUNCTION IF EXISTS public.habit_recurrence_json(text, int);
