-- Create security definer function to check shop ownership
CREATE OR REPLACE FUNCTION public.is_shop_owner_by_id(shop_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.shops
    WHERE id = shop_id_param
    AND owner_id = auth.uid()
  );
END;
$$;

-- Drop existing policies
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
  AND public.is_shop_owner_by_id(((storage.foldername(name))[2])::uuid)
);

-- Allow shop owners to update their images
CREATE POLICY "Shop owners can update their shop images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = 'shops'
  AND public.is_shop_owner_by_id(((storage.foldername(name))[2])::uuid)
);

-- Allow shop owners to delete their images
CREATE POLICY "Shop owners can delete their shop images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shop-images'
  AND (storage.foldername(name))[1] = 'shops'
  AND public.is_shop_owner_by_id(((storage.foldername(name))[2])::uuid)
);