-- Fix search_path for payment functions
CREATE OR REPLACE FUNCTION get_daily_payment_usage(user_id UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_amount DECIMAL,
  transaction_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0) as total_amount,
    COUNT(*) as transaction_count
  FROM payment_requests
  WHERE customer_id = user_id
    AND DATE(created_at) = target_date
    AND status IN ('customer_claimed_success', 'shop_confirmed', 'verified');
END;
$$;

CREATE OR REPLACE FUNCTION get_user_account_age_hours(user_id UUID)
RETURNS NUMERIC 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  age_hours NUMERIC;
BEGIN
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 INTO age_hours
  FROM users
  WHERE id = user_id;

  RETURN COALESCE(age_hours, 0);
END;
$$;