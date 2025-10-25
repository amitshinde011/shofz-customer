-- Add missing columns to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS inventory_tracking BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC,
ADD COLUMN IF NOT EXISTS cost_price NUMERIC;

-- Add image_url to inquiries table
ALTER TABLE public.inquiries
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Make valid_until optional in offers by setting a default
ALTER TABLE public.offers
ALTER COLUMN valid_until DROP NOT NULL;