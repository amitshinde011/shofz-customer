-- Add delivery-related fields to inquiries table
-- Run this in your Supabase SQL Editor

ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'pickup',
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_location JSONB;

-- Add comments for documentation
COMMENT ON COLUMN inquiries.order_type IS 'Type of order: pickup or delivery';
COMMENT ON COLUMN inquiries.delivery_address IS 'Customer delivery address if order_type is delivery';
COMMENT ON COLUMN inquiries.delivery_location IS 'Delivery location coordinates {lat, lng}';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'inquiries'
AND column_name IN ('order_type', 'delivery_address', 'delivery_location');
