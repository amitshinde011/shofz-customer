-- Update payment_status enum to match PhonePe response codes
DO $$ 
BEGIN
  -- Check if 'completed' value exists and 'success' doesn't
  IF EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'completed' 
    AND enumtypid = 'payment_status'::regtype
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'success' 
    AND enumtypid = 'payment_status'::regtype
  ) THEN
    -- Rename 'completed' to 'success'
    ALTER TYPE payment_status RENAME VALUE 'completed' TO 'success';
  END IF;
END $$;

-- Add helper function to check available credits
CREATE OR REPLACE FUNCTION public.get_available_credits_for_payment(p_shop_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_reserved INTEGER;
BEGIN
  SELECT total_credits, reserved_credits 
  INTO v_total, v_reserved
  FROM shop_credits
  WHERE shop_id = p_shop_id;
  
  RETURN COALESCE(v_total - v_reserved, 0);
END;
$$;

-- Add function to award credits atomically
CREATE OR REPLACE FUNCTION public.award_credits(
  p_shop_id uuid,
  p_credits integer,
  p_payment_transaction_id uuid,
  p_credit_plan_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits integer;
BEGIN
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
  
  -- Record credit transaction
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
    p_shop_id
  );
END;
$$;