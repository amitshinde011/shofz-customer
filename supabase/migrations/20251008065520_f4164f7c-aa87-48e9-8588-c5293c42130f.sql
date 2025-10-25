-- Drop all existing shop-images policies completely
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname LIKE '%shop%'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-images', 
  'shop-images', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) 
DO UPDATE SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Create new policies with correct permissions
CREATE POLICY "Authenticated users can upload shop images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-images' 
  AND (storage.foldername(name))[1] = 'shops'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM public.shops WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can update shop images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = 'shops'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM public.shops WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can delete shop images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = 'shops'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM public.shops WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Public read access to shop images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shop-images');