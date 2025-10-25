-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Shop owners can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can update their product images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can delete their product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;

-- Create corrected storage policies for product images
-- Path structure: products/{shop_id}/{filename}

-- Allow shop owners to upload product images for their shops
CREATE POLICY "Shop owners can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IN (
    SELECT owner_id 
    FROM shops 
    WHERE id::text = (storage.foldername(name))[2]
  )
);

-- Allow shop owners to update their product images
CREATE POLICY "Shop owners can update their product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND auth.uid() IN (
    SELECT owner_id 
    FROM shops 
    WHERE id::text = (storage.foldername(name))[2]
  )
);

-- Allow shop owners to delete their product images
CREATE POLICY "Shop owners can delete their product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND auth.uid() IN (
    SELECT owner_id 
    FROM shops 
    WHERE id::text = (storage.foldername(name))[2]
  )
);

-- Allow public access to view product images
CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');