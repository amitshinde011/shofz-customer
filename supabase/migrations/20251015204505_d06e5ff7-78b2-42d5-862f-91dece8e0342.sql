-- Add new status to enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'inquiry_status' AND e.enumlabel = 'in_progress'
  ) THEN
    ALTER TYPE inquiry_status ADD VALUE 'in_progress';
  END IF;
END $$;

-- Migrate existing data: quoted -> in_progress, accepted -> in_progress
UPDATE inquiries
SET status = 'in_progress'
WHERE status IN ('quoted', 'accepted');

-- Update messages table to support structured messages (already supported, just ensuring)
COMMENT ON COLUMN messages.message_type IS 'Message type: text, image, file, quote, payment_request';
COMMENT ON COLUMN messages.attachments IS 'JSONB field for structured data like quotes and payment requests';

-- Add index for better query performance on message types
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_inquiry_type ON messages(inquiry_id, message_type);