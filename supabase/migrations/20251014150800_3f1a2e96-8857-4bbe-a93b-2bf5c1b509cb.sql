-- Step 1: Delete duplicate referral transactions, keeping only the earliest one per customer
DELETE FROM referral_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY referred_customer_id ORDER BY created_at ASC) as rn
    FROM referral_transactions
    WHERE referred_customer_id IS NOT NULL
  ) t
  WHERE t.rn > 1
);

-- Step 2: Create partial unique index to prevent duplicate customer referrals
CREATE UNIQUE INDEX IF NOT EXISTS unique_customer_referral 
ON referral_transactions (referred_customer_id) 
WHERE referred_customer_id IS NOT NULL;

-- Step 3: Update process_referral_transaction function to check for duplicates
CREATE OR REPLACE FUNCTION public.process_referral_transaction(
    p_referrer_shop_id uuid,
    p_referred_entity_type text,
    p_referral_code text,
    p_referred_shop_id uuid DEFAULT NULL::uuid,
    p_referred_customer_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    referrer_credits INTEGER;
    referred_credits INTEGER;
    transaction_id UUID;
    referrer_balance INTEGER;
    referred_balance INTEGER;
    existing_referral_count INTEGER;
BEGIN
    -- Check if customer has already used a referral code
    IF p_referred_entity_type = 'customer' AND p_referred_customer_id IS NOT NULL THEN
        SELECT COUNT(*) INTO existing_referral_count
        FROM referral_transactions
        WHERE referred_customer_id = p_referred_customer_id;
        
        IF existing_referral_count > 0 THEN
            RAISE EXCEPTION 'Customer has already used a referral code';
        END IF;
    END IF;

    -- Check if shop has already been referred
    IF p_referred_entity_type = 'shop' AND p_referred_shop_id IS NOT NULL THEN
        SELECT COUNT(*) INTO existing_referral_count
        FROM referral_transactions
        WHERE referred_shop_id = p_referred_shop_id
          AND transaction_status = 'completed';
        
        IF existing_referral_count > 0 THEN
            RAISE EXCEPTION 'This shop has already used a referral code';
        END IF;
    END IF;

    -- Get credit amounts from config
    IF p_referred_entity_type = 'shop' THEN
        SELECT config_value INTO referrer_credits FROM referral_config WHERE config_key = 'shop_referral_credits_referrer';
        SELECT config_value INTO referred_credits FROM referral_config WHERE config_key = 'shop_referral_credits_referred';
    ELSE
        SELECT config_value INTO referrer_credits FROM referral_config WHERE config_key = 'customer_referral_credits';
        referred_credits := 0;
    END IF;
    
    -- Create referral transaction
    INSERT INTO referral_transactions (
        referrer_shop_id, referred_entity_type, referred_shop_id, 
        referred_customer_id, referral_code, referrer_credits, 
        referred_credits, transaction_status, processed_at
    ) VALUES (
        p_referrer_shop_id, p_referred_entity_type::referral_entity_type, p_referred_shop_id,
        p_referred_customer_id, p_referral_code, referrer_credits,
        referred_credits, 'completed'::referral_transaction_status, now()
    ) RETURNING id INTO transaction_id;
    
    -- Update referrer shop credits
    UPDATE shop_credits 
    SET total_credits = total_credits + referrer_credits,
        earned_from_shop_referrals = CASE WHEN p_referred_entity_type = 'shop' 
                                          THEN earned_from_shop_referrals + referrer_credits 
                                          ELSE earned_from_shop_referrals END,
        earned_from_customer_referrals = CASE WHEN p_referred_entity_type = 'customer' 
                                               THEN earned_from_customer_referrals + referrer_credits 
                                               ELSE earned_from_customer_referrals END,
        updated_at = now()
    WHERE shop_id = p_referrer_shop_id
    RETURNING total_credits - reserved_credits INTO referrer_balance;
    
    -- Update referred shop credits if applicable
    IF p_referred_entity_type = 'shop' AND p_referred_shop_id IS NOT NULL AND referred_credits > 0 THEN
        UPDATE shop_credits 
        SET total_credits = total_credits + referred_credits,
            updated_at = now()
        WHERE shop_id = p_referred_shop_id
        RETURNING total_credits - reserved_credits INTO referred_balance;
    END IF;
    
    -- Update referral code statistics
    UPDATE referral_codes
    SET total_referrals = total_referrals + 1,
        successful_referrals = successful_referrals + 1,
        total_earnings = total_earnings + referrer_credits,
        updated_at = now()
    WHERE referral_code = p_referral_code;
    
    RETURN transaction_id;
END;
$function$;