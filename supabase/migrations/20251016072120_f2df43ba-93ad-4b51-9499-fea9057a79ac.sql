-- Create function to update inquiry status when response is created
CREATE OR REPLACE FUNCTION update_inquiry_status_on_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Update inquiry status to 'in_progress' when first response is created
  UPDATE inquiries
  SET 
    status = 'in_progress',
    updated_at = now()
  WHERE id = NEW.inquiry_id
    AND status = 'pending';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_inquiry_status ON inquiry_responses;

CREATE TRIGGER trigger_update_inquiry_status
  AFTER INSERT ON inquiry_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiry_status_on_response();