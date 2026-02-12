-- Migration: Fix RLS policies for task-attachments bucket to allow public access
-- Drop existing policies and recreate with public access

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can read task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can read task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete task attachments" ON storage.objects;

-- RLS Policy: Allow public/anonymous users to upload files (public bucket)
CREATE POLICY "Public can upload task attachments"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'task-attachments' AND
  (storage.foldername(name))[1] IS NOT NULL -- Ensure file is in a folder (taskId/filename)
);

-- RLS Policy: Allow public/anonymous users to read any task attachment (public bucket)
CREATE POLICY "Public can read task attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'task-attachments');

-- RLS Policy: Allow public/anonymous users to delete task attachments
CREATE POLICY "Public can delete task attachments"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'task-attachments');
