-- Remove DB enforcement that forced tasks.priority to 'high' whenever goal_id was set.
-- That trigger blocked setting priority to 'none' (or any non-high value) on goal-linked tasks.
-- The app still suggests High when a goal is first linked (AddEditTaskModal goal picker).

DROP TRIGGER IF EXISTS set_task_priority_on_goal_link ON public.tasks;

DROP FUNCTION IF EXISTS public.set_task_priority_for_goal();
