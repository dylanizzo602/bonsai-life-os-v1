-- Migration: Create goals, milestones, goal_habits, and goal_history tables for goal tracking
-- Goals track progress via milestones (task, number, boolean types) and can link to habits

-- Goals table: main goal entity with name, dates, and manual progress override
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goal milestones: track progress via tasks, numbers, or boolean checkpoints
CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task', 'number', 'boolean')),
  title TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  start_value NUMERIC,
  target_value NUMERIC,
  unit TEXT,
  current_value NUMERIC,
  completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goal habits: many-to-many relationship between goals and habits
CREATE TABLE IF NOT EXISTS goal_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(goal_id, habit_id)
);

-- Goal history: track all significant events for a goal
CREATE TABLE IF NOT EXISTS goal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('progress_change', 'milestone_completed', 'milestone_created', 'milestone_updated', 'habit_linked', 'habit_unlinked')),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add goal_id to tasks table for linking tasks to goals
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_start_date ON goals(start_date);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_task_id ON goal_milestones(task_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_type ON goal_milestones(type);
CREATE INDEX IF NOT EXISTS idx_goal_habits_goal_id ON goal_habits(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_habits_habit_id ON goal_habits(habit_id);
CREATE INDEX IF NOT EXISTS idx_goal_history_goal_id ON goal_history(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_history_created_at ON goal_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);

-- Trigger to update updated_at on goal updates
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on milestone updates
CREATE TRIGGER update_goal_milestones_updated_at
  BEFORE UPDATE ON goal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set priority to 'high' when goal_id is set on a task
CREATE OR REPLACE FUNCTION set_task_priority_for_goal()
RETURNS TRIGGER AS $$
BEGIN
  -- When goal_id is set (not null), set priority to 'high'
  IF NEW.goal_id IS NOT NULL AND NEW.priority != 'high' THEN
    NEW.priority := 'high';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set priority when goal_id is set
CREATE TRIGGER set_task_priority_on_goal_link
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.goal_id IS NOT NULL)
  EXECUTE FUNCTION set_task_priority_for_goal();
