-- Create trigger function to automatically create payment_requests from inquiry_responses
CREATE OR REPLACE FUNCTION create_payment_request_from_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if payment_requested is true and final_price meets minimum requirements (₹50 - ₹100,000)
  IF NEW.payment_requested = true 
     AND NEW.final_price IS NOT NULL 
     AND NEW.final_price >= 50 
     AND NEW.final_price <= 100000 THEN
    
    -- Check if payment_request already exists for this inquiry
    IF NOT EXISTS (
      SELECT 1 FROM payment_requests 
      WHERE inquiry_id = NEW.inquiry_id
    ) THEN
      
      -- Create the payment_requests record
      INSERT INTO payment_requests (
        inquiry_id,
        customer_id,
        shop_id,
        amount,
        status,
        payment_method
      )
      SELECT 
        i.id,
        i.customer_id,
        i.shop_id,
        NEW.final_price,
        'initiated',
        'UPI'
      FROM inquiries i
      WHERE i.id = NEW.inquiry_id;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_inquiry_response_payment_requested ON inquiry_responses;

-- Create trigger to fire on INSERT or UPDATE
CREATE TRIGGER on_inquiry_response_payment_requested
  AFTER INSERT OR UPDATE OF payment_requested, final_price ON inquiry_responses
  FOR EACH ROW
  EXECUTE FUNCTION create_payment_request_from_response();

-- Backfill existing data: Create payment_requests for inquiry_responses with valid payment amounts (₹50 - ₹100,000)
INSERT INTO payment_requests (
  inquiry_id,
  customer_id,
  shop_id,
  amount,
  status,
  payment_method
)
SELECT 
  i.id,
  i.customer_id,
  i.shop_id,
  ir.final_price,
  'initiated',
  'UPI'
FROM inquiry_responses ir
JOIN inquiries i ON i.id = ir.inquiry_id
WHERE ir.payment_requested = true 
  AND ir.final_price IS NOT NULL
  AND ir.final_price >= 50
  AND ir.final_price <= 100000
  AND NOT EXISTS (
    SELECT 1 FROM payment_requests pr 
    WHERE pr.inquiry_id = ir.inquiry_id
  );