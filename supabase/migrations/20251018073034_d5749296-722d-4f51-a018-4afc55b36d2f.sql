-- Add missing featured_until column to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;