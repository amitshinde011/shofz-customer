-- Create storage bucket for shop payment QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for shop-assets bucket
CREATE POLICY "Shop owners can upload their assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shop-assets' AND
  auth.uid() IN (
    SELECT owner_id FROM public.shops 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Anyone can view shop assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-assets');

CREATE POLICY "Shop owners can update their assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shop-assets' AND
  auth.uid() IN (
    SELECT owner_id FROM public.shops 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Shop owners can delete their assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shop-assets' AND
  auth.uid() IN (
    SELECT owner_id FROM public.shops 
    WHERE id::text = (storage.foldername(name))[1]
  )
);