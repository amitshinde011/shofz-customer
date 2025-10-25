-- Ensure shop-images bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Shop owners can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can update images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view shop images" ON storage.objects;

-- Create comprehensive RLS policies for shop-images bucket
-- Allow authenticated users to upload to their shop folders
CREATE POLICY "Shop owners can upload to their shop folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-images' 
  AND (storage.foldername(name))[1] = 'shops'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM public.shops WHERE owner_id = auth.uid()
  )
);

-- Allow shop owners to update their images
CREATE POLICY "Shop owners can update their images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = 'shops'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM public.shops WHERE owner_id = auth.uid()
  )
);

-- Allow shop owners to delete their images
CREATE POLICY "Shop owners can delete their images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = 'shops'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM public.shops WHERE owner_id = auth.uid()
  )
);

-- Allow anyone to view images from public bucket
CREATE POLICY "Anyone can view shop images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shop-images');