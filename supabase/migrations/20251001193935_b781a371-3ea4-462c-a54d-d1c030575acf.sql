-- Create storage bucket for offer images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('offer-images', 'offer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for offer images
CREATE POLICY "Anyone can view offer images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'offer-images');

CREATE POLICY "Shop owners can upload offer images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'offer-images' 
  AND auth.uid() IN (
    SELECT owner_id FROM shops
  )
);

CREATE POLICY "Shop owners can update their offer images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'offer-images' 
  AND auth.uid() IN (
    SELECT owner_id FROM shops
  )
);

CREATE POLICY "Shop owners can delete their offer images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'offer-images' 
  AND auth.uid() IN (
    SELECT owner_id FROM shops
  )
);