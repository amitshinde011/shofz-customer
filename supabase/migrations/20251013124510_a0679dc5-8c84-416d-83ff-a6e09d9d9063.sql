-- Add RLS policies for authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'customer-uploads' 
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Add RLS policy for authenticated users to read their own files
CREATE POLICY "Authenticated users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-uploads' 
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Add RLS policy for authenticated users to update their own files
CREATE POLICY "Authenticated users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'customer-uploads' 
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Add RLS policy for authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'customer-uploads' 
  AND (storage.foldername(name))[1] = (auth.uid())::text
);