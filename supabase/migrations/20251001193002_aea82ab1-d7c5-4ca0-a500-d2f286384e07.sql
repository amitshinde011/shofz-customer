-- Add missing columns to offers table
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS applicable_to VARCHAR(50) DEFAULT 'all',
ADD COLUMN IF NOT EXISTS applicable_categories TEXT[],
ADD COLUMN IF NOT EXISTS terms_conditions TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS offer_type VARCHAR(50) DEFAULT 'percentage';

-- Update existing records to have default values
UPDATE offers 
SET applicable_to = 'all' 
WHERE applicable_to IS NULL;

UPDATE offers 
SET offer_type = 'percentage' 
WHERE offer_type IS NULL;