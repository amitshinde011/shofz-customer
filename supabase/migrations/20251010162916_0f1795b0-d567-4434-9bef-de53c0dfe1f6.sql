-- Add platform setting for initial shop credits
INSERT INTO platform_settings (key, value, description, category)
VALUES (
  'initial_shop_credits',
  '100'::jsonb,
  'Number of credits awarded to new shops upon creation',
  'credits'
)
ON CONFLICT (key) DO NOTHING;

-- Update the shop credits creation trigger to award initial credits
CREATE OR REPLACE FUNCTION public.create_shop_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  initial_credits INTEGER;
BEGIN
  -- Get initial credits from platform settings
  SELECT (value::text)::integer INTO initial_credits
  FROM platform_settings
  WHERE key = 'initial_shop_credits';
  
  -- Default to 100 if setting not found
  initial_credits := COALESCE(initial_credits, 100);
  
  -- Create shop credits record with initial credits
  INSERT INTO shop_credits (shop_id, total_credits, lifetime_credits_purchased)
  VALUES (NEW.id, initial_credits, initial_credits)
  ON CONFLICT (shop_id) DO NOTHING;
  
  -- Create transaction record for initial credits
  IF initial_credits > 0 THEN
    INSERT INTO credit_transactions (
      shop_id,
      transaction_type,
      amount,
      balance_after,
      description,
      reference_type
    )
    VALUES (
      NEW.id,
      'purchase',
      initial_credits,
      initial_credits,
      'Initial shop credits',
      'system_grant'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;