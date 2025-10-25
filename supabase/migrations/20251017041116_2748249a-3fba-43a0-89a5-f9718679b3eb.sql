-- Create credit_batches table for proper validity tracking
CREATE TABLE credit_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  credits_purchased INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  payment_transaction_id UUID REFERENCES payment_transactions(id),
  status VARCHAR DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_credits_positive CHECK (credits_remaining >= 0),
  CONSTRAINT check_credits_valid CHECK (credits_remaining <= credits_purchased)
);

CREATE INDEX idx_credit_batches_shop_expiry ON credit_batches(shop_id, expires_at) WHERE status = 'active';
CREATE INDEX idx_credit_batches_status ON credit_batches(status) WHERE status = 'active';

ALTER TABLE credit_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners view credit batches" ON credit_batches FOR SELECT USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));
CREATE POLICY "Admins view all credit batches" ON credit_batches FOR SELECT USING (is_admin());

-- Update award_credits function
CREATE OR REPLACE FUNCTION public.award_credits(
  p_shop_id uuid, p_credits integer, p_transaction_type credit_transaction_type, p_description text,
  p_credit_plan_id uuid DEFAULT NULL, p_payment_transaction_id uuid DEFAULT NULL, p_created_by uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_transaction_id UUID; v_balance_after INTEGER; v_validity_days INTEGER; 
  v_new_expire_at TIMESTAMP WITH TIME ZONE; v_owner_id UUID; v_latest_batch_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM shops WHERE id = p_shop_id;
  IF p_credit_plan_id IS NOT NULL THEN
    SELECT validity_days INTO v_validity_days FROM credit_plans WHERE id = p_credit_plan_id;
    v_new_expire_at := NOW() + (v_validity_days || ' days')::INTERVAL;
  END IF;
  IF p_transaction_type = 'purchase' AND v_new_expire_at IS NOT NULL THEN
    INSERT INTO credit_batches (shop_id, credits_purchased, credits_remaining, expires_at, payment_transaction_id, status)
    VALUES (p_shop_id, p_credits, p_credits, v_new_expire_at, p_payment_transaction_id, 'active');
  ELSIF p_transaction_type = 'refund' THEN
    SELECT id INTO v_latest_batch_id FROM credit_batches 
    WHERE shop_id = p_shop_id AND status = 'active' AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1;
    IF v_latest_batch_id IS NOT NULL THEN
      UPDATE credit_batches SET credits_remaining = credits_remaining + p_credits WHERE id = v_latest_batch_id;
    END IF;
  END IF;
  SELECT COALESCE(SUM(credits_remaining), 0) INTO v_balance_after FROM credit_batches WHERE shop_id = p_shop_id AND status = 'active' AND expires_at > NOW();
  UPDATE shop_credits SET total_credits = v_balance_after, reserved_credits = CASE WHEN p_transaction_type = 'refund' THEN GREATEST(0, reserved_credits - ABS(p_credits)) ELSE reserved_credits END,
    lifetime_credits_purchased = CASE WHEN p_transaction_type = 'purchase' THEN lifetime_credits_purchased + p_credits ELSE lifetime_credits_purchased END,
    last_purchase_at = CASE WHEN p_transaction_type = 'purchase' THEN NOW() ELSE last_purchase_at END,
    credits_expire_at = (SELECT MIN(expires_at) FROM credit_batches WHERE shop_id = p_shop_id AND status = 'active' AND credits_remaining > 0), updated_at = NOW() WHERE shop_id = p_shop_id;
  INSERT INTO credit_transactions (shop_id, transaction_type, amount, balance_after, description, payment_transaction_id, created_by)
  VALUES (p_shop_id, p_transaction_type, p_credits, v_balance_after, p_description, p_payment_transaction_id, COALESCE(p_created_by, v_owner_id)) RETURNING id INTO v_transaction_id;
  RETURN v_transaction_id;
END; $$;

-- Atomic coupon usage
CREATE OR REPLACE FUNCTION use_coupon_atomic(p_coupon_code VARCHAR, p_shop_id UUID, p_transaction_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_coupon_id UUID; v_current_uses INTEGER; v_max_uses INTEGER;
BEGIN
  SELECT id, current_uses, max_uses_total INTO v_coupon_id, v_current_uses, v_max_uses FROM coupons WHERE code = p_coupon_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coupon not found'; END IF;
  IF v_max_uses IS NOT NULL AND v_current_uses >= v_max_uses THEN RAISE EXCEPTION 'Coupon usage limit exceeded'; END IF;
  UPDATE coupons SET current_uses = current_uses + 1 WHERE id = v_coupon_id;
  INSERT INTO coupon_usage (coupon_id, shop_id, payment_transaction_id) VALUES (v_coupon_id, p_shop_id, p_transaction_id);
END; $$;

-- Atomic credit expiration
CREATE OR REPLACE FUNCTION expire_credits_atomic(p_shop_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_expired_credits INTEGER := 0; v_deactivated_items INTEGER := 0; v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM shops WHERE id = p_shop_id;
  WITH expired AS (UPDATE credit_batches SET status = 'expired' WHERE shop_id = p_shop_id AND expires_at < NOW() AND status = 'active' RETURNING credits_remaining)
  SELECT COALESCE(SUM(credits_remaining), 0) INTO v_expired_credits FROM expired;
  WITH deactivated AS (UPDATE featured_items SET status = 'expired' WHERE shop_id = p_shop_id AND status = 'active' RETURNING id)
  SELECT COUNT(*) INTO v_deactivated_items FROM deactivated;
  UPDATE products SET is_featured = false, featured_until = NULL WHERE shop_id = p_shop_id AND is_featured = true;
  UPDATE offers SET is_featured = false, featured_until = NULL WHERE shop_id = p_shop_id AND is_featured = true;
  UPDATE shops SET is_featured = false, featured_until = NULL WHERE id = p_shop_id AND is_featured = true;
  UPDATE shop_credits SET total_credits = (SELECT COALESCE(SUM(credits_remaining), 0) FROM credit_batches WHERE shop_id = p_shop_id AND status = 'active'), reserved_credits = 0,
    credits_expire_at = (SELECT MIN(expires_at) FROM credit_batches WHERE shop_id = p_shop_id AND status = 'active' AND credits_remaining > 0), updated_at = NOW() WHERE shop_id = p_shop_id;
  IF v_expired_credits > 0 THEN
    INSERT INTO credit_transactions (shop_id, transaction_type, amount, balance_after, description, created_by)
    VALUES (p_shop_id, 'expiration', -v_expired_credits, 0, 'Credits expired on ' || NOW()::DATE, v_owner_id);
    PERFORM create_notification(v_owner_id, 'credit_expiration', 'Credits Expired', v_expired_credits || ' credits expired. ' || v_deactivated_items || ' items deactivated.', p_shop_id);
  END IF;
  RETURN jsonb_build_object('expired_credits', v_expired_credits, 'deactivated_items', v_deactivated_items);
END; $$;

-- Expiration warnings
CREATE OR REPLACE FUNCTION send_credit_expiration_warnings()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_batch RECORD; v_days_remaining INTEGER;
BEGIN
  FOR v_batch IN SELECT cb.*, s.owner_id FROM credit_batches cb JOIN shops s ON s.id = cb.shop_id WHERE cb.status = 'active' AND cb.credits_remaining > 0 AND cb.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days' LOOP
    v_days_remaining := EXTRACT(DAY FROM (v_batch.expires_at - NOW()))::INTEGER;
    IF v_days_remaining IN (7, 3, 1) AND NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = v_batch.owner_id AND type = 'credit_warning' AND created_at > NOW() - INTERVAL '20 hours' AND message LIKE '%' || v_batch.credits_remaining || ' credits%') THEN
      PERFORM create_notification(v_batch.owner_id, 'credit_warning',
        CASE v_days_remaining WHEN 1 THEN 'Credits Expire Tomorrow!' WHEN 3 THEN 'Credits Expiring Soon' ELSE 'Credit Expiration Reminder' END,
        v_batch.credits_remaining || ' credits will expire in ' || v_days_remaining || ' day' || CASE WHEN v_days_remaining > 1 THEN 's' ELSE '' END || '. Purchase more to avoid losing access.', v_batch.shop_id);
    END IF;
  END LOOP;
END; $$;