-- Add missing columns to offers table
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS discount_type VARCHAR DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS discount_value NUMERIC,
ADD COLUMN IF NOT EXISTS applicable_to VARCHAR DEFAULT 'all',
ADD COLUMN IF NOT EXISTS applicable_products TEXT[],
ADD COLUMN IF NOT EXISTS applicable_categories TEXT[],
ADD COLUMN IF NOT EXISTS offer_type VARCHAR DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Migrate data from old schema to new schema for offers
UPDATE offers 
SET discount_value = discount_percentage,
    discount_type = 'percentage'
WHERE discount_percentage IS NOT NULL AND discount_value IS NULL;

-- Add missing payment columns to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS payment_qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS preferred_payment_methods TEXT[] DEFAULT ARRAY['upi', 'cash'],
ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- Create payment_requests table if not exists
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  request_status VARCHAR DEFAULT 'created',
  upi_transaction_id VARCHAR,
  payment_screenshot_url TEXT,
  payment_confirmed_by_shop BOOLEAN DEFAULT false,
  payment_confirmed_at TIMESTAMPTZ,
  confirmation_notes TEXT,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payment_requests
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_requests
CREATE POLICY "Customers can view their payment requests"
ON payment_requests FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Shop owners can view their payment requests"
ON payment_requests FOR SELECT
USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

CREATE POLICY "Shop owners can update their payment requests"
ON payment_requests FOR UPDATE
USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Create payment_verification_evidence table if not exists
CREATE TABLE IF NOT EXISTS payment_verification_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID REFERENCES payment_requests(id) ON DELETE CASCADE,
  evidence_type VARCHAR NOT NULL,
  evidence_data JSONB,
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payment_verification_evidence
ALTER TABLE payment_verification_evidence ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_verification_evidence
CREATE POLICY "Shop owners can view verification evidence"
ON payment_verification_evidence FOR SELECT
USING (payment_request_id IN (
  SELECT id FROM payment_requests pr 
  WHERE pr.shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
));

-- Create inventory_movements table if not exists
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on inventory_movements
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_movements
CREATE POLICY "Shop owners can view their inventory movements"
ON inventory_movements FOR SELECT
USING (product_id IN (
  SELECT id FROM products p WHERE p.shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
));

CREATE POLICY "Shop owners can create inventory movements"
ON inventory_movements FOR INSERT
WITH CHECK (product_id IN (
  SELECT id FROM products p WHERE p.shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
));

-- Create referral_codes table if not exists
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE UNIQUE,
  referral_code VARCHAR NOT NULL UNIQUE,
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  total_earnings INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on referral_codes
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_codes
CREATE POLICY "Anyone can view active referral codes"
ON referral_codes FOR SELECT
USING (is_active = true);

CREATE POLICY "Shop owners can manage their referral codes"
ON referral_codes FOR ALL
USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Create referral_transactions table if not exists
CREATE TABLE IF NOT EXISTS referral_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  referred_entity_type VARCHAR NOT NULL,
  referred_shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  referred_customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referral_code VARCHAR NOT NULL,
  referrer_credits INTEGER DEFAULT 0,
  referred_credits INTEGER DEFAULT 0,
  transaction_status VARCHAR DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on referral_transactions
ALTER TABLE referral_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_transactions
CREATE POLICY "Shop owners can view their referral transactions"
ON referral_transactions FOR SELECT
USING (referrer_shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Create shop_reviews table if not exists
CREATE TABLE IF NOT EXISTS shop_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  review_images TEXT[],
  product_quality_rating INTEGER CHECK (product_quality_rating >= 1 AND product_quality_rating <= 5),
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  price_rating INTEGER CHECK (price_rating >= 1 AND price_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  is_verified_purchase BOOLEAN DEFAULT false,
  review_status VARCHAR DEFAULT 'pending',
  shop_response TEXT,
  shop_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on shop_reviews
ALTER TABLE shop_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for shop_reviews
CREATE POLICY "Anyone can view approved reviews"
ON shop_reviews FOR SELECT
USING (review_status = 'approved');

CREATE POLICY "Customers can manage their reviews"
ON shop_reviews FOR ALL
USING (auth.uid() = customer_id);

CREATE POLICY "Shop owners can view and respond to their reviews"
ON shop_reviews FOR UPDATE
USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Create shop_review_stats table if not exists
CREATE TABLE IF NOT EXISTS shop_review_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE UNIQUE,
  total_reviews INTEGER DEFAULT 0,
  average_rating NUMERIC DEFAULT 0,
  rating_5_count INTEGER DEFAULT 0,
  rating_4_count INTEGER DEFAULT 0,
  rating_3_count INTEGER DEFAULT 0,
  rating_2_count INTEGER DEFAULT 0,
  rating_1_count INTEGER DEFAULT 0,
  avg_product_quality NUMERIC,
  avg_service NUMERIC,
  avg_price NUMERIC,
  avg_delivery NUMERIC,
  verified_reviews_count INTEGER DEFAULT 0,
  reviews_with_images_count INTEGER DEFAULT 0,
  reviews_with_response_count INTEGER DEFAULT 0,
  last_review_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on shop_review_stats
ALTER TABLE shop_review_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for shop_review_stats
CREATE POLICY "Anyone can view review stats"
ON shop_review_stats FOR SELECT
USING (true);

-- Add trigger to update payment_requests updated_at
CREATE OR REPLACE FUNCTION update_payment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_requests_updated_at ON payment_requests;
CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_requests_updated_at();