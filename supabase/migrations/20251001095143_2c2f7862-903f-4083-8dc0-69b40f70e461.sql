-- Drop existing policies
DROP POLICY IF EXISTS "Shop owners can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can update their product images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can delete their product images" ON storage.objects;

-- Create a security definer function to check shop ownership
CREATE OR REPLACE FUNCTION public.is_shop_owner(shop_id_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM shops 
    WHERE id::text = shop_id_text 
    AND owner_id = auth.uid()
  );
END;
$$;

-- Create new storage policies using the security definer function
CREATE POLICY "Shop owners can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND public.is_shop_owner((storage.foldername(name))[2])
);

CREATE POLICY "Shop owners can update their product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.is_shop_owner((storage.foldername(name))[2])
);

CREATE POLICY "Shop owners can delete their product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.is_shop_owner((storage.foldername(name))[2])
);