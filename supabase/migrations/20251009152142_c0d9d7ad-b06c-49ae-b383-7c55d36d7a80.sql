-- Fix award_credits function to use correct user_id for created_by
CREATE OR REPLACE FUNCTION public.award_credits(
  p_shop_id uuid, 
  p_credits integer, 
  p_payment_transaction_id uuid, 
  p_credit_plan_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_credits integer;
  v_user_id uuid;
BEGIN
  -- Get user_id from shop if not provided
  IF p_user_id IS NULL THEN
    SELECT owner_id INTO v_user_id FROM shops WHERE id = p_shop_id;
  ELSE
    v_user_id := p_user_id;
  END IF;

  -- Update shop credits
  UPDATE shop_credits
  SET 
    total_credits = total_credits + p_credits,
    lifetime_credits_purchased = lifetime_credits_purchased + p_credits,
    last_purchase_at = now(),
    updated_at = now()
  WHERE shop_id = p_shop_id
  RETURNING total_credits INTO v_current_credits;
  
  -- If shop_credits doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO shop_credits (shop_id, total_credits, lifetime_credits_purchased, last_purchase_at)
    VALUES (p_shop_id, p_credits, p_credits, now())
    RETURNING total_credits INTO v_current_credits;
  END IF;
  
  -- Record credit transaction with correct user_id
  INSERT INTO credit_transactions (
    shop_id,
    transaction_type,
    amount,
    balance_after,
    reference_type,
    reference_id,
    payment_transaction_id,
    description,
    created_by
  ) VALUES (
    p_shop_id,
    'purchase',
    p_credits,
    v_current_credits,
    'credit_plan',
    p_credit_plan_id,
    p_payment_transaction_id,
    'Credits purchased via PhonePe payment',
    v_user_id  -- Use actual user_id instead of shop_id
  );
END;
$$;