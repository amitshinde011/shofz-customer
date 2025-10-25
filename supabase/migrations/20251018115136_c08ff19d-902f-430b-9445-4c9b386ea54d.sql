-- Fix feature_product_atomic to include credits_used column
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
  SELECT daily_cost INTO v_daily_cost 
  FROM credit_costs 
  WHERE action_type = 'feature_product' AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit cost not configured for feature_product';
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
    WHERE entity_id = p_product_id 
      AND entity_type = 'product'
      AND status = 'active'
      AND featured_until > NOW()
  ) THEN
    RAISE EXCEPTION 'Product is already featured';
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
    'product', p_product_id,
    'Product featuring (' || p_duration_days || ' days) - Full payment upfront',
    v_shop_owner_id
  );
  
  -- FIX: Include credits_used column with initial value of 0
  INSERT INTO featured_items (
    shop_id, entity_id, entity_type, featured_until,
    total_credits_allocated, daily_cost, credits_consumed, credits_used,
    status, version
  ) VALUES (
    p_shop_id, p_product_id, 'product', v_end_date,
    v_total_cost, v_daily_cost, 0, 0, 'active', 1
  );
  
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

-- Fix feature_offer_atomic to include credits_used column
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
  
  -- FIX: Include credits_used column with initial value of 0
  INSERT INTO featured_items (
    shop_id, entity_id, entity_type, featured_until,
    total_credits_allocated, daily_cost, credits_consumed, credits_used,
    status, version
  ) VALUES (
    p_shop_id, p_offer_id, 'offer', v_end_date,
    v_total_cost, v_daily_cost, 0, 0, 'active', 1
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

-- Fix feature_shop_atomic to include credits_used column
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
  
  -- FIX: Include credits_used column with initial value of 0
  INSERT INTO featured_items (
    shop_id, entity_id, entity_type, featured_until,
    total_credits_allocated, daily_cost, credits_consumed, credits_used,
    status, version
  ) VALUES (
    p_shop_id, p_shop_id, 'shop', v_end_date,
    v_total_cost, v_daily_cost, 0, 0, 'active', 1
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