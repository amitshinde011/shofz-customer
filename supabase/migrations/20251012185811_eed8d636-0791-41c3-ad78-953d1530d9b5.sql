-- Add missing columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add missing columns to inquiries table
ALTER TABLE public.inquiries
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS budget_min NUMERIC,
ADD COLUMN IF NOT EXISTS budget_max NUMERIC;