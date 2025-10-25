-- LocalConnect Admin Platform Database Schema
-- Complete schema for admin oversight and platform management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('customer', 'shop_owner', 'admin', 'super_admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'banned');
CREATE TYPE shop_status AS ENUM ('pending', 'active', 'suspended', 'rejected', 'closed');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'requires_update');
CREATE TYPE transaction_type AS ENUM ('order', 'refund', 'commission', 'payout', 'subscription', 'adjustment');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'refunded');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'premium', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'suspended');
CREATE TYPE content_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
CREATE TYPE alert_type AS ENUM ('info', 'warning', 'error', 'critical');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  role user_role DEFAULT 'customer',
  status user_status DEFAULT 'active',
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  total_spent DECIMAL(10,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shops table
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100),
  logo_url TEXT,
  cover_url TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  phone VARCHAR(50),
  email VARCHAR(255),
  website TEXT,
  status shop_status DEFAULT 'pending',
  verification_status verification_status DEFAULT 'pending',
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 15.00,
  subscription_tier subscription_tier DEFAULT 'free',
  featured BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shop verification documents
CREATE TABLE shop_verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- 'business_license', 'tax_id', 'identity', etc.
  document_url TEXT NOT NULL,
  status verification_status DEFAULT 'pending',
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  cost DECIMAL(10,2),
  sku VARCHAR(100),
  barcode VARCHAR(100),
  quantity INTEGER DEFAULT 0,
  track_inventory BOOLEAN DEFAULT true,
  category VARCHAR(100),
  tags TEXT[],
  images TEXT[],
  status content_status DEFAULT 'pending',
  featured BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, slug)
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES users(id),
  shop_id UUID REFERENCES shops(id),
  status VARCHAR(50) DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  shipping DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  commission_rate DECIMAL(5,2),
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  shipping_address JSONB,
  billing_address JSONB,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table (financial records)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type transaction_type NOT NULL,
  status transaction_status DEFAULT 'pending',
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  user_id UUID REFERENCES users(id),
  shop_id UUID REFERENCES shops(id),
  order_id UUID REFERENCES orders(id),
  payout_id UUID,
  payment_method VARCHAR(50),
  payment_provider VARCHAR(50),
  provider_transaction_id VARCHAR(255),
  fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(12,2),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payouts table
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status payout_status DEFAULT 'pending',
  method VARCHAR(50),
  account_details JSONB,
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shop subscriptions
CREATE TABLE shop_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL,
  status subscription_status DEFAULT 'active',
  price DECIMAL(10,2) NOT NULL,
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'yearly'
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  status content_status DEFAULT 'pending',
  helpful_count INTEGER DEFAULT 0,
  flagged BOOLEAN DEFAULT false,
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ADMIN & MONITORING TABLES
-- ============================================================================

-- Platform alerts
CREATE TABLE platform_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type alert_type NOT NULL,
  status alert_status DEFAULT 'active',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity INTEGER DEFAULT 1, -- 1-5
  source VARCHAR(100),
  entity_type VARCHAR(50), -- 'user', 'shop', 'order', 'transaction', etc.
  entity_id UUID,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity feed
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID REFERENCES users(id),
  shop_id UUID REFERENCES shops(id),
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform settings
CREATE TABLE platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message templates
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  variables TEXT[],
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Shops indexes
CREATE INDEX idx_shops_owner_id ON shops(owner_id);
CREATE INDEX idx_shops_status ON shops(status);
CREATE INDEX idx_shops_category ON shops(category);
CREATE INDEX idx_shops_verification_status ON shops(verification_status);
CREATE INDEX idx_shops_created_at ON shops(created_at);
CREATE INDEX idx_shops_name_trgm ON shops USING gin(name gin_trgm_ops);

-- Products indexes
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- Orders indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Transactions indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_shop_id ON transactions(shop_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Activity feed indexes
CREATE INDEX idx_activity_feed_type ON activity_feed(type);
CREATE INDEX idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX idx_activity_feed_shop_id ON activity_feed(shop_id);
CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_subscriptions_updated_at BEFORE UPDATE ON shop_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit log trigger function
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes)
    VALUES (
      current_setting('app.current_user_id', true)::UUID,
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes)
    VALUES (
      current_setting('app.current_user_id', true)::UUID,
      TG_OP,
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD)
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin full access policies
CREATE POLICY "Admins have full access to users"
  ON users FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to shops"
  ON shops FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to shop_verification_documents"
  ON shop_verification_documents FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to products"
  ON products FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to orders"
  ON orders FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to order_items"
  ON order_items FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to transactions"
  ON transactions FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to payouts"
  ON payouts FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to shop_subscriptions"
  ON shop_subscriptions FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to reviews"
  ON reviews FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to platform_alerts"
  ON platform_alerts FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to audit_logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins have full access to activity_feed"
  ON activity_feed FOR ALL
  USING (is_admin());

CREATE POLICY "Admins have full access to platform_settings"
  ON platform_settings FOR ALL
  USING (is_admin());

-- Users can view their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth_id = auth.uid());

-- Shop owners can view their shops
CREATE POLICY "Shop owners can view their shops"
  ON shops FOR SELECT
  USING (owner_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get platform statistics
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM users WHERE role = 'customer'),
    'total_shops', (SELECT COUNT(*) FROM shops WHERE status = 'active'),
    'total_orders', (SELECT COUNT(*) FROM orders),
    'total_revenue', (SELECT COALESCE(SUM(total), 0) FROM orders WHERE payment_status = 'completed'),
    'pending_verifications', (SELECT COUNT(*) FROM shops WHERE verification_status = 'pending'),
    'active_alerts', (SELECT COUNT(*) FROM platform_alerts WHERE status = 'active')
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get shop statistics
CREATE OR REPLACE FUNCTION get_shop_stats(shop_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_orders', (SELECT COUNT(*) FROM orders WHERE shop_id = shop_uuid),
    'total_revenue', (SELECT COALESCE(SUM(total), 0) FROM orders WHERE shop_id = shop_uuid AND payment_status = 'completed'),
    'average_rating', (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE shop_id = shop_uuid AND status = 'approved'),
    'total_reviews', (SELECT COUNT(*) FROM reviews WHERE shop_id = shop_uuid AND status = 'approved'),
    'total_products', (SELECT COUNT(*) FROM products WHERE shop_id = shop_uuid AND status = 'approved')
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA (Initial platform settings)
-- ============================================================================

INSERT INTO platform_settings (key, value, description, category) VALUES
  ('commission_rate', '{"default": 15, "min": 10, "max": 30}'::JSONB, 'Platform commission rates', 'financial'),
  ('payout_schedule', '{"frequency": "weekly", "minimum": 100}'::JSONB, 'Payout configuration', 'financial'),
  ('subscription_plans', '{"basic": 29.99, "premium": 79.99, "enterprise": 199.99}'::JSONB, 'Subscription pricing', 'financial'),
  ('verification_requirements', '{"documents": ["business_license", "tax_id", "identity"]}'::JSONB, 'Shop verification requirements', 'shops'),
  ('content_moderation', '{"auto_approve": false, "review_required": true}'::JSONB, 'Content moderation settings', 'content'),
  ('email_notifications', '{"enabled": true, "from": "noreply@localconnect.com"}'::JSONB, 'Email notification settings', 'communication')
ON CONFLICT (key) DO NOTHING;
