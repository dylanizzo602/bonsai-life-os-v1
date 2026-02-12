-- Migration: Tags schema - Normalized tags with colors, many-to-many via task_tags
-- Replaces tasks.tag (single TEXT) with tags table + task_tags junction

-- Step 1: Create tags table (id, name, color, user_id)
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_tag_name_per_user UNIQUE (name, user_id)
);

-- Step 2: Create task_tags junction (task_id, tag_id) - max 3 tags per task enforced in app
CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, tag_id)
);

-- Step 3: Migrate existing tasks.tag values into tags and task_tags
INSERT INTO tags (name, color, user_id)
SELECT DISTINCT TRIM(t.tag), 'slate', t.user_id
FROM tasks t
WHERE t.tag IS NOT NULL AND TRIM(t.tag) != ''
ON CONFLICT (name, user_id) DO NOTHING;

INSERT INTO task_tags (task_id, tag_id)
SELECT t.id, tg.id
FROM tasks t
JOIN tags tg ON tg.name = TRIM(t.tag) AND (tg.user_id IS NOT DISTINCT FROM t.user_id)
WHERE t.tag IS NOT NULL AND TRIM(t.tag) != ''
ON CONFLICT (task_id, tag_id) DO NOTHING;

-- Step 4: Drop tasks.tag column
ALTER TABLE tasks DROP COLUMN IF EXISTS tag;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
