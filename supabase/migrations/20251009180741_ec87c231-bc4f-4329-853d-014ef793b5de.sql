-- Fix award_credits function to set expiration date based on plan validity
CREATE OR REPLACE FUNCTION public.award_credits(
  p_shop_id UUID,
  p_credits INTEGER,
  p_transaction_type credit_transaction_type,
  p_description TEXT,
  p_credit_plan_id UUID DEFAULT NULL,
  p_payment_transaction_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_transaction_id UUID;
  v_balance_after INTEGER;
  v_validity_days INTEGER;
  v_new_expire_at TIMESTAMP WITH TIME ZONE;
  v_current_expire_at TIMESTAMP WITH TIME ZONE;
  v_owner_id UUID;
BEGIN
  -- Get shop owner_id
  SELECT owner_id INTO v_owner_id
  FROM shops
  WHERE id = p_shop_id;

  -- Get validity days from credit plan if provided
  IF p_credit_plan_id IS NOT NULL THEN
    SELECT validity_days INTO v_validity_days
    FROM credit_plans
    WHERE id = p_credit_plan_id;
    
    -- Calculate new expiration date
    v_new_expire_at := NOW() + (v_validity_days || ' days')::INTERVAL;
  END IF;

  -- Get current expiration date
  SELECT credits_expire_at INTO v_current_expire_at
  FROM shop_credits
  WHERE shop_id = p_shop_id;

  -- Update shop credits with new balance and expiration
  UPDATE shop_credits
  SET 
    total_credits = total_credits + p_credits,
    reserved_credits = CASE 
      WHEN p_transaction_type = 'refund' THEN GREATEST(0, reserved_credits - ABS(p_credits))
      ELSE reserved_credits
    END,
    lifetime_credits_purchased = CASE 
      WHEN p_transaction_type = 'purchase' THEN lifetime_credits_purchased + p_credits
      ELSE lifetime_credits_purchased
    END,
    last_purchase_at = CASE 
      WHEN p_transaction_type = 'purchase' THEN NOW()
      ELSE last_purchase_at
    END,
    -- Set expiration to the later of current or new expiration
    credits_expire_at = CASE
      WHEN v_new_expire_at IS NOT NULL THEN
        CASE
          WHEN v_current_expire_at IS NULL OR v_new_expire_at > v_current_expire_at 
          THEN v_new_expire_at
          ELSE v_current_expire_at
        END
      ELSE credits_expire_at
    END,
    updated_at = NOW()
  WHERE shop_id = p_shop_id
  RETURNING total_credits - reserved_credits INTO v_balance_after;

  -- Create transaction record
  INSERT INTO credit_transactions (
    shop_id,
    transaction_type,
    amount,
    balance_after,
    description,
    payment_transaction_id,
    created_by
  )
  VALUES (
    p_shop_id,
    p_transaction_type,
    p_credits,
    v_balance_after,
    p_description,
    p_payment_transaction_id,
    COALESCE(p_created_by, v_owner_id)
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;