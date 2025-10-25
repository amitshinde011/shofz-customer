-- Add trigger for new inquiry notifications
CREATE TRIGGER notify_inquiry_created
  AFTER INSERT ON inquiries
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_inquiry();

-- Add trigger for new message notifications
CREATE TRIGGER notify_message_created
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();