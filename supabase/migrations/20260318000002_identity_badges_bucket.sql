-- Migration: Create identity-badges storage bucket and RLS policies
-- Identity badges are public images used by the Goals "identities" UI.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'identity-badges',
  'identity-badges',
  true,
  52428800, -- 50MB limit
  NULL -- Allow all file types
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Public can read identity badges" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload identity badges" ON storage.objects;

-- Public read so <img src="..."> works without auth
CREATE POLICY "Public can read identity badges"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'identity-badges');

-- Authenticated upload; requires the uploaded path to be namespaced under `${identityId}/...`
CREATE POLICY "Authenticated can upload identity badges"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-badges' AND
  (storage.foldername(name))[1] IS NOT NULL
);

