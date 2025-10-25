-- Drop existing policies
DROP POLICY IF EXISTS "Shop owners can upload their shop images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can update their shop images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can delete their shop images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view shop images" ON storage.objects;

-- Create corrected storage policies for shop images
CREATE POLICY "Shop owners can upload their shop images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-images' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Shop owners can update their shop images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Shop owners can delete their shop images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Anyone can view shop images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'shop-images');