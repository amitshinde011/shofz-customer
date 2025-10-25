-- Add new inquiry status values to support quote workflow
-- Note: PostgreSQL doesn't allow dropping enum values, so we keep existing ones for backward compatibility

-- Add 'quoted' status (when shop sends a quote)
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'quoted';

-- Add 'accepted' status (when customer accepts the quote)
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'accepted';

-- Add 'rejected' status (when customer rejects the quote)
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'rejected';

-- Comment for documentation
COMMENT ON TYPE inquiry_status IS 'Status flow: pending -> quoted -> accepted/rejected -> completed/expired';
