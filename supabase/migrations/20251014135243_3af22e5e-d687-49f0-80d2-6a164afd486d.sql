-- Ensure inquiries table has REPLICA IDENTITY FULL for complete real-time updates
ALTER TABLE inquiries REPLICA IDENTITY FULL;

-- Verify the table is in the realtime publication
-- This should already be enabled, but we'll check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'inquiries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE inquiries;
  END IF;
END $$;