-- Add missing columns to shop_reviews table
ALTER TABLE shop_reviews 
ADD COLUMN IF NOT EXISTS title VARCHAR(200),
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Drop existing storage policies if they exist and recreate them
DROP POLICY IF EXISTS "Authenticated users can upload review images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read review images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their folder" ON storage.objects;

-- Fix storage policies for customer-uploads bucket to allow review image uploads
CREATE POLICY "Authenticated users can upload review images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'customer-uploads' 
  AND (storage.foldername(name))[1] = 'review-images'
);

CREATE POLICY "Authenticated users can read review images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-uploads' 
  AND (storage.foldername(name))[1] = 'review-images'
);

-- Public read access for review images
CREATE POLICY "Public can view review images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'customer-uploads' 
  AND (storage.foldername(name))[1] = 'review-images'
);

-- Add RLS policies for shop_reviews if missing
DO $$ 
BEGIN
  -- Drop and recreate to avoid conflicts
  DROP POLICY IF EXISTS "Customers can create reviews" ON shop_reviews;
  DROP POLICY IF EXISTS "Anyone can view approved reviews" ON shop_reviews;
  
  CREATE POLICY "Customers can create reviews"
  ON shop_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

  CREATE POLICY "Anyone can view approved reviews"
  ON shop_reviews
  FOR SELECT
  TO public
  USING (review_status = 'approved' OR customer_id = auth.uid());
END $$;