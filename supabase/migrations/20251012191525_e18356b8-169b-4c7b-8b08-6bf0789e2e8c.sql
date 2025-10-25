-- Create offer-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-images', 'offer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Shop owners can upload their offer images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can update their offer images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can delete their offer images" ON storage.objects;

-- Create RLS policies for offer images
CREATE POLICY "Shop owners can upload their offer images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offer-images' 
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can update their offer images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'offer-images'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can delete their offer images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'offer-images'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);