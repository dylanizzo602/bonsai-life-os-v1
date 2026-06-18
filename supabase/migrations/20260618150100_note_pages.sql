-- Migration: Note pages and subpages (two-level hierarchy within each note document)

-- =========================
-- 1) note_pages table
-- =========================
CREATE TABLE IF NOT EXISTS note_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  parent_page_id UUID REFERENCES note_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_pages_note_parent_sort
  ON note_pages(note_id, parent_page_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_note_pages_user_note
  ON note_pages(user_id, note_id);

CREATE TRIGGER update_note_pages_updated_at
  BEFORE UPDATE ON note_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE note_pages IS 'Pages and subpages within a note document (max two levels)';

-- =========================
-- 2) Enforce two-level hierarchy via trigger
-- =========================
CREATE OR REPLACE FUNCTION enforce_note_page_depth()
RETURNS TRIGGER AS $$
DECLARE
  parent_parent_id UUID;
BEGIN
  IF NEW.parent_page_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT parent_page_id INTO parent_parent_id
  FROM note_pages
  WHERE id = NEW.parent_page_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent page not found';
  END IF;

  IF parent_parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Subpages cannot have child pages (max two levels)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_note_page_depth_trigger ON note_pages;
CREATE TRIGGER enforce_note_page_depth_trigger
  BEFORE INSERT OR UPDATE OF parent_page_id ON note_pages
  FOR EACH ROW
  EXECUTE FUNCTION enforce_note_page_depth();

-- =========================
-- 3) Bump parent note updated_at when a page changes
-- =========================
CREATE OR REPLACE FUNCTION bump_note_updated_at_on_page_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE notes SET updated_at = NOW() WHERE id = COALESCE(NEW.note_id, OLD.note_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bump_note_on_page_change ON note_pages;
CREATE TRIGGER bump_note_on_page_change
  AFTER INSERT OR UPDATE OR DELETE ON note_pages
  FOR EACH ROW
  EXECUTE FUNCTION bump_note_updated_at_on_page_change();

-- =========================
-- 4) RLS for note_pages
-- =========================
ALTER TABLE note_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "note_pages_select_own" ON note_pages;
DROP POLICY IF EXISTS "note_pages_insert_own" ON note_pages;
DROP POLICY IF EXISTS "note_pages_update_own" ON note_pages;
DROP POLICY IF EXISTS "note_pages_delete_own" ON note_pages;

CREATE POLICY "note_pages_select_own"
ON note_pages FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "note_pages_insert_own"
ON note_pages FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "note_pages_update_own"
ON note_pages FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "note_pages_delete_own"
ON note_pages FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- =========================
-- 5) Migrate existing notes.content into first top-level page
-- =========================
INSERT INTO note_pages (note_id, user_id, parent_page_id, title, content, sort_order, created_at, updated_at)
SELECT
  n.id,
  n.user_id,
  NULL,
  COALESCE(NULLIF(TRIM(n.title), ''), 'Untitled'),
  n.content,
  0,
  n.created_at,
  n.updated_at
FROM notes n
WHERE NOT EXISTS (
  SELECT 1 FROM note_pages p WHERE p.note_id = n.id
);
