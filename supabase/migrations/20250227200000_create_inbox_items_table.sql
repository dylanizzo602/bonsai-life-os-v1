-- Migration: Create inbox_items table for home dashboard Inbox widget
-- Stores lightweight items (name only) that can be converted to full tasks later

CREATE TABLE IF NOT EXISTS inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_items_user_created ON inbox_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_items_sort ON inbox_items(sort_order ASC, created_at ASC);
