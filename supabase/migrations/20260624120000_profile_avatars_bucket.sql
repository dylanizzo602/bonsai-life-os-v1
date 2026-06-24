-- Migration: profile-avatars storage bucket for user profile photos

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can read profile avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload profile avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete own profile avatars" ON storage.objects;

CREATE POLICY "Public can read profile avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-avatars');

-- Path namespace: ${userId}/filename
CREATE POLICY "Authenticated can upload profile avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated can delete own profile avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
