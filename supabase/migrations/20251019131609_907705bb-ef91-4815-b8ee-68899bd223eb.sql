-- Update feature_offer_atomic to prevent duplicate featuring
CREATE OR REPLACE FUNCTION public.feature_offer_atomic(p_shop_id uuid, p_offer_id uuid, p_duration_days integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_daily_cost INTEGER;
  v_total_cost INTEGER;
  v_current_credits RECORD;
  v_available INTEGER;
  v_end_date TIMESTAMP WITH TIME ZONE;
  v_featured_item_id UUID;
  v_shop_owner_id UUID;
  v_existing_feature RECORD;
BEGIN
  -- Check if offer is already actively featured
  SELECT id, featured_until INTO v_existing_feature
  FROM featured_items
  WHERE shop_id = p_shop_id 
    AND entity_type = 'offer' 
    AND entity_id = p_offer_id 
    AND status = 'active' 
    AND featured_until > NOW();

  IF FOUND THEN
    RAISE EXCEPTION 'This offer is already featured until %. Please wait until it expires or use the extend feature option.', 
      to_char(v_existing_feature.featured_until, 'YYYY-MM-DD HH24:MI:SS');
  END IF;

  -- Get daily cost for featuring offers
  SELECT daily_cost INTO v_daily_cost
  FROM credit_costs
  WHERE action_type = 'feature_offer' AND is_active = true
  LIMIT 1;

  IF v_daily_cost IS NULL THEN
    RAISE EXCEPTION 'Feature offer cost not configured';
  END IF;

  -- Calculate total cost
  v_total_cost := v_daily_cost * p_duration_days;

  -- Get current credits (with row lock)
  SELECT total_credits, reserved_credits INTO v_current_credits
  FROM shop_credits
  WHERE shop_id = p_shop_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop credits not found';
  END IF;

  -- Calculate available credits (total - reserved)
  v_available := v_current_credits.total_credits - v_current_credits.reserved_credits;

  -- Check if shop has enough available credits
  IF v_available < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', v_total_cost, v_available;
  END IF;

  -- Calculate end date
  v_end_date := NOW() + (p_duration_days || ' days')::INTERVAL;

  -- Get shop owner for transaction record
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = p_shop_id;

  -- Reserve credits
  UPDATE shop_credits
  SET reserved_credits = reserved_credits + v_total_cost,
      updated_at = NOW()
  WHERE shop_id = p_shop_id;

  -- Create featured item record
  INSERT INTO featured_items (
    shop_id, entity_type, entity_id, daily_cost, 
    credits_used, featured_until, status
  ) VALUES (
    p_shop_id, 'offer', p_offer_id, v_daily_cost,
    v_total_cost, v_end_date, 'active'
  ) RETURNING id INTO v_featured_item_id;

  -- Record reservation transaction
  INSERT INTO credit_transactions (
    shop_id, transaction_type, amount, balance_after, 
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_shop_id, 'reservation', v_total_cost, v_current_credits.total_credits,
    'offer', p_offer_id,
    'Reserved credits for offer featuring (' || p_duration_days || ' days)',
    v_shop_owner_id
  );

  -- Update offer
  UPDATE offers
  SET is_featured = true,
      featured_until = v_end_date,
      updated_at = NOW()
  WHERE id = p_offer_id;

  RETURN jsonb_build_object(
    'success', true,
    'credits_reserved', v_total_cost,
    'featured_until', v_end_date,
    'new_balance', v_current_credits.total_credits,
    'available_balance', v_available - v_total_cost,
    'featured_item_id', v_featured_item_id
  );
END;
$function$;

-- Update feature_product_atomic to prevent duplicate featuring
CREATE OR REPLACE FUNCTION public.feature_product_atomic(p_shop_id uuid, p_product_id uuid, p_duration_days integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_daily_cost INTEGER;
  v_total_cost INTEGER;
  v_current_credits RECORD;
  v_available INTEGER;
  v_end_date TIMESTAMP WITH TIME ZONE;
  v_featured_item_id UUID;
  v_shop_owner_id UUID;
  v_existing_feature RECORD;
BEGIN
  -- Check if product is already actively featured
  SELECT id, featured_until INTO v_existing_feature
  FROM featured_items
  WHERE shop_id = p_shop_id 
    AND entity_type = 'product' 
    AND entity_id = p_product_id 
    AND status = 'active' 
    AND featured_until > NOW();

  IF FOUND THEN
    RAISE EXCEPTION 'This product is already featured until %. Please wait until it expires or use the extend feature option.', 
      to_char(v_existing_feature.featured_until, 'YYYY-MM-DD HH24:MI:SS');
  END IF;

  -- Get daily cost for featuring products
  SELECT daily_cost INTO v_daily_cost
  FROM credit_costs
  WHERE action_type = 'feature_product' AND is_active = true
  LIMIT 1;

  IF v_daily_cost IS NULL THEN
    RAISE EXCEPTION 'Feature product cost not configured';
  END IF;

  -- Calculate total cost
  v_total_cost := v_daily_cost * p_duration_days;

  -- Get current credits (with row lock)
  SELECT total_credits, reserved_credits INTO v_current_credits
  FROM shop_credits
  WHERE shop_id = p_shop_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop credits not found';
  END IF;

  -- Calculate available credits (total - reserved)
  v_available := v_current_credits.total_credits - v_current_credits.reserved_credits;

  -- Check if shop has enough available credits
  IF v_available < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', v_total_cost, v_available;
  END IF;

  -- Calculate end date
  v_end_date := NOW() + (p_duration_days || ' days')::INTERVAL;

  -- Get shop owner for transaction record
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = p_shop_id;

  -- Reserve credits
  UPDATE shop_credits
  SET reserved_credits = reserved_credits + v_total_cost,
      updated_at = NOW()
  WHERE shop_id = p_shop_id;

  -- Create featured item record
  INSERT INTO featured_items (
    shop_id, entity_type, entity_id, daily_cost, 
    credits_used, featured_until, status
  ) VALUES (
    p_shop_id, 'product', p_product_id, v_daily_cost,
    v_total_cost, v_end_date, 'active'
  ) RETURNING id INTO v_featured_item_id;

  -- Record reservation transaction
  INSERT INTO credit_transactions (
    shop_id, transaction_type, amount, balance_after, 
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_shop_id, 'reservation', v_total_cost, v_current_credits.total_credits,
    'product', p_product_id,
    'Reserved credits for product featuring (' || p_duration_days || ' days)',
    v_shop_owner_id
  );

  -- Update product
  UPDATE products
  SET is_featured = true,
      featured_until = v_end_date,
      updated_at = NOW()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'success', true,
    'credits_reserved', v_total_cost,
    'featured_until', v_end_date,
    'new_balance', v_current_credits.total_credits,
    'available_balance', v_available - v_total_cost,
    'featured_item_id', v_featured_item_id
  );
END;
$function$;

-- Update feature_shop_atomic to prevent duplicate featuring
CREATE OR REPLACE FUNCTION public.feature_shop_atomic(p_shop_id uuid, p_duration_days integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_daily_cost INTEGER;
  v_total_cost INTEGER;
  v_current_credits RECORD;
  v_available INTEGER;
  v_end_date TIMESTAMP WITH TIME ZONE;
  v_featured_item_id UUID;
  v_shop_owner_id UUID;
  v_existing_feature RECORD;
BEGIN
  -- Check if shop is already actively featured
  SELECT id, featured_until INTO v_existing_feature
  FROM featured_items
  WHERE shop_id = p_shop_id 
    AND entity_type = 'shop' 
    AND entity_id = p_shop_id 
    AND status = 'active' 
    AND featured_until > NOW();

  IF FOUND THEN
    RAISE EXCEPTION 'This shop is already featured until %. Please wait until it expires or use the extend feature option.', 
      to_char(v_existing_feature.featured_until, 'YYYY-MM-DD HH24:MI:SS');
  END IF;

  -- Get daily cost for featuring shops
  SELECT daily_cost INTO v_daily_cost
  FROM credit_costs
  WHERE action_type = 'feature_shop' AND is_active = true
  LIMIT 1;

  IF v_daily_cost IS NULL THEN
    RAISE EXCEPTION 'Feature shop cost not configured';
  END IF;

  -- Calculate total cost
  v_total_cost := v_daily_cost * p_duration_days;

  -- Get current credits (with row lock)
  SELECT total_credits, reserved_credits INTO v_current_credits
  FROM shop_credits
  WHERE shop_id = p_shop_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop credits not found';
  END IF;

  -- Calculate available credits (total - reserved)
  v_available := v_current_credits.total_credits - v_current_credits.reserved_credits;

  -- Check if shop has enough available credits
  IF v_available < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', v_total_cost, v_available;
  END IF;

  -- Calculate end date
  v_end_date := NOW() + (p_duration_days || ' days')::INTERVAL;

  -- Get shop owner for transaction record
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = p_shop_id;

  -- Reserve credits
  UPDATE shop_credits
  SET reserved_credits = reserved_credits + v_total_cost,
      updated_at = NOW()
  WHERE shop_id = p_shop_id;

  -- Create featured item record
  INSERT INTO featured_items (
    shop_id, entity_type, entity_id, daily_cost, 
    credits_used, featured_until, status
  ) VALUES (
    p_shop_id, 'shop', p_shop_id, v_daily_cost,
    v_total_cost, v_end_date, 'active'
  ) RETURNING id INTO v_featured_item_id;

  -- Record reservation transaction
  INSERT INTO credit_transactions (
    shop_id, transaction_type, amount, balance_after, 
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_shop_id, 'reservation', v_total_cost, v_current_credits.total_credits,
    'shop', p_shop_id,
    'Reserved credits for shop featuring (' || p_duration_days || ' days)',
    v_shop_owner_id
  );

  -- Update shop
  UPDATE shops
  SET is_featured = true,
      featured_until = v_end_date,
      updated_at = NOW()
  WHERE id = p_shop_id;

  RETURN jsonb_build_object(
    'success', true,
    'credits_reserved', v_total_cost,
    'featured_until', v_end_date,
    'new_balance', v_current_credits.total_credits,
    'available_balance', v_available - v_total_cost,
    'featured_item_id', v_featured_item_id
  );
END;
$function$;