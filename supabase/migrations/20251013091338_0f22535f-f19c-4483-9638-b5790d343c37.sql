-- Remove redundant date columns from featured_items table
-- We're standardizing on featured_until (already populated by dialogs)
-- and created_at (auto-populated by database)

ALTER TABLE featured_items 
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS end_date;

-- Add comment for clarity
COMMENT ON COLUMN featured_items.featured_until IS 'When the featured period expires. Set by feature dialogs.';