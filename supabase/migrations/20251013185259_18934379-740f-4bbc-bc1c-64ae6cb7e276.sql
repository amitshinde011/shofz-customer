-- Drop the incorrect policies
DROP POLICY IF EXISTS "Shop owners can upload QR codes" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can update their QR codes" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can delete their QR codes" ON storage.objects;

-- Add correct RLS policies for shop-assets bucket QR code uploads
-- Path structure: qr-codes/{shop_id}_qr_{timestamp}.{ext}

CREATE POLICY "Shop owners can upload QR codes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-assets' 
  AND (storage.foldername(name))[1] = 'qr-codes'
  AND EXISTS (
    SELECT 1 FROM shops 
    WHERE id::text = split_part(split_part(name, '/', 2), '_', 1)
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can update their QR codes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-assets'
  AND (storage.foldername(name))[1] = 'qr-codes'
  AND EXISTS (
    SELECT 1 FROM shops 
    WHERE id::text = split_part(split_part(name, '/', 2), '_', 1)
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can delete their QR codes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-assets'
  AND (storage.foldername(name))[1] = 'qr-codes'
  AND EXISTS (
    SELECT 1 FROM shops 
    WHERE id::text = split_part(split_part(name, '/', 2), '_', 1)
    AND owner_id = auth.uid()
  )
);