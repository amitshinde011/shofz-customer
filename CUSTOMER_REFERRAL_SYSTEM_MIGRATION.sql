-- =====================================================
-- CUSTOMER-TO-BUSINESS REFERRAL SYSTEM MIGRATION
-- =====================================================
-- This migration creates a complete referral system where customers
-- can refer businesses/shops and earn money via UPI payments.
-- =====================================================

-- =====================================================
-- SECTION 1: ADD COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add referral columns to customer_profiles
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS total_referral_earnings NUMERIC(10,2) DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_profiles_referral_code 
ON customer_profiles(referral_code) WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_profiles_upi_id 
ON customer_profiles(upi_id) WHERE upi_id IS NOT NULL;

-- Add UNIQUE constraint to prevent duplicate referral codes
ALTER TABLE customer_profiles
DROP CONSTRAINT IF EXISTS customer_profiles_referral_code_unique;

ALTER TABLE customer_profiles
ADD CONSTRAINT customer_profiles_referral_code_unique 
UNIQUE (referral_code);

-- Add referral tracking columns to shops
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS referred_by_customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS customer_referral_code_used VARCHAR(20);

-- Add indexes for referral tracking
CREATE INDEX IF NOT EXISTS idx_shops_referred_by_customer 
ON shops(referred_by_customer_id) WHERE referred_by_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shops_customer_referral_code 
ON shops(customer_referral_code_used) WHERE customer_referral_code_used IS NOT NULL;

-- Add comments
COMMENT ON COLUMN customer_profiles.referral_code IS 'Unique referral code for this customer to share with businesses';
COMMENT ON COLUMN customer_profiles.upi_id IS 'UPI ID for receiving referral earnings payouts';
COMMENT ON COLUMN customer_profiles.total_referral_earnings IS 'Total amount earned from all referrals (cumulative)';
COMMENT ON COLUMN shops.referred_by_customer_id IS 'Customer who referred this shop';
COMMENT ON COLUMN shops.customer_referral_code_used IS 'The referral code used during shop onboarding';

-- =====================================================
-- SECTION 2: CREATE NEW TABLES
-- =====================================================

-- Create customer_referral_earnings table
CREATE TABLE IF NOT EXISTS customer_referral_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    referral_code VARCHAR(20) NOT NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    shop_verified_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(100), -- UPI transaction ID
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(customer_id, shop_id) -- One earning record per customer-shop pair
);

