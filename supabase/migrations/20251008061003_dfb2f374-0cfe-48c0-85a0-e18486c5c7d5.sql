-- Create storage bucket for shop images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for shop images
CREATE POLICY "Shop owners can upload their shop images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM shops WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can update their shop images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM shops WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can delete their shop images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM shops WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view shop images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'shop-images');