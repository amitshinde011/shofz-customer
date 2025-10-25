-- Add missing column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone_number VARCHAR;

-- Add missing column to inquiries table  
ALTER TABLE public.inquiries
ADD COLUMN IF NOT EXISTS preferred_contact VARCHAR DEFAULT 'chat';

-- Add missing columns to featured_items table that the code expects
ALTER TABLE public.featured_items
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active',
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS daily_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_credits_allocated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_consumed INTEGER DEFAULT 0;

-- Update end_date for existing featured items based on featured_until
UPDATE public.featured_items
SET end_date = featured_until
WHERE end_date IS NULL;

-- Update start_date for existing items based on created_at
UPDATE public.featured_items  
SET start_date = created_at
WHERE start_date IS NULL OR start_date = now();

-- Update total_credits_allocated from credits_used for existing items
UPDATE public.featured_items
SET total_credits_allocated = credits_used,
    credits_consumed = credits_used
WHERE total_credits_allocated = 0;