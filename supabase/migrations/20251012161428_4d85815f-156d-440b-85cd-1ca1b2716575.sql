-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  category VARCHAR,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  discount_percentage INTEGER,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  terms_conditions TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create inquiry_responses table
CREATE TABLE IF NOT EXISTS inquiry_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  response_type VARCHAR DEFAULT 'quote',
  quoted_price NUMERIC,
  estimated_delivery_days INTEGER,
  response_message TEXT,
  payment_status VARCHAR DEFAULT 'not_requested',
  payment_request_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create featured_items table
CREATE TABLE IF NOT EXISTS featured_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR NOT NULL,
  entity_id UUID NOT NULL,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  featured_until TIMESTAMPTZ NOT NULL,
  credits_used INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES credit_plans(id),
  amount NUMERIC NOT NULL,
  final_amount NUMERIC NOT NULL,
  currency VARCHAR DEFAULT 'INR',
  payment_method VARCHAR,
  payment_gateway VARCHAR,
  gateway_transaction_id VARCHAR,
  status VARCHAR DEFAULT 'pending',
  name VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Products policies
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Shop owners can manage their products"
  ON products FOR ALL
  USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Offers policies
CREATE POLICY "Anyone can view active offers"
  ON offers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Shop owners can manage their offers"
  ON offers FOR ALL
  USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Inquiry responses policies
CREATE POLICY "Users can view inquiry responses"
  ON inquiry_responses FOR SELECT
  USING (
    inquiry_id IN (
      SELECT id FROM inquiries 
      WHERE customer_id = auth.uid() OR shop_id IN (
        SELECT id FROM shops WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Shop owners can create responses"
  ON inquiry_responses FOR INSERT
  WITH CHECK (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Featured items policies
CREATE POLICY "Anyone can view featured items"
  ON featured_items FOR SELECT
  USING (featured_until > now());

CREATE POLICY "Shop owners can manage featured items"
  ON featured_items FOR ALL
  USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Payment transactions policies
CREATE POLICY "Shop owners can view their transactions"
  ON payment_transactions FOR SELECT
  USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Create indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_offers_shop_id ON offers(shop_id);
CREATE INDEX idx_inquiry_responses_inquiry_id ON inquiry_responses(inquiry_id);
CREATE INDEX idx_featured_items_entity ON featured_items(entity_type, entity_id);
CREATE INDEX idx_payment_transactions_shop_id ON payment_transactions(shop_id);

-- Create updated_at triggers
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_inquiry_responses_updated_at
  BEFORE UPDATE ON inquiry_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();