-- Update chat-attachments bucket to only allow images
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
]
WHERE id = 'chat-attachments';