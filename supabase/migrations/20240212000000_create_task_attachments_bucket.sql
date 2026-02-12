-- Migration: Create task-attachments storage bucket and RLS policies
-- NOTE: You must create the bucket manually in Supabase Dashboard → Storage → New bucket (name: task-attachments, public: true)
-- This migration sets up RLS policies for the bucket

-- Create the bucket (if it doesn't exist) - requires storage admin role
-- Note: Bucket creation via SQL may not work in all Supabase setups
-- If this fails, create the bucket manually in the dashboard first
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  true,
  52428800, -- 50MB limit
  NULL -- Allow all file types
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can read task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete task attachments" ON storage.objects;

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
