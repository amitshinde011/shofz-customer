-- Add SELECT policy for customer-uploads bucket
-- This allows users to read files from the customer-uploads bucket
CREATE POLICY "Anyone can view customer uploads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'customer-uploads');