-- Add attachment_urls column to inquiries table
ALTER TABLE inquiries 
ADD COLUMN attachment_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add comment for clarity
COMMENT ON COLUMN inquiries.attachment_urls IS 'Array of storage paths: inquiries/{inquiry-id}_{timestamp}_{random}.webp';

-- Migrate existing image_url data to attachment_urls array
UPDATE inquiries 
SET attachment_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL 
  AND image_url != ''
  AND attachment_urls = ARRAY[]::TEXT[];

-- Create RLS policies for inquiries folder
CREATE POLICY "Authenticated users can upload inquiry attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'customer-uploads' 
  AND (storage.foldername(name))[1] = 'inquiries'
);

CREATE POLICY "Authenticated users can view inquiry attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'customer-uploads' 
  AND (storage.foldername(name))[1] = 'inquiries'
);

CREATE POLICY "Users can delete their inquiry attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'customer-uploads' 
  AND (storage.foldername(name))[1] = 'inquiries'
  AND (
    -- Extract inquiry UUID from filename (format: inquiryId_timestamp_random.ext)
    -- Customer can delete attachments from their inquiries
    (split_part((storage.filename(name)), '_', 1))::uuid IN (
      SELECT id FROM inquiries WHERE customer_id = auth.uid()
    )
    OR
    -- Shop owner can delete attachments from inquiries they received
    (split_part((storage.filename(name)), '_', 1))::uuid IN (
      SELECT i.id FROM inquiries i
      JOIN shops s ON s.id = i.shop_id
      WHERE s.owner_id = auth.uid()
    )
  )
);