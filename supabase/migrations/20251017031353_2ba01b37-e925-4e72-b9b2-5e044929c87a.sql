-- =====================================================
-- CREDIT DEDUCTION SYSTEM FIX - DATABASE MIGRATION
-- Phase 1: Critical Infrastructure Changes
-- =====================================================

-- 1. Create featured_item_deductions table for audit trail
CREATE TABLE IF NOT EXISTS featured_item_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  featured_item_id UUID NOT NULL REFERENCES featured_items(id) ON DELETE CASCADE,
  deduction_date DATE NOT NULL,
  credits_deducted INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(featured_item_id, deduction_date)
);

CREATE INDEX IF NOT EXISTS idx_deductions_item ON featured_item_deductions(featured_item_id);
CREATE INDEX IF NOT EXISTS idx_deductions_date ON featured_item_deductions(deduction_date);

-- 2. Add missing columns to featured_items for better tracking and concurrency control
ALTER TABLE featured_items 
ADD COLUMN IF NOT EXISTS last_deduction_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS credits_consumed INTEGER DEFAULT 0;

-- Create index on status and featured_until for cron job efficiency
CREATE INDEX IF NOT EXISTS idx_featured_items_active ON featured_items(status, featured_until) WHERE status = 'active';

-- 3. Add validation trigger to prevent double-featuring and invalid states
CREATE OR REPLACE FUNCTION validate_feature_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if entity is active (products)
  IF NEW.entity_type = 'product' THEN
    IF NOT EXISTS (
      SELECT 1 FROM products 
      WHERE id = NEW.entity_id 
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Product must be active to be featured';
    END IF;
  -- Check if entity is active and not expired (offers)
  ELSIF NEW.entity_type = 'offer' THEN
    IF NOT EXISTS (
      SELECT 1 FROM offers 
      WHERE id = NEW.entity_id 
        AND is_active = true
        AND (valid_until IS NULL OR valid_until > NOW())
    ) THEN
      RAISE EXCEPTION 'Offer must be active and not expired to be featured';
    END IF;
  -- Check if shop is active
  ELSIF NEW.entity_type = 'shop' THEN
    IF NOT EXISTS (
      SELECT 1 FROM shops 
      WHERE id = NEW.entity_id 
        AND is_verified = true
    ) THEN
      RAISE EXCEPTION 'Shop must be verified to be featured';
    END IF;
  END IF;
  
  -- Check if already featured (prevent duplicate active features)
  IF EXISTS (
    SELECT 1 FROM featured_items
    WHERE entity_id = NEW.entity_id
      AND entity_type = NEW.entity_type
      AND status = 'active'
      AND featured_until > NOW()
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'This item is already featured';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'validate_feature_before_insert'
  ) THEN
    CREATE TRIGGER validate_feature_before_insert
    BEFORE INSERT ON featured_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_feature_request();
  END IF;
END $$;

-- 4. Add cleanup function for expired featured items
CREATE OR REPLACE FUNCTION cleanup_expired_featured_items()
RETURNS void AS $$
BEGIN
  -- Update products
  UPDATE products 
  SET is_featured = false, featured_until = null
  WHERE is_featured = true 
    AND featured_until < NOW();
  
  -- Update offers
  UPDATE offers 
  SET is_featured = false, featured_until = null
  WHERE is_featured = true 
    AND featured_until < NOW();
  
  -- Update shops
  UPDATE shops 
  SET is_featured = false, featured_until = null
  WHERE is_featured = true 
    AND featured_until < NOW();
    
  -- Mark featured_items as completed
  UPDATE featured_items
  SET status = 'completed'
  WHERE status = 'active'
    AND featured_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. Create RPC function to stop featuring (with refund)
CREATE OR REPLACE FUNCTION stop_featuring(
  p_featured_item_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_item featured_items;
  v_unused_credits INTEGER;
  v_shop_credits shop_credits;
  v_shop_owner_id UUID;
BEGIN
  -- Get featured item details
  SELECT * INTO v_item FROM featured_items WHERE id = p_featured_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Featured item not found';
  END IF;
  
  IF v_item.status != 'active' THEN
    RAISE EXCEPTION 'Featured item is not active';
  END IF;
  
  -- Calculate unused credits
  v_unused_credits := v_item.total_credits_allocated - v_item.credits_consumed;
  
  -- Get shop credits
  SELECT * INTO v_shop_credits FROM shop_credits WHERE shop_id = v_item.shop_id;
  
  -- Get shop owner
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = v_item.shop_id;
  
  -- Update featured_items status
  UPDATE featured_items
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_featured_item_id;
  
  -- Refund unused credits
  IF v_unused_credits > 0 THEN
    -- Add back to total_credits
    UPDATE shop_credits
    SET total_credits = total_credits + v_unused_credits,
        reserved_credits = GREATEST(0, reserved_credits - v_unused_credits),
        updated_at = NOW()
    WHERE shop_id = v_item.shop_id;
    
    -- Create refund transaction
    INSERT INTO credit_transactions (
      shop_id,
      transaction_type,
      amount,
      balance_after,
      reference_type,
      reference_id,
      description,
      created_by
    ) VALUES (
      v_item.shop_id,
      'refund',
      v_unused_credits,
      v_shop_credits.total_credits + v_unused_credits,
      'featured_item',
      p_featured_item_id,
      'Refund for early stop of featured ' || v_item.entity_type,
      v_shop_owner_id
    );
  END IF;
  
  -- Update the entity to remove featured status
  IF v_item.entity_type = 'product' THEN
    UPDATE products SET is_featured = false, featured_until = null WHERE id = v_item.entity_id;
  ELSIF v_item.entity_type = 'offer' THEN
    UPDATE offers SET is_featured = false, featured_until = null WHERE id = v_item.entity_id;
  ELSIF v_item.entity_type = 'shop' THEN
    UPDATE shops SET is_featured = false, featured_until = null WHERE id = v_item.entity_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'refunded_credits', v_unused_credits,
    'new_balance', v_shop_credits.total_credits + v_unused_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create RPC function to extend featuring period
CREATE OR REPLACE FUNCTION extend_featuring(
  p_featured_item_id UUID,
  p_additional_days INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_item featured_items;
  v_extension_cost INTEGER;
  v_shop_credits shop_credits;
  v_new_featured_until TIMESTAMPTZ;
  v_shop_owner_id UUID;
BEGIN
  -- Get featured item details
  SELECT * INTO v_item FROM featured_items WHERE id = p_featured_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Featured item not found';
  END IF;
  
  IF v_item.status != 'active' THEN
    RAISE EXCEPTION 'Can only extend active featured items';
  END IF;
  
  -- Calculate extension cost
  v_extension_cost := v_item.daily_cost * p_additional_days;
  
  -- Get shop credits
  SELECT * INTO v_shop_credits FROM shop_credits WHERE shop_id = v_item.shop_id;
  
  -- Check if enough credits available
  IF (v_shop_credits.total_credits - v_shop_credits.reserved_credits) < v_extension_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Need % but only % available', 
      v_extension_cost, 
      (v_shop_credits.total_credits - v_shop_credits.reserved_credits);
  END IF;
  
  -- Get shop owner
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = v_item.shop_id;
  
  -- Calculate new featured_until date
  v_new_featured_until := v_item.featured_until + (p_additional_days || ' days')::INTERVAL;
  
  -- Deduct credits and add to reserved
  UPDATE shop_credits
  SET total_credits = total_credits - v_extension_cost,
      reserved_credits = reserved_credits + v_extension_cost,
      updated_at = NOW()
  WHERE shop_id = v_item.shop_id;
  
  -- Update featured_items
  UPDATE featured_items
  SET featured_until = v_new_featured_until,
      total_credits_allocated = total_credits_allocated + v_extension_cost,
      updated_at = NOW()
  WHERE id = p_featured_item_id;
  
  -- Create transaction record
  INSERT INTO credit_transactions (
    shop_id,
    transaction_type,
    amount,
    balance_after,
    reference_type,
    reference_id,
    description,
    created_by
  ) VALUES (
    v_item.shop_id,
    'deduction',
    -v_extension_cost,
    v_shop_credits.total_credits - v_extension_cost,
    'featured_item',
    p_featured_item_id,
    'Extension of featured ' || v_item.entity_type || ' by ' || p_additional_days || ' days',
    v_shop_owner_id
  );
  
  -- Update entity's featured_until
  IF v_item.entity_type = 'product' THEN
    UPDATE products SET featured_until = v_new_featured_until WHERE id = v_item.entity_id;
  ELSIF v_item.entity_type = 'offer' THEN
    UPDATE offers SET featured_until = v_new_featured_until WHERE id = v_item.entity_id;
  ELSIF v_item.entity_type = 'shop' THEN
    UPDATE shops SET featured_until = v_new_featured_until WHERE id = v_item.entity_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'extension_cost', v_extension_cost,
    'new_featured_until', v_new_featured_until,
    'new_balance', v_shop_credits.total_credits - v_extension_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;