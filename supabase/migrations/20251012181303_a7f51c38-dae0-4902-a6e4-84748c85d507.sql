-- Update the create_shop_credits function to properly award initial credits
CREATE OR REPLACE FUNCTION public.create_shop_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_shop_credits_on_insert ON public.shops;

-- Create the trigger to fire after shop creation
CREATE TRIGGER create_shop_credits_on_insert
  AFTER INSERT ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION create_shop_credits();