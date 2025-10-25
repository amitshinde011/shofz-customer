-- Make inquiry_id optional in shop_reviews table
ALTER TABLE shop_reviews 
ALTER COLUMN inquiry_id DROP NOT NULL;

-- Create function to check if user can review shop directly
CREATE OR REPLACE FUNCTION can_review_shop_directly(
  p_customer_id uuid,
  p_shop_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_recent_review BOOLEAN;
BEGIN
  -- Check if user has reviewed this shop in last 30 days
  SELECT EXISTS(
    SELECT 1 FROM shop_reviews
    WHERE customer_id = p_customer_id 
    AND shop_id = p_shop_id
    AND created_at > now() - INTERVAL '30 days'
  ) INTO has_recent_review;
  
  RETURN NOT has_recent_review;
END;
$$;