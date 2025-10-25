-- Add expires_at column to inquiries table
ALTER TABLE public.inquiries
ADD COLUMN expires_at timestamp with time zone;