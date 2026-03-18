-- Migration: Identity slot assignments (3 "active" slots per identity)

-- Slot items link an identity slot to either a habit or a goal.
-- We store history by allowing multiple rows per (identity_id, slot_index) over time,
-- but enforce that only one row per slot_index is marked as current.

CREATE TABLE IF NOT EXISTS identity_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL CHECK (slot_index IN (0, 1, 2)),

  item_type TEXT NOT NULL CHECK (item_type IN ('habit', 'goal')),
  habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

  -- When true, this row is the currently active slot assignment.
  is_current BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Enforce correct FK usage based on item_type.
  CONSTRAINT identity_items_item_type_fk_check CHECK (
    (item_type = 'habit' AND habit_id IS NOT NULL AND goal_id IS NULL) OR
    (item_type = 'goal' AND goal_id IS NOT NULL AND habit_id IS NULL)
  )
);

-- Enforce at most one current item per slot (history is kept by allowing old rows with is_current=false).
CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_items_one_current_per_slot
ON identity_items(identity_id, slot_index)
WHERE is_current = TRUE;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_identity_items_identity_id ON identity_items(identity_id);
CREATE INDEX IF NOT EXISTS idx_identity_items_current ON identity_items(identity_id, slot_index, is_current);
CREATE INDEX IF NOT EXISTS idx_identity_items_goal_id ON identity_items(goal_id);
CREATE INDEX IF NOT EXISTS idx_identity_items_habit_id ON identity_items(habit_id);
CREATE INDEX IF NOT EXISTS idx_identity_items_created_at ON identity_items(created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_identity_items_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on identity_item updates
DROP TRIGGER IF EXISTS update_identity_items_updated_at ON identity_items;
CREATE TRIGGER update_identity_items_updated_at
  BEFORE UPDATE ON identity_items
  FOR EACH ROW
  EXECUTE FUNCTION update_identity_items_updated_at_column();

-- =========================
-- RLS: user-scoped identity items
-- =========================
ALTER TABLE identity_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS identity_items_select_own ON identity_items;
DROP POLICY IF EXISTS identity_items_insert_own ON identity_items;
DROP POLICY IF EXISTS identity_items_update_own ON identity_items;
DROP POLICY IF EXISTS identity_items_delete_own ON identity_items;

-- A user can only see/modify items if the parent identity belongs to them.
CREATE POLICY identity_items_select_own
ON identity_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM identities i
    WHERE i.id = identity_items.identity_id
      AND i.user_id = auth.uid()
  )
);

CREATE POLICY identity_items_insert_own
ON identity_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM identities i
    WHERE i.id = identity_items.identity_id
      AND i.user_id = auth.uid()
  )
);

CREATE POLICY identity_items_update_own
ON identity_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM identities i
    WHERE i.id = identity_items.identity_id
      AND i.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM identities i
    WHERE i.id = identity_items.identity_id
      AND i.user_id = auth.uid()
  )
);

CREATE POLICY identity_items_delete_own
ON identity_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM identities i
    WHERE i.id = identity_items.identity_id
      AND i.user_id = auth.uid()
  )
);