-- Add indexes for customer_referral_earnings
CREATE INDEX IF NOT EXISTS idx_cust_ref_earnings_customer ON customer_referral_earnings(customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_ref_earnings_shop ON customer_referral_earnings(shop_id);
CREATE INDEX IF NOT EXISTS idx_cust_ref_earnings_status ON customer_referral_earnings(status);
CREATE INDEX IF NOT EXISTS idx_cust_ref_earnings_created ON customer_referral_earnings(created_at DESC);

-- Add comments
COMMENT ON TABLE customer_referral_earnings IS 'Tracks earnings for customers who referred businesses';
COMMENT ON COLUMN customer_referral_earnings.status IS 'pending: shop not verified yet, approved: shop verified but not paid, paid: payout completed, cancelled: referral invalidated';
COMMENT ON COLUMN customer_referral_earnings.payment_reference IS 'UPI transaction ID or payment reference number';

-- Create referral_payout_config table
CREATE TABLE IF NOT EXISTS referral_payout_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_per_verified_shop NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for active config
CREATE INDEX IF NOT EXISTS idx_ref_payout_config_active ON referral_payout_config(is_active) WHERE is_active = true;

-- Add comment
COMMENT ON TABLE referral_payout_config IS 'Configuration for customer referral payout amounts';
COMMENT ON COLUMN referral_payout_config.payout_per_verified_shop IS 'Amount paid to customer when referred shop gets verified';

-- Insert default configuration
INSERT INTO referral_payout_config (payout_per_verified_shop, is_active, notes)
VALUES (500.00, true, 'Initial default configuration - ₹500 per verified shop referral')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 3: CREATE TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp for customer_referral_earnings
CREATE OR REPLACE FUNCTION update_customer_referral_earnings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_referral_earnings_updated_at ON customer_referral_earnings;
CREATE TRIGGER update_customer_referral_earnings_updated_at
    BEFORE UPDATE ON customer_referral_earnings
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_referral_earnings_timestamp();

-- Trigger to update updated_at timestamp for referral_payout_config
DROP TRIGGER IF EXISTS update_referral_payout_config_updated_at ON referral_payout_config;
CREATE TRIGGER update_referral_payout_config_updated_at
    BEFORE UPDATE ON referral_payout_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- SECTION 4: DATABASE FUNCTIONS
-- =====================================================

-- Function to generate unique customer referral code (idempotent)
CREATE OR REPLACE FUNCTION generate_customer_referral_code(p_customer_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
    v_counter INTEGER := 0;
    v_max_attempts INTEGER := 100;
    v_customer_name TEXT;
    v_existing_code TEXT;
BEGIN
    -- FIRST: Check if customer already has a referral code
    SELECT referral_code INTO v_existing_code
    FROM customer_profiles
    WHERE user_id = p_customer_id
    AND referral_code IS NOT NULL
    AND referral_code != '';
    
    -- If code exists, return it (idempotent)
    IF v_existing_code IS NOT NULL THEN
        RETURN v_existing_code;
    END IF;
    
    -- Get customer name from users table for personalization
    SELECT COALESCE(name, email) INTO v_customer_name
    FROM users
    WHERE id = p_customer_id
    LIMIT 1;
    
    -- Generate a unique code
    LOOP
        -- Format: First 4 chars of name (uppercase, alphanumeric only) + 4 random digits
        -- Example: JOHN1234, JANE5678
        v_code := UPPER(
            REGEXP_REPLACE(
                LEFT(COALESCE(v_customer_name, 'CUST'), 4), 
                '[^A-Z0-9]', 
                '', 
                'g'
            )
        ) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- Check if code already exists
        SELECT EXISTS(
            SELECT 1 FROM customer_profiles WHERE referral_code = v_code
        ) INTO v_exists;
        
        -- Exit loop if code is unique or max attempts reached
        EXIT WHEN NOT v_exists OR v_counter >= v_max_attempts;
        
        v_counter := v_counter + 1;
    END LOOP;
    
    -- If still not unique after max attempts, use UUID-based fallback
    IF v_exists THEN
        v_code := 'CUST' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));
    END IF;
    
    -- CRITICAL: Update the customer_profiles table with the new code
    UPDATE customer_profiles
    SET referral_code = v_code,
        updated_at = NOW()
    WHERE user_id = p_customer_id;
    
    -- Verify update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update customer profile with referral code for user %', p_customer_id;
    END IF;
    
    RETURN v_code;
END;
$$;

COMMENT ON FUNCTION generate_customer_referral_code IS 'Generates a unique 8-character referral code for customers';

