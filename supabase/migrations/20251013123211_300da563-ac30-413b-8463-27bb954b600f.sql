-- Allow anonymous users to upload to temporary folders
CREATE POLICY "Anonymous users can upload to temp folder"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'customer-uploads' 
  AND (name LIKE 'temp/%' OR name LIKE 'anonymous/%')
);

-- Allow anonymous users to view their temp uploads
CREATE POLICY "Anyone can view temp uploads"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'customer-uploads' 
  AND (name LIKE 'temp/%' OR name LIKE 'anonymous/%')
);