-- Add attachments column to messages table
ALTER TABLE messages 
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;