-- Function to validate and get customer referral code details
CREATE OR REPLACE FUNCTION validate_customer_referral_code(p_referral_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id UUID;
    v_customer_name TEXT;
    v_result JSON;
BEGIN
    -- Find customer with this referral code
    SELECT cp.user_id, u.name
    INTO v_customer_id, v_customer_name
    FROM customer_profiles cp
    JOIN users u ON cp.user_id = u.id
    WHERE cp.referral_code = UPPER(TRIM(p_referral_code))
    LIMIT 1;
    
    IF v_customer_id IS NULL THEN
        RETURN json_build_object(
            'valid', false,
            'message', 'Invalid referral code'
        );
    END IF;
    
    RETURN json_build_object(
        'valid', true,
        'customer_id', v_customer_id,
        'customer_name', v_customer_name,
        'message', 'Valid referral code'
    );
END;
$$;

COMMENT ON FUNCTION validate_customer_referral_code IS 'Validates a customer referral code and returns customer details';

-- Function to process shop referral when shop is verified
CREATE OR REPLACE FUNCTION process_shop_referral_earning(p_shop_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id UUID;
    v_referral_code TEXT;
    v_payout_amount NUMERIC;
    v_earning_id UUID;
    v_existing_status TEXT;
BEGIN
    -- Get shop referral info
    SELECT referred_by_customer_id, customer_referral_code_used
    INTO v_customer_id, v_referral_code
    FROM shops
    WHERE id = p_shop_id;
    
    -- If no referral, exit
    IF v_customer_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Shop was not referred by a customer'
        );
    END IF;
    
    -- Check if earning record already exists
    SELECT id, status INTO v_earning_id, v_existing_status
    FROM customer_referral_earnings
    WHERE customer_id = v_customer_id AND shop_id = p_shop_id;
    
    -- Get current payout amount from config
    SELECT payout_per_verified_shop INTO v_payout_amount
    FROM referral_payout_config
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    v_payout_amount := COALESCE(v_payout_amount, 0);
    
    IF v_earning_id IS NULL THEN
        -- Create new earning record
        INSERT INTO customer_referral_earnings (
            customer_id,
            shop_id,
            referral_code,
            amount,
            status,
            shop_verified_at
        ) VALUES (
            v_customer_id,
            p_shop_id,
            v_referral_code,
            v_payout_amount,
            'approved',
            now()
        ) RETURNING id INTO v_earning_id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Referral earning created and approved',
            'earning_id', v_earning_id,
            'amount', v_payout_amount
        );
    ELSIF v_existing_status = 'pending' THEN
        -- Update existing pending record to approved
        UPDATE customer_referral_earnings
        SET status = 'approved',
            amount = v_payout_amount,
            shop_verified_at = now(),
            updated_at = now()
        WHERE id = v_earning_id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Referral earning approved',
            'earning_id', v_earning_id,
            'amount', v_payout_amount
        );
    ELSE
        -- Already processed
        RETURN json_build_object(
            'success', false,
            'message', 'Referral earning already processed',
            'status', v_existing_status
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION process_shop_referral_earning IS 'Processes referral earning when a shop gets verified';

-- Function to mark earning as paid and update customer total
CREATE OR REPLACE FUNCTION mark_referral_earning_paid(
    p_earning_id UUID,
    p_payment_reference TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id UUID;
    v_amount NUMERIC;
    v_current_status TEXT;
BEGIN
    -- Get earning details
    SELECT customer_id, amount, status
    INTO v_customer_id, v_amount, v_current_status
    FROM customer_referral_earnings
    WHERE id = p_earning_id;
    
    IF v_customer_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Earning record not found'
        );
    END IF;
    
    IF v_current_status = 'paid' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Earning already marked as paid'
        );
    END IF;
    
    IF v_current_status != 'approved' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Can only pay approved earnings',
            'current_status', v_current_status
        );
    END IF;
    
    -- Update earning record
    UPDATE customer_referral_earnings
    SET status = 'paid',
        paid_at = now(),
        payment_reference = p_payment_reference,
        notes = COALESCE(p_notes, notes),
        updated_at = now()
    WHERE id = p_earning_id;
    
    -- Update customer's total earnings
    UPDATE customer_profiles
    SET total_referral_earnings = COALESCE(total_referral_earnings, 0) + v_amount
    WHERE user_id = v_customer_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Earning marked as paid',
        'amount', v_amount,
        'customer_id', v_customer_id
    );
END;
$$;

COMMENT ON FUNCTION mark_referral_earning_paid IS 'Marks a referral earning as paid and updates customer total earnings';

