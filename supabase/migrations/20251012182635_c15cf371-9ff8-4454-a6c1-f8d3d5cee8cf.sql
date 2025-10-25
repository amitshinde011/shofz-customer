-- Create shop-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Shop images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can upload shop images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can update their shop images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can delete their shop images" ON storage.objects;

-- Allow public access to view shop images
CREATE POLICY "Shop images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-images');

-- Allow shop owners to upload images to their shop folder
CREATE POLICY "Shop owners can upload shop images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shop-images' 
  AND (storage.foldername(name))[1] = 'shops'
  AND auth.uid() IN (
    SELECT owner_id FROM public.shops 
    WHERE id::text = (storage.foldername(name))[2]
  )
);

-- Allow shop owners to update their images
CREATE POLICY "Shop owners can update their shop images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = 'shops'
  AND auth.uid() IN (
    SELECT owner_id FROM public.shops 
    WHERE id::text = (storage.foldername(name))[2]
  )
);

-- Allow shop owners to delete their images
CREATE POLICY "Shop owners can delete their shop images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = 'shops'
  AND auth.uid() IN (
    SELECT owner_id FROM public.shops 
    WHERE id::text = (storage.foldername(name))[2]
  )
);