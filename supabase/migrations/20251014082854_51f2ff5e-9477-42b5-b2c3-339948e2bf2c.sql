-- Create or replace the trigger function for generating referral codes
CREATE OR REPLACE FUNCTION public.create_shop_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO referral_codes (shop_id, referral_code)
    VALUES (NEW.id, generate_referral_code(NEW.name))
    ON CONFLICT (shop_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Attach trigger to shops table (drop first if exists)
DROP TRIGGER IF EXISTS trigger_create_shop_referral_code ON shops;
CREATE TRIGGER trigger_create_shop_referral_code
    AFTER INSERT ON shops
    FOR EACH ROW
    EXECUTE FUNCTION create_shop_referral_code();

-- Backfill referral codes for existing shops that don't have one
INSERT INTO referral_codes (shop_id, referral_code)
SELECT 
    s.id,
    generate_referral_code(s.name)
FROM shops s
LEFT JOIN referral_codes rc ON s.id = rc.shop_id
WHERE rc.id IS NULL;

-- Initialize shop_credits for shops without one
INSERT INTO shop_credits (shop_id)
SELECT s.id
FROM shops s
LEFT JOIN shop_credits sc ON s.id = sc.shop_id
WHERE sc.id IS NULL;