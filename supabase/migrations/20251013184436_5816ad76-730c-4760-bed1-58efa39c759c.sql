-- Add RLS policies for shop-assets bucket to allow QR code uploads

-- Allow shop owners to upload QR codes
CREATE POLICY "Shop owners can upload QR codes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-assets' 
  AND (storage.foldername(name))[1] = 'qr-codes'
  AND EXISTS (
    SELECT 1 FROM shops 
    WHERE id::text = split_part((storage.foldername(name))[2], '_', 1)
    AND owner_id = auth.uid()
  )
);

-- Allow shop owners to update their QR codes
CREATE POLICY "Shop owners can update their QR codes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-assets'
  AND (storage.foldername(name))[1] = 'qr-codes'
  AND EXISTS (
    SELECT 1 FROM shops 
    WHERE id::text = split_part((storage.foldername(name))[2], '_', 1)
    AND owner_id = auth.uid()
  )
);

-- Allow shop owners to delete their QR codes
CREATE POLICY "Shop owners can delete their QR codes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-assets'
  AND (storage.foldername(name))[1] = 'qr-codes'
  AND EXISTS (
    SELECT 1 FROM shops 
    WHERE id::text = split_part((storage.foldername(name))[2], '_', 1)
    AND owner_id = auth.uid()
  )
);