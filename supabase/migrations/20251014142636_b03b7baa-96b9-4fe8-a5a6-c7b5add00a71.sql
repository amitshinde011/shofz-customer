-- Step 1: Clean up duplicate referral transactions (keep first, mark others as cancelled)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY referred_shop_id 
           ORDER BY created_at ASC
         ) as rn
  FROM referral_transactions
  WHERE transaction_status = 'completed' 
    AND referred_shop_id IS NOT NULL
)
UPDATE referral_transactions
SET transaction_status = 'cancelled'
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Create unique constraint to prevent duplicate completed referrals
CREATE UNIQUE INDEX IF NOT EXISTS unique_completed_referral_per_shop 
ON referral_transactions (referred_shop_id) 
WHERE transaction_status = 'completed' AND referred_shop_id IS NOT NULL;

-- Step 3: Update process_referral_transaction function to check for existing referrals
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
    -- NEW: Check if shop has already been referred
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
    
    -- Log credit transaction for referrer
    INSERT INTO credit_transactions (
        shop_id, transaction_type, amount, balance_after, 
        description, reference_id, reference_type, created_by
    ) VALUES (
        p_referrer_shop_id, 'referral_earned', referrer_credits, referrer_balance,
        'Referral bonus for ' || p_referred_entity_type || ' signup',
        transaction_id, 'referral_transaction', p_referrer_shop_id
    );
    
    -- Award credits to referred shop if applicable
    IF p_referred_entity_type = 'shop' AND p_referred_shop_id IS NOT NULL THEN
        UPDATE shop_credits 
        SET total_credits = total_credits + referred_credits,
            earned_from_shop_referrals = earned_from_shop_referrals + referred_credits,
            updated_at = now()
        WHERE shop_id = p_referred_shop_id
        RETURNING total_credits - reserved_credits INTO referred_balance;
        
        INSERT INTO credit_transactions (
            shop_id, transaction_type, amount, balance_after,
            description, reference_id, reference_type, created_by
        ) VALUES (
            p_referred_shop_id, 'referral_earned', referred_credits, referred_balance,
            'Welcome bonus for joining via referral',
            transaction_id, 'referral_transaction', p_referrer_shop_id
        );
    END IF;
    
    RETURN transaction_id;
END;
$function$;