-- Function to get customer referral statistics
CREATE OR REPLACE FUNCTION get_customer_referral_stats(p_customer_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_referred INTEGER;
    v_verified_count INTEGER;
    v_pending_count INTEGER;
    v_total_all_earnings NUMERIC;
    v_pending_amount NUMERIC;
    v_approved_amount NUMERIC;
    v_referral_code TEXT;
    v_upi_id TEXT;
BEGIN
    -- Get referral code and UPI ID
    SELECT referral_code, upi_id
    INTO v_referral_code, v_upi_id
    FROM customer_profiles
    WHERE user_id = p_customer_id;
    
    -- Count total shops referred
    SELECT COUNT(*) INTO v_total_referred
    FROM shops
    WHERE referred_by_customer_id = p_customer_id;
    
    -- Count verified shops
    SELECT COUNT(*) INTO v_verified_count
    FROM shops
    WHERE referred_by_customer_id = p_customer_id
    AND is_verified = true;
    
    -- Count pending verification
    v_pending_count := v_total_referred - v_verified_count;
    
    -- Get pending earnings amount
    SELECT COALESCE(SUM(amount), 0) INTO v_pending_amount
    FROM customer_referral_earnings
    WHERE customer_id = p_customer_id
    AND status = 'pending';
    
    -- Get approved (not yet paid) amount
    SELECT COALESCE(SUM(amount), 0) INTO v_approved_amount
    FROM customer_referral_earnings
    WHERE customer_id = p_customer_id
    AND status = 'approved';
    
    -- Calculate total earnings (sum of ALL earnings: pending + approved + paid)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_all_earnings
    FROM customer_referral_earnings
    WHERE customer_id = p_customer_id;
    
    -- Return with field names matching TypeScript interface
    RETURN json_build_object(
        'referral_code', v_referral_code,
        'upi_id', v_upi_id,
        'total_shops_referred', v_total_referred,
        'verified_shops', v_verified_count,
        'pending_verification', v_pending_count,
        'total_earnings', v_total_all_earnings,
        'pending_earnings', v_pending_amount,
        'approved_earnings', v_approved_amount,
        'has_upi_id', v_upi_id IS NOT NULL
    );
END;
$$;

COMMENT ON FUNCTION get_customer_referral_stats IS 'Returns comprehensive referral statistics for a customer';

-- =====================================================
-- SECTION 5: TRIGGER FOR AUTO-PROCESSING REFERRALS
-- =====================================================

-- Function to auto-process referral when shop is verified
CREATE OR REPLACE FUNCTION auto_process_referral_on_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if shop just got verified
    IF NEW.is_verified = true AND (OLD.is_verified = false OR OLD.is_verified IS NULL) THEN
        -- Process the referral earning
        PERFORM process_shop_referral_earning(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on shops table
DROP TRIGGER IF EXISTS trigger_auto_process_referral ON shops;
CREATE TRIGGER trigger_auto_process_referral
    AFTER UPDATE OF is_verified ON shops
    FOR EACH ROW
    WHEN (NEW.is_verified = true)
    EXECUTE FUNCTION auto_process_referral_on_verification();

COMMENT ON TRIGGER trigger_auto_process_referral ON shops IS 'Automatically processes referral earning when shop gets verified';

-- =====================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on customer_referral_earnings
ALTER TABLE customer_referral_earnings ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own earnings
DROP POLICY IF EXISTS customer_referral_earnings_select_own ON customer_referral_earnings;
CREATE POLICY customer_referral_earnings_select_own ON customer_referral_earnings
    FOR SELECT
    USING (customer_id = auth.uid());

-- Policy: Admins can view all earnings
DROP POLICY IF EXISTS customer_referral_earnings_select_admin ON customer_referral_earnings;
CREATE POLICY customer_referral_earnings_select_admin ON customer_referral_earnings
    FOR SELECT
    USING (is_admin());

-- Policy: System can insert earnings (for referral processing)
DROP POLICY IF EXISTS customer_referral_earnings_insert_system ON customer_referral_earnings;
CREATE POLICY customer_referral_earnings_insert_system ON customer_referral_earnings
    FOR INSERT
    WITH CHECK (true); -- Will be controlled by SECURITY DEFINER functions

-- Policy: Admins can update earnings (for payment processing)
DROP POLICY IF EXISTS customer_referral_earnings_update_admin ON customer_referral_earnings;
CREATE POLICY customer_referral_earnings_update_admin ON customer_referral_earnings
    FOR UPDATE
    USING (is_admin());

-- Enable RLS on referral_payout_config
ALTER TABLE referral_payout_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active payout config
DROP POLICY IF EXISTS referral_payout_config_select_all ON referral_payout_config;
CREATE POLICY referral_payout_config_select_all ON referral_payout_config
    FOR SELECT
    USING (is_active = true);

-- Policy: Only admins can manage payout config
DROP POLICY IF EXISTS referral_payout_config_admin_all ON referral_payout_config;
CREATE POLICY referral_payout_config_admin_all ON referral_payout_config
    FOR ALL
    USING (is_admin());

-- Update customer_profiles RLS to allow updating referral fields
DROP POLICY IF EXISTS customer_profiles_update_own ON customer_profiles;
CREATE POLICY customer_profiles_update_own ON customer_profiles
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- SECTION 7: GRANTS
-- =====================================================

-- Grant necessary permissions
GRANT SELECT ON customer_referral_earnings TO authenticated;
GRANT INSERT ON customer_referral_earnings TO authenticated;
GRANT UPDATE ON customer_referral_earnings TO authenticated;

GRANT SELECT ON referral_payout_config TO authenticated;
GRANT INSERT, UPDATE, DELETE ON referral_payout_config TO authenticated;

-- =====================================================
-- SECTION 8: VERIFICATION QUERIES
-- =====================================================

-- Verify tables exist
DO $$
BEGIN
    RAISE NOTICE 'Verification Results:';
    RAISE NOTICE '- customer_referral_earnings table exists: %', 
        (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_referral_earnings'));
    RAISE NOTICE '- referral_payout_config table exists: %', 
        (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_payout_config'));
    RAISE NOTICE '- customer_profiles.referral_code column exists: %',
        (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_profiles' AND column_name = 'referral_code'));
    RAISE NOTICE '- shops.referred_by_customer_id column exists: %',
        (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'referred_by_customer_id'));
    RAISE NOTICE '- Default payout config exists: %',
        (SELECT EXISTS (SELECT 1 FROM referral_payout_config WHERE is_active = true));
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this migration on your database
-- 2. Test the functions manually
-- 3. Implement UI components in customer app
-- 4. Implement admin management interface
-- =====================================================
