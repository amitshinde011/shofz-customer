-- ============================================================================
-- CRITICAL FIX: Atomic Feature Creation RPCs & Race Condition Fixes
-- This migration creates new RPC functions that handle all credit deduction
-- and feature creation in a single database transaction to prevent data
-- inconsistency from partial failures.
-- ============================================================================

-- 1. CREATE: feature_product_atomic RPC
CREATE OR REPLACE FUNCTION feature_product_atomic(
  p_shop_id UUID,
  p_product_id UUID,
  p_duration_days INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_daily_cost INTEGER;
  v_total_cost INTEGER;
  v_end_date TIMESTAMPTZ;
  v_current_credits shop_credits;
  v_available INTEGER;
  v_shop_owner_id UUID;
BEGIN
  -- 1. Get daily cost for featuring products
  SELECT daily_cost INTO v_daily_cost 
  FROM credit_costs 
  WHERE action_type = 'feature_product' AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit cost not configured for feature_product';
  END IF;
  
  -- 2. Calculate total cost and expiry
  v_total_cost := v_daily_cost * p_duration_days;
  v_end_date := NOW() + (p_duration_days || ' days')::INTERVAL;
  
  -- 3. Get and lock shop credits row (prevents race conditions)
  SELECT * INTO v_current_credits 
  FROM shop_credits 
  WHERE shop_id = p_shop_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop credits not found';
  END IF;
  
  -- 4. Check available balance (Model 1: total_credits is spendable)
  v_available := v_current_credits.total_credits;
  
  IF v_available < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', 
      v_total_cost, v_available;
  END IF;
  
  -- 5. Check if already featured (prevent duplicates)
  IF EXISTS(
    SELECT 1 FROM featured_items 
    WHERE entity_id = p_product_id 
      AND entity_type = 'product'
      AND status = 'active'
      AND featured_until > NOW()
  ) THEN
    RAISE EXCEPTION 'Product is already featured';
  END IF;
  
  -- 6. Get shop owner for audit trail
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = p_shop_id;
  
  -- 7. Deduct from total_credits, add to reserved (ATOMIC)
  UPDATE shop_credits
  SET total_credits = total_credits - v_total_cost,
      reserved_credits = reserved_credits + v_total_cost,
      updated_at = NOW()
  WHERE shop_id = p_shop_id;
  
  -- 8. Log transaction (audit trail)
  INSERT INTO credit_transactions (
    shop_id, transaction_type, amount, balance_after, 
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_shop_id, 'usage', -v_total_cost, 
    v_current_credits.total_credits - v_total_cost,
    'product', p_product_id,
    'Product featuring (' || p_duration_days || ' days) - Full payment upfront',
    v_shop_owner_id
  );
  
  -- 9. Create featured_items record
  INSERT INTO featured_items (
    shop_id, entity_id, entity_type, featured_until,
    total_credits_allocated, daily_cost, credits_consumed,
    status, version
  ) VALUES (
    p_shop_id, p_product_id, 'product', v_end_date,
    v_total_cost, v_daily_cost, 0, 'active', 1
  );
  
  -- 10. Update product status
  UPDATE products
  SET is_featured = true, 
      featured_until = v_end_date,
      credits_cost = v_total_cost
  WHERE id = p_product_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'credits_deducted', v_total_cost,
    'featured_until', v_end_date,
    'new_balance', v_current_credits.total_credits - v_total_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. CREATE: feature_offer_atomic RPC
CREATE OR REPLACE FUNCTION feature_offer_atomic(
  p_shop_id UUID,
  p_offer_id UUID,
  p_duration_days INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_daily_cost INTEGER;
  v_total_cost INTEGER;
  v_end_date TIMESTAMPTZ;
  v_current_credits shop_credits;
  v_available INTEGER;
  v_shop_owner_id UUID;
BEGIN
  SELECT daily_cost INTO v_daily_cost 
  FROM credit_costs 
  WHERE action_type = 'feature_offer' AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit cost not configured for feature_offer';
  END IF;
  
  v_total_cost := v_daily_cost * p_duration_days;
  v_end_date := NOW() + (p_duration_days || ' days')::INTERVAL;
  
  SELECT * INTO v_current_credits 
  FROM shop_credits 
  WHERE shop_id = p_shop_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop credits not found';
  END IF;
  
  v_available := v_current_credits.total_credits;
  
  IF v_available < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', 
      v_total_cost, v_available;
  END IF;
  
  IF EXISTS(
    SELECT 1 FROM featured_items 
    WHERE entity_id = p_offer_id 
      AND entity_type = 'offer'
      AND status = 'active'
      AND featured_until > NOW()
  ) THEN
    RAISE EXCEPTION 'Offer is already featured';
  END IF;
  
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = p_shop_id;
  
  UPDATE shop_credits
  SET total_credits = total_credits - v_total_cost,
      reserved_credits = reserved_credits + v_total_cost,
      updated_at = NOW()
  WHERE shop_id = p_shop_id;
  
  INSERT INTO credit_transactions (
    shop_id, transaction_type, amount, balance_after, 
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_shop_id, 'usage', -v_total_cost, 
    v_current_credits.total_credits - v_total_cost,
    'offer', p_offer_id,
    'Offer featuring (' || p_duration_days || ' days) - Full payment upfront',
    v_shop_owner_id
  );
  
  INSERT INTO featured_items (
    shop_id, entity_id, entity_type, featured_until,
    total_credits_allocated, daily_cost, credits_consumed,
    status, version
  ) VALUES (
    p_shop_id, p_offer_id, 'offer', v_end_date,
    v_total_cost, v_daily_cost, 0, 'active', 1
  );
  
  UPDATE offers
  SET is_featured = true, 
      featured_until = v_end_date
  WHERE id = p_offer_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'credits_deducted', v_total_cost,
    'featured_until', v_end_date,
    'new_balance', v_current_credits.total_credits - v_total_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. CREATE: feature_shop_atomic RPC
CREATE OR REPLACE FUNCTION feature_shop_atomic(
  p_shop_id UUID,
  p_duration_days INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_daily_cost INTEGER;
  v_total_cost INTEGER;
  v_end_date TIMESTAMPTZ;
  v_current_credits shop_credits;
  v_available INTEGER;
  v_shop_owner_id UUID;
BEGIN
  SELECT daily_cost INTO v_daily_cost 
  FROM credit_costs 
  WHERE action_type = 'feature_shop' AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit cost not configured for feature_shop';
  END IF;
  
  v_total_cost := v_daily_cost * p_duration_days;
  v_end_date := NOW() + (p_duration_days || ' days')::INTERVAL;
  
  SELECT * INTO v_current_credits 
  FROM shop_credits 
  WHERE shop_id = p_shop_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop credits not found';
  END IF;
  
  v_available := v_current_credits.total_credits;
  
  IF v_available < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', 
      v_total_cost, v_available;
  END IF;
  
  IF EXISTS(
    SELECT 1 FROM featured_items 
    WHERE entity_id = p_shop_id 
      AND entity_type = 'shop'
      AND status = 'active'
      AND featured_until > NOW()
  ) THEN
    RAISE EXCEPTION 'Shop is already featured';
  END IF;
  
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = p_shop_id;
  
  UPDATE shop_credits
  SET total_credits = total_credits - v_total_cost,
      reserved_credits = reserved_credits + v_total_cost,
      updated_at = NOW()
  WHERE shop_id = p_shop_id;
  
  INSERT INTO credit_transactions (
    shop_id, transaction_type, amount, balance_after, 
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_shop_id, 'usage', -v_total_cost, 
    v_current_credits.total_credits - v_total_cost,
    'shop', p_shop_id,
    'Shop featuring (' || p_duration_days || ' days) - Full payment upfront',
    v_shop_owner_id
  );
  
  INSERT INTO featured_items (
    shop_id, entity_id, entity_type, featured_until,
    total_credits_allocated, daily_cost, credits_consumed,
    status, version
  ) VALUES (
    p_shop_id, p_shop_id, 'shop', v_end_date,
    v_total_cost, v_daily_cost, 0, 'active', 1
  );
  
  UPDATE shops
  SET is_featured = true, 
      featured_until = v_end_date
  WHERE id = p_shop_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'credits_deducted', v_total_cost,
    'featured_until', v_end_date,
    'new_balance', v_current_credits.total_credits - v_total_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- FIX: stop_featuring with time-based refund and optimistic locking
-- ============================================================================
CREATE OR REPLACE FUNCTION stop_featuring(
  p_featured_item_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_item featured_items;
  v_unused_credits INTEGER;
  v_shop_credits shop_credits;
  v_shop_owner_id UUID;
  v_days_passed INTEGER;
  v_true_consumed INTEGER;
  v_rows_affected INTEGER;
BEGIN
  SELECT * INTO v_item 
  FROM featured_items 
  WHERE id = p_featured_item_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Featured item not found';
  END IF;
  
  IF v_item.status != 'active' THEN
    RAISE EXCEPTION 'Featured item is not active (current status: %)', v_item.status;
  END IF;
  
  -- Calculate unused credits using time-based model (first day non-refundable)
  v_days_passed := CEIL(EXTRACT(EPOCH FROM (NOW() - v_item.created_at)) / 86400);
  v_true_consumed := LEAST(v_days_passed * v_item.daily_cost, v_item.total_credits_allocated);
  v_unused_credits := GREATEST(0, v_item.total_credits_allocated - v_true_consumed);
  
  SELECT * INTO v_shop_credits FROM shop_credits WHERE shop_id = v_item.shop_id;
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = v_item.shop_id;
  
  -- Update featured_items status with optimistic locking
  UPDATE featured_items
  SET status = 'cancelled',
      updated_at = NOW(),
      version = v_item.version + 1
  WHERE id = p_featured_item_id
    AND version = v_item.version
    AND status = 'active';
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'Featured item was modified by another process. Please retry.';
  END IF;
  
  -- Refund unused credits (if any)
  IF v_unused_credits > 0 THEN
    UPDATE shop_credits
    SET total_credits = total_credits + v_unused_credits,
        reserved_credits = GREATEST(0, reserved_credits - v_unused_credits),
        updated_at = NOW()
    WHERE shop_id = v_item.shop_id;
    
    INSERT INTO credit_transactions (
      shop_id, transaction_type, amount, balance_after,
      reference_type, reference_id, description, created_by
    ) VALUES (
      v_item.shop_id, 'refund', v_unused_credits,
      v_shop_credits.total_credits + v_unused_credits,
      'featured_item', p_featured_item_id,
      'Refund for early stop of featured ' || v_item.entity_type || ' (' || v_days_passed || ' days used, first day non-refundable)',
      v_shop_owner_id
    );
  END IF;
  
  -- Update entity to remove featured status
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
    'days_used', v_days_passed,
    'new_balance', v_shop_credits.total_credits + v_unused_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- FIX: extend_featuring with correct date calculation and optimistic locking
-- ============================================================================
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
  v_start_date TIMESTAMPTZ;
  v_rows_affected INTEGER;
BEGIN
  SELECT * INTO v_item 
  FROM featured_items 
  WHERE id = p_featured_item_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Featured item not found';
  END IF;
  
  IF v_item.status != 'active' THEN
    RAISE EXCEPTION 'Can only extend active featured items (current status: %)', v_item.status;
  END IF;
  
  v_extension_cost := v_item.daily_cost * p_additional_days;
  
  SELECT * INTO v_shop_credits FROM shop_credits WHERE shop_id = v_item.shop_id;
  
  -- Check balance using Model 1 (total_credits only)
  IF v_shop_credits.total_credits < v_extension_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Need % but only % available', 
      v_extension_cost, v_shop_credits.total_credits;
  END IF;
  
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = v_item.shop_id;
  
  -- Calculate new featured_until (start from NOW() or future expiry, whichever is later)
  v_start_date := GREATEST(NOW(), v_item.featured_until);
  v_new_featured_until := v_start_date + (p_additional_days || ' days')::INTERVAL;
  
  UPDATE shop_credits
  SET total_credits = total_credits - v_extension_cost,
      reserved_credits = reserved_credits + v_extension_cost,
      updated_at = NOW()
  WHERE shop_id = v_item.shop_id;
  
  -- Update with optimistic locking
  UPDATE featured_items
  SET featured_until = v_new_featured_until,
      total_credits_allocated = total_credits_allocated + v_extension_cost,
      updated_at = NOW(),
      version = v_item.version + 1
  WHERE id = p_featured_item_id
    AND version = v_item.version
    AND status = 'active';
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'Featured item was modified by another process. Please retry.';
  END IF;
  
  INSERT INTO credit_transactions (
    shop_id, transaction_type, amount, balance_after,
    reference_type, reference_id, description, created_by
  ) VALUES (
    v_item.shop_id, 'deduction', -v_extension_cost,
    v_shop_credits.total_credits - v_extension_cost,
    'featured_item', p_featured_item_id,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- DATABASE SYNC: Fix orphaned featured items
-- ============================================================================
UPDATE products p
SET is_featured = true, featured_until = fi.featured_until
FROM featured_items fi
WHERE fi.entity_id = p.id
  AND fi.entity_type = 'product'
  AND fi.status = 'active'
  AND fi.featured_until > NOW()
  AND p.is_featured = false;

UPDATE offers o
SET is_featured = true, featured_until = fi.featured_until
FROM featured_items fi
WHERE fi.entity_id = o.id
  AND fi.entity_type = 'offer'
  AND fi.status = 'active'
  AND fi.featured_until > NOW()
  AND o.is_featured = false;

UPDATE shops s
SET is_featured = true, featured_until = fi.featured_until
FROM featured_items fi
WHERE fi.entity_id = s.id
  AND fi.entity_type = 'shop'
  AND fi.status = 'active'
  AND fi.featured_until > NOW()
  AND s.is_featured = false;

UPDATE products
SET is_featured = false, featured_until = null
WHERE is_featured = true
  AND (featured_until < NOW() OR featured_until IS NULL);

UPDATE offers
SET is_featured = false, featured_until = null
WHERE is_featured = true
  AND (featured_until < NOW() OR featured_until IS NULL);

UPDATE shops
SET is_featured = false, featured_until = null
WHERE is_featured = true
  AND (featured_until < NOW() OR featured_until IS NULL);

-- ============================================================================
-- MONITORING: Alert on negative reserved credits
-- ============================================================================
CREATE OR REPLACE FUNCTION check_negative_credits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reserved_credits < 0 THEN
    RAISE WARNING 'Negative reserved_credits detected for shop %: %', NEW.shop_id, NEW.reserved_credits;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS alert_negative_credits ON shop_credits;
CREATE TRIGGER alert_negative_credits
AFTER UPDATE ON shop_credits
FOR EACH ROW
WHEN (NEW.reserved_credits < 0)
EXECUTE FUNCTION check_negative_credits();