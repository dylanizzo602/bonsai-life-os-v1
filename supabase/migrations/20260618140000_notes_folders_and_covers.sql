-- Migration: Note folders, cover images on notes, and note-covers storage bucket

-- =========================
-- 1) note_folders table
-- =========================
CREATE TABLE IF NOT EXISTS note_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'folder_open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_folders_user_id ON note_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_note_folders_user_name ON note_folders(user_id, name);

CREATE TRIGGER update_note_folders_updated_at
  BEFORE UPDATE ON note_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN note_folders.icon_name IS 'Material Symbols icon name for folder display';

-- =========================
-- 2) Extend notes with folder + cover fields
-- =========================
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES note_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_storage_path TEXT;

CREATE INDEX IF NOT EXISTS idx_notes_user_folder_updated
  ON notes(user_id, folder_id, updated_at DESC);

-- =========================
-- 3) RLS for note_folders
-- =========================
ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "note_folders_select_own" ON note_folders;
DROP POLICY IF EXISTS "note_folders_insert_own" ON note_folders;
DROP POLICY IF EXISTS "note_folders_update_own" ON note_folders;
DROP POLICY IF EXISTS "note_folders_delete_own" ON note_folders;

CREATE POLICY "note_folders_select_own"
ON note_folders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "note_folders_insert_own"
ON note_folders
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "note_folders_update_own"
ON note_folders
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "note_folders_delete_own"
ON note_folders
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =========================
-- 4) note-covers storage bucket
-- =========================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-covers',
  'note-covers',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can read note covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload note covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete own note covers" ON storage.objects;

CREATE POLICY "Public can read note covers"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'note-covers');

-- Path namespace: ${userId}/${noteId}/filename
CREATE POLICY "Authenticated can upload note covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'note-covers' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  (storage.foldername(name))[2] IS NOT NULL
);

CREATE POLICY "Authenticated can delete own note covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'note-covers' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
