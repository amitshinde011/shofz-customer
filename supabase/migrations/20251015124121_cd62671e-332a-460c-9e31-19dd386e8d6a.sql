-- Drop existing policies
DROP POLICY IF EXISTS "Shop owners can upload their shop images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can update their shop images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can delete their shop images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view shop images" ON storage.objects;

-- Create new policies with admin support
CREATE POLICY "Admins and shop owners can upload shop images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-images' AND (
    -- Admins can upload for any shop
    is_admin() OR
    -- Shop owners can upload for their own shops
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM shops WHERE owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins and shop owners can update shop images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-images' AND (
    is_admin() OR
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM shops WHERE owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins and shop owners can delete shop images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-images' AND (
    is_admin() OR
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM shops WHERE owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Anyone can view shop images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'shop-images');