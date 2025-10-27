-- ============================================================================
-- MASTER MIGRATION FIXES
-- ============================================================================
-- Version: 1.0.3
-- Created: 2025-10-26
-- Updated: 2025-10-26
-- Description: Fixes all discrepancies between MASTER_MIGRATION.sql and types.ts
-- Changelog: See MIGRATION_FIX_CHANGELOG.md for version history
--
-- This script should be run AFTER MASTER_MIGRATION.sql to bring the database
-- schema in line with the application's expectations (as defined in types.ts)
--
-- IMPORTANT: Review the SCHEMA_COMPARISON_REPORT.md first!
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CREATE MISSING TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- inventory_movements - Tracks product inventory changes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL, -- 'sale', 'restock', 'adjustment', 'return', 'damage'
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);

COMMENT ON TABLE inventory_movements IS 'Tracks all inventory changes for products';
COMMENT ON COLUMN inventory_movements.movement_type IS 'Type of inventory change';
COMMENT ON COLUMN inventory_movements.quantity IS 'Quantity change (positive or negative)';

-- ----------------------------------------------------------------------------
-- product_stats - Aggregated product statistics
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_stats_product_id ON product_stats(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stats_view_count ON product_stats(view_count DESC);

COMMENT ON TABLE product_stats IS 'Pre-calculated statistics for products';

-- ----------------------------------------------------------------------------
-- referral_config - System configuration for referrals
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referral_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value NUMERIC(10,2) NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_config_key ON referral_config(config_key);

COMMENT ON TABLE referral_config IS 'System-wide configuration for referral rewards';

-- Insert default referral configuration
INSERT INTO referral_config (config_key, config_value, description)
SELECT 'referrer_reward_credits', 100, 'Credits given to referrer when referee completes first transaction'
WHERE NOT EXISTS (SELECT 1 FROM referral_config WHERE config_key = 'referrer_reward_credits');

INSERT INTO referral_config (config_key, config_value, description)
SELECT 'referee_reward_credits', 50, 'Credits given to referred user on signup'
WHERE NOT EXISTS (SELECT 1 FROM referral_config WHERE config_key = 'referee_reward_credits');

INSERT INTO referral_config (config_key, config_value, description)
SELECT 'min_transaction_amount', 100, 'Minimum transaction amount to trigger referral reward'
WHERE NOT EXISTS (SELECT 1 FROM referral_config WHERE config_key = 'min_transaction_amount');

-- ----------------------------------------------------------------------------
-- review_helpfulness - Helpful votes on reviews
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_helpfulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_helpfulness_review_id ON review_helpfulness(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpfulness_user_id ON review_helpfulness(user_id);

COMMENT ON TABLE review_helpfulness IS 'Tracks helpful/not helpful votes on reviews';

-- ----------------------------------------------------------------------------
-- review_reports - Flagged review reports
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  report_reason VARCHAR(100) NOT NULL,
  report_details TEXT,
  report_status VARCHAR(50) DEFAULT 'pending' CHECK (report_status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolution_action VARCHAR(100),
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_review_reports_reported_by ON review_reports(reported_by);

COMMENT ON TABLE review_reports IS 'Reports of inappropriate or fake reviews';

-- ----------------------------------------------------------------------------
-- review_templates - Quick review templates
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  template_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_templates_category ON review_templates(category);
CREATE INDEX IF NOT EXISTS idx_review_templates_rating ON review_templates(rating);
CREATE INDEX IF NOT EXISTS idx_review_templates_is_active ON review_templates(is_active);

COMMENT ON TABLE review_templates IS 'Pre-written review templates for quick reviews';

-- Insert sample templates
INSERT INTO review_templates (category, rating, template_text)
SELECT 'excellent_service', 5, 'Excellent service! Highly recommend this shop.'
WHERE NOT EXISTS (SELECT 1 FROM review_templates WHERE category = 'excellent_service' AND rating = 5);

INSERT INTO review_templates (category, rating, template_text)
SELECT 'good_quality', 4, 'Good quality products and reasonable prices.'
WHERE NOT EXISTS (SELECT 1 FROM review_templates WHERE category = 'good_quality' AND rating = 4);

INSERT INTO review_templates (category, rating, template_text)
SELECT 'average_experience', 3, 'Average experience, nothing exceptional.'
WHERE NOT EXISTS (SELECT 1 FROM review_templates WHERE category = 'average_experience' AND rating = 3);

INSERT INTO review_templates (category, rating, template_text)
SELECT 'below_expectations', 2, 'Service was below my expectations.'
WHERE NOT EXISTS (SELECT 1 FROM review_templates WHERE category = 'below_expectations' AND rating = 2);

INSERT INTO review_templates (category, rating, template_text)
SELECT 'poor_service', 1, 'Very disappointed with the service.'
WHERE NOT EXISTS (SELECT 1 FROM review_templates WHERE category = 'poor_service' AND rating = 1);

-- ----------------------------------------------------------------------------
-- shop_categories - Master list of shop categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_categories_slug ON shop_categories(slug);
CREATE INDEX IF NOT EXISTS idx_shop_categories_display_order ON shop_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_shop_categories_is_active ON shop_categories(is_active);

COMMENT ON TABLE shop_categories IS 'Master list of available shop categories';

-- Insert default categories
INSERT INTO shop_categories (name, slug, description, display_order)
SELECT 'Electronics', 'electronics', 'Electronics and gadgets', 1
WHERE NOT EXISTS (SELECT 1 FROM shop_categories WHERE slug = 'electronics');

INSERT INTO shop_categories (name, slug, description, display_order)
SELECT 'Fashion', 'fashion', 'Clothing and accessories', 2
WHERE NOT EXISTS (SELECT 1 FROM shop_categories WHERE slug = 'fashion');

INSERT INTO shop_categories (name, slug, description, display_order)
SELECT 'Home & Living', 'home-living', 'Home decor and furniture', 3
WHERE NOT EXISTS (SELECT 1 FROM shop_categories WHERE slug = 'home-living');

INSERT INTO shop_categories (name, slug, description, display_order)
SELECT 'Food & Beverage', 'food-beverage', 'Restaurants and food shops', 4
WHERE NOT EXISTS (SELECT 1 FROM shop_categories WHERE slug = 'food-beverage');

INSERT INTO shop_categories (name, slug, description, display_order)
SELECT 'Health & Beauty', 'health-beauty', 'Health and beauty products', 5
WHERE NOT EXISTS (SELECT 1 FROM shop_categories WHERE slug = 'health-beauty');

INSERT INTO shop_categories (name, slug, description, display_order)
SELECT 'Sports & Fitness', 'sports-fitness', 'Sports equipment and fitness', 6
WHERE NOT EXISTS (SELECT 1 FROM shop_categories WHERE slug = 'sports-fitness');

INSERT INTO shop_categories (name, slug, description, display_order)
SELECT 'Books & Stationery', 'books-stationery', 'Books and office supplies', 7
WHERE NOT EXISTS (SELECT 1 FROM shop_categories WHERE slug = 'books-stationery');

INSERT INTO shop_categories (name, slug, description, display_order)
SELECT 'Automotive', 'automotive', 'Car parts and services', 8
WHERE NOT EXISTS (SELECT 1 FROM shop_categories WHERE slug = 'automotive');

INSERT INTO shop_categories (name, slug, description, display_order)
SELECT 'Services', 'services', 'Professional services', 9
WHERE NOT EXISTS (SELECT 1 FROM shop_categories WHERE slug = 'services');

INSERT INTO shop_categories (name, slug, description, display_order)
SELECT 'Others', 'others', 'Other categories', 99
WHERE NOT EXISTS (SELECT 1 FROM shop_categories WHERE slug = 'others');

-- ----------------------------------------------------------------------------
-- shop_owner_profiles - Extended shop owner data
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop_owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  business_category VARCHAR(100),
  business_address TEXT,
  business_phone VARCHAR(20),
  gstin VARCHAR(50),
  business_verified BOOLEAN DEFAULT false,
  verification_documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_owner_profiles_user_id ON shop_owner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_owner_profiles_business_verified ON shop_owner_profiles(business_verified);

COMMENT ON TABLE shop_owner_profiles IS 'Extended profile information for shop owners';
COMMENT ON COLUMN shop_owner_profiles.gstin IS 'GST Identification Number';

-- ----------------------------------------------------------------------------
-- shop_payment_transactions - Payment records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_amount NUMERIC(10,2),
  payment_reference_id VARCHAR(255),
  payment_screenshot_url TEXT,
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_notes TEXT,
  customer_payment_timestamp TIMESTAMPTZ,
  shop_confirmation_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_payment_transactions_shop_id ON shop_payment_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_payment_transactions_customer_id ON shop_payment_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_shop_payment_transactions_inquiry_id ON shop_payment_transactions(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_shop_payment_transactions_status ON shop_payment_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_shop_payment_transactions_created_at ON shop_payment_transactions(created_at DESC);

COMMENT ON TABLE shop_payment_transactions IS 'Direct payment transactions between customers and shops';

-- ----------------------------------------------------------------------------
-- support_ticket_tags - Tags for support tickets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_ticket_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_tags_ticket_id ON support_ticket_tags(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_tags_tag ON support_ticket_tags(tag);

COMMENT ON TABLE support_ticket_tags IS 'Tagging system for support tickets';

-- ============================================================================
-- SECTION 2: ALTER EXISTING TABLES - ADD MISSING COLUMNS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- users table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Migrate data from old columns to new columns
UPDATE users SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;
UPDATE users SET last_login = last_login_at WHERE last_login IS NULL AND last_login_at IS NOT NULL;
UPDATE users SET phone = phone_number WHERE phone IS NULL AND phone_number IS NOT NULL;
UPDATE users SET profile_image_url = avatar_url WHERE profile_image_url IS NULL AND avatar_url IS NOT NULL;

COMMENT ON COLUMN users.name IS 'User display name (migrated from full_name)';
COMMENT ON COLUMN users.last_login IS 'Last login timestamp (migrated from last_login_at)';

-- ----------------------------------------------------------------------------
-- inquiries table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS product_details TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS preferred_contact VARCHAR(50);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}'::text[];

-- Migrate data
UPDATE inquiries SET product_name = title WHERE product_name IS NULL AND title IS NOT NULL;
UPDATE inquiries SET product_details = description WHERE product_details IS NULL;
UPDATE inquiries SET attachment_urls = CASE
  WHEN images IS NOT NULL THEN images
  ELSE '{}'::text[]
END WHERE attachment_urls = '{}'::text[];

COMMENT ON COLUMN inquiries.product_name IS 'Name of the product being inquired about';
COMMENT ON COLUMN inquiries.attachment_urls IS 'Array of attachment URLs';

-- ----------------------------------------------------------------------------
-- inquiry_responses table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE inquiry_responses ADD COLUMN IF NOT EXISTS estimated_delivery_days INTEGER;
ALTER TABLE inquiry_responses ADD COLUMN IF NOT EXISTS payment_request_expires_at TIMESTAMPTZ;
ALTER TABLE inquiry_responses ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50);
ALTER TABLE inquiry_responses ADD COLUMN IF NOT EXISTS response_message TEXT;
ALTER TABLE inquiry_responses ADD COLUMN IF NOT EXISTS response_type VARCHAR(50);

-- Migrate data
UPDATE inquiry_responses SET estimated_delivery_days = delivery_time_days WHERE estimated_delivery_days IS NULL;
UPDATE inquiry_responses SET response_message = message WHERE response_message IS NULL;

COMMENT ON COLUMN inquiry_responses.response_message IS 'Shop response message';
COMMENT ON COLUMN inquiry_responses.estimated_delivery_days IS 'Estimated delivery time in days';

-- ----------------------------------------------------------------------------
-- products table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_tracking BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS credits_cost INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Migrate data
UPDATE products SET stock_quantity = quantity WHERE stock_quantity IS NULL AND quantity IS NOT NULL;
UPDATE products SET inventory_tracking = track_inventory WHERE inventory_tracking IS NULL AND track_inventory IS NOT NULL;
UPDATE products SET cost_price = cost WHERE cost_price IS NULL AND cost IS NOT NULL;
UPDATE products SET is_active = is_available WHERE is_active IS NULL;

COMMENT ON COLUMN products.stock_quantity IS 'Current stock quantity (migrated from quantity)';
COMMENT ON COLUMN products.inventory_tracking IS 'Whether to track inventory (migrated from track_inventory)';
COMMENT ON COLUMN products.cost_price IS 'Cost price for profit calculation';

-- ----------------------------------------------------------------------------
-- shops table - Add payment-related columns
-- ----------------------------------------------------------------------------
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_upi_id VARCHAR(100);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_qr_code_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_phone_number VARCHAR(20);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS preferred_payment_methods TEXT[] DEFAULT '{}'::text[];
ALTER TABLE shops ADD COLUMN IF NOT EXISTS accepts_online_payments BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Migrate qr_code_url to payment_qr_code_url
UPDATE shops SET payment_qr_code_url = qr_code_url WHERE payment_qr_code_url IS NULL AND qr_code_url IS NOT NULL;
UPDATE shops SET payment_phone_number = phone_number WHERE payment_phone_number IS NULL;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_shops_search_vector ON shops USING GIN(search_vector);

COMMENT ON COLUMN shops.payment_upi_id IS 'UPI ID for accepting payments';
COMMENT ON COLUMN shops.payment_qr_code_url IS 'QR code URL for UPI payments';
COMMENT ON COLUMN shops.search_vector IS 'Full-text search vector for shop name and description';

-- ----------------------------------------------------------------------------
-- messages table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_text TEXT;

-- Migrate data
UPDATE messages SET message_text = content WHERE message_text IS NULL AND content IS NOT NULL;

COMMENT ON COLUMN messages.message_text IS 'Message text content (migrated from content)';

-- ----------------------------------------------------------------------------
-- payment_requests table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS confirmation_notes TEXT;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS payment_confirmed_by_shop BOOLEAN;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS request_status VARCHAR(50);

-- Migrate data
UPDATE payment_requests SET completed_at = payment_completed_at WHERE completed_at IS NULL;
UPDATE payment_requests SET request_status = status WHERE request_status IS NULL;
UPDATE payment_requests SET payment_confirmed_at = shop_confirmed_at WHERE payment_confirmed_at IS NULL;

COMMENT ON COLUMN payment_requests.request_status IS 'Request status (migrated from status)';

-- ----------------------------------------------------------------------------
-- payment_transactions table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS final_amount NUMERIC(10,2);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES credit_plans(id);

-- Migrate data
UPDATE payment_transactions SET final_amount = amount WHERE final_amount IS NULL;

COMMENT ON COLUMN payment_transactions.final_amount IS 'Final amount after all adjustments';
COMMENT ON COLUMN payment_transactions.plan_id IS 'Related credit plan if applicable';

-- ----------------------------------------------------------------------------
-- offers table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE offers ADD COLUMN IF NOT EXISTS applicable_to VARCHAR(50);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS offer_type VARCHAR(50);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

-- Migrate data
UPDATE offers SET terms_conditions = terms_and_conditions WHERE terms_conditions IS NULL;
UPDATE offers SET discount_percentage = CASE
  WHEN discount_type = 'percentage' THEN discount_value
  ELSE NULL
END WHERE discount_percentage IS NULL;

COMMENT ON COLUMN offers.terms_conditions IS 'Terms and conditions (migrated from terms_and_conditions)';

-- ----------------------------------------------------------------------------
-- shop_credits table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE shop_credits ADD COLUMN IF NOT EXISTS credits_expire_at TIMESTAMPTZ;
ALTER TABLE shop_credits ADD COLUMN IF NOT EXISTS earned_from_customer_referrals INTEGER DEFAULT 0;
ALTER TABLE shop_credits ADD COLUMN IF NOT EXISTS earned_from_shop_referrals INTEGER DEFAULT 0;
ALTER TABLE shop_credits ADD COLUMN IF NOT EXISTS lifetime_credits_purchased INTEGER DEFAULT 0;

-- Migrate data
UPDATE shop_credits SET lifetime_credits_purchased = total_purchased WHERE lifetime_credits_purchased = 0 AND total_purchased > 0;

COMMENT ON COLUMN shop_credits.lifetime_credits_purchased IS 'Total credits purchased over lifetime';
COMMENT ON COLUMN shop_credits.earned_from_customer_referrals IS 'Credits earned from customer referrals';

-- ----------------------------------------------------------------------------
-- user_favorites table - Add specific columns
-- ----------------------------------------------------------------------------
ALTER TABLE user_favorites ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE user_favorites ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE CASCADE;
ALTER TABLE user_favorites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Migrate data from polymorphic structure if needed
UPDATE user_favorites SET product_id = item_id WHERE item_type = 'product' AND product_id IS NULL;
UPDATE user_favorites SET shop_id = item_id WHERE item_type = 'shop' AND shop_id IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON user_favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_shop_id ON user_favorites(shop_id);

COMMENT ON COLUMN user_favorites.product_id IS 'Favorited product (migrated from polymorphic item_id)';
COMMENT ON COLUMN user_favorites.shop_id IS 'Favorited shop (migrated from polymorphic item_id)';

-- ----------------------------------------------------------------------------
-- user_roles table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS role_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN user_roles.role_data IS 'Additional role-specific data';

-- ----------------------------------------------------------------------------
-- reviews table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Migrate data
UPDATE reviews SET customer_id = user_id WHERE customer_id IS NULL;

COMMENT ON COLUMN reviews.customer_id IS 'Customer who wrote the review (migrated from user_id)';

-- ----------------------------------------------------------------------------
-- shop_reviews table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL;
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT false;
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS price_rating INTEGER CHECK (price_rating >= 1 AND price_rating <= 5);
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS review_images TEXT[] DEFAULT '{}'::text[];
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS review_status VARCHAR(50);
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS shop_response_at TIMESTAMPTZ;

-- Migrate data
UPDATE shop_reviews SET customer_id = user_id WHERE customer_id IS NULL;
UPDATE shop_reviews SET rating = overall_rating WHERE rating IS NULL;
UPDATE shop_reviews SET review_images = images WHERE review_images = '{}'::text[];
UPDATE shop_reviews SET review_status = status WHERE review_status IS NULL;
UPDATE shop_reviews SET shop_response_at = shop_responded_at WHERE shop_response_at IS NULL;

COMMENT ON COLUMN shop_reviews.customer_id IS 'Customer who wrote the review';
COMMENT ON COLUMN shop_reviews.rating IS 'Overall rating (migrated from overall_rating)';

-- ----------------------------------------------------------------------------
-- shop_review_stats table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE shop_review_stats ADD COLUMN IF NOT EXISTS avg_price NUMERIC(3,2);
ALTER TABLE shop_review_stats ADD COLUMN IF NOT EXISTS last_review_at TIMESTAMPTZ;
ALTER TABLE shop_review_stats ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ;
ALTER TABLE shop_review_stats ADD COLUMN IF NOT EXISTS reviews_with_images_count INTEGER DEFAULT 0;
ALTER TABLE shop_review_stats ADD COLUMN IF NOT EXISTS reviews_with_response_count INTEGER DEFAULT 0;
ALTER TABLE shop_review_stats ADD COLUMN IF NOT EXISTS verified_reviews_count INTEGER DEFAULT 0;

-- Migrate data
UPDATE shop_review_stats SET last_updated = last_calculated_at WHERE last_updated IS NULL;

COMMENT ON COLUMN shop_review_stats.last_updated IS 'Last update timestamp (migrated from last_calculated_at)';

-- ----------------------------------------------------------------------------
-- shop_subscriptions table - Add status and tier columns if missing
-- ----------------------------------------------------------------------------
-- These should already exist, but add if they don't
ALTER TABLE shop_subscriptions ADD COLUMN IF NOT EXISTS status subscription_status DEFAULT 'active';
ALTER TABLE shop_subscriptions ADD COLUMN IF NOT EXISTS tier subscription_tier NOT NULL;

-- ----------------------------------------------------------------------------
-- shop_verification_documents table - Add status column
-- ----------------------------------------------------------------------------
ALTER TABLE shop_verification_documents ADD COLUMN IF NOT EXISTS status verification_status DEFAULT 'pending';

-- ----------------------------------------------------------------------------
-- support_messages table - Add is_internal_note column
-- ----------------------------------------------------------------------------
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS is_internal_note BOOLEAN DEFAULT false;

-- Migrate data
UPDATE support_messages SET is_internal_note = is_internal WHERE is_internal_note IS FALSE AND is_internal IS NOT NULL;

COMMENT ON COLUMN support_messages.is_internal_note IS 'Whether message is internal (not visible to customer)';

-- ----------------------------------------------------------------------------
-- support_tickets table - Add missing columns
-- ----------------------------------------------------------------------------
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS priority support_ticket_priority DEFAULT 'medium';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS status support_ticket_status DEFAULT 'open';

-- Migrate indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_shop_id ON support_tickets(shop_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_inquiry_id ON support_tickets(inquiry_id);

-- ----------------------------------------------------------------------------
-- transactions table - Add enum columns
-- ----------------------------------------------------------------------------
-- Note: These columns should already exist, verifying they use correct ENUMs
ALTER TABLE transactions ALTER COLUMN status TYPE transaction_status USING status::transaction_status;
ALTER TABLE transactions ALTER COLUMN type TYPE transaction_type USING type::transaction_type;

-- ----------------------------------------------------------------------------
-- payouts table - Add status column with enum
-- ----------------------------------------------------------------------------
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS status payout_status DEFAULT 'pending';

-- ----------------------------------------------------------------------------
-- platform_alerts table - Add status and type columns with enums
-- ----------------------------------------------------------------------------
ALTER TABLE platform_alerts ADD COLUMN IF NOT EXISTS status alert_status DEFAULT 'active';
ALTER TABLE platform_alerts ADD COLUMN IF NOT EXISTS type alert_type NOT NULL;

-- ----------------------------------------------------------------------------
-- credit_costs table - Ensure action_type uses enum
-- ----------------------------------------------------------------------------
ALTER TABLE credit_costs ALTER COLUMN action_type TYPE credit_action_type USING action_type::credit_action_type;

-- ----------------------------------------------------------------------------
-- contact_requests table - Add status with enum
-- ----------------------------------------------------------------------------
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS status contact_request_status DEFAULT 'new';

-- ============================================================================
-- SECTION 3: FIX featured_items TABLE - COMPLETE RESTRUCTURE
-- ============================================================================

-- Backup existing data if table exists
CREATE TABLE IF NOT EXISTS featured_items_backup AS
SELECT * FROM featured_items;

-- Drop and recreate with correct schema
DROP TABLE IF EXISTS featured_item_deductions CASCADE;
DROP TABLE IF EXISTS featured_items CASCADE;

CREATE TABLE featured_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('shop', 'product', 'offer')),
  featured_until TIMESTAMPTZ NOT NULL,
  daily_cost INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  credits_consumed INTEGER DEFAULT 0,
  total_credits_allocated INTEGER,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'expired')),
  version INTEGER DEFAULT 1,
  last_deduction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recreate featured_item_deductions
CREATE TABLE featured_item_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  featured_item_id UUID NOT NULL REFERENCES featured_items(id) ON DELETE CASCADE,
  credits_deducted INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  deduction_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_featured_items_shop_id ON featured_items(shop_id);
CREATE INDEX idx_featured_items_entity ON featured_items(entity_type, entity_id);
CREATE INDEX idx_featured_items_status ON featured_items(status);
CREATE INDEX idx_featured_items_featured_until ON featured_items(featured_until);
CREATE INDEX idx_featured_item_deductions_featured_item_id ON featured_item_deductions(featured_item_id);
CREATE INDEX idx_featured_item_deductions_deduction_date ON featured_item_deductions(deduction_date);

COMMENT ON TABLE featured_items IS 'Tracks featured items (products, offers, shops) with credit deduction';
COMMENT ON COLUMN featured_items.entity_id IS 'ID of the featured entity (product, offer, or shop)';
COMMENT ON COLUMN featured_items.entity_type IS 'Type of entity being featured';

-- ============================================================================
-- SECTION 4: CREATE MISSING ENUMS (if not exists)
-- ============================================================================

-- Most ENUMs should already exist from MASTER_MIGRATION.sql
-- This section adds any that are missing

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'availability_status') THEN
    CREATE TYPE availability_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'discontinued');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_preference') THEN
    CREATE TYPE contact_preference AS ENUM ('chat', 'phone', 'email');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupon_type') THEN
    CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed_amount', 'bonus_credits');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_transaction_type') THEN
    CREATE TYPE credit_transaction_type AS ENUM ('purchase', 'usage', 'refund', 'bonus', 'expiry', 'adjustment');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'featured_item_status') THEN
    CREATE TYPE featured_item_status AS ENUM ('active', 'paused', 'completed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'quote');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('initiated', 'pending', 'success', 'failed', 'refunded');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_entity_type') THEN
    CREATE TYPE referral_entity_type AS ENUM ('shop', 'customer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_transaction_status') THEN
    CREATE TYPE referral_transaction_status AS ENUM ('pending', 'completed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_category') THEN
    CREATE TYPE support_ticket_category AS ENUM (
      'payment_issues',
      'technical_issues',
      'account_verification',
      'refunds_disputes',
      'general_inquiry',
      'shop_management',
      'product_issues'
    );
  END IF;
END $$;

-- ============================================================================
-- SECTION 5: ADD RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpfulness ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_tags ENABLE ROW LEVEL SECURITY;

-- inventory_movements policies
CREATE POLICY "Shop owners can view their inventory movements"
  ON inventory_movements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM products p
    INNER JOIN shops s ON s.id = p.shop_id
    WHERE p.id = inventory_movements.product_id
    AND s.owner_id = auth.uid()
  ));

CREATE POLICY "Shop owners can insert inventory movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM products p
    INNER JOIN shops s ON s.id = p.shop_id
    WHERE p.id = inventory_movements.product_id
    AND s.owner_id = auth.uid()
  ));

-- product_stats policies
CREATE POLICY "Anyone can view product stats"
  ON product_stats FOR SELECT
  USING (true);

CREATE POLICY "System can update product stats"
  ON product_stats FOR ALL
  USING (is_admin(auth.uid()));

-- referral_config policies
CREATE POLICY "Anyone can view referral config"
  ON referral_config FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify referral config"
  ON referral_config FOR ALL
  USING (is_admin(auth.uid()));

-- review_helpfulness policies
CREATE POLICY "Users can view review helpfulness"
  ON review_helpfulness FOR SELECT
  USING (true);

CREATE POLICY "Users can mark reviews as helpful"
  ON review_helpfulness FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their helpfulness votes"
  ON review_helpfulness FOR UPDATE
  USING (auth.uid() = user_id);

-- review_reports policies
CREATE POLICY "Users can view their reports"
  ON review_reports FOR SELECT
  USING (auth.uid() = reported_by OR is_admin(auth.uid()));

CREATE POLICY "Users can create reports"
  ON review_reports FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Admins can manage reports"
  ON review_reports FOR ALL
  USING (is_admin(auth.uid()));

-- review_templates policies
CREATE POLICY "Anyone can view active templates"
  ON review_templates FOR SELECT
  USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY "Only admins can manage templates"
  ON review_templates FOR ALL
  USING (is_admin(auth.uid()));

-- shop_categories policies
CREATE POLICY "Anyone can view active categories"
  ON shop_categories FOR SELECT
  USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY "Only admins can manage categories"
  ON shop_categories FOR ALL
  USING (is_admin(auth.uid()));

-- shop_owner_profiles policies
CREATE POLICY "Shop owners can view own profile"
  ON shop_owner_profiles FOR SELECT
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Shop owners can update own profile"
  ON shop_owner_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Shop owners can insert own profile"
  ON shop_owner_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- shop_payment_transactions policies
CREATE POLICY "Users can view relevant payment transactions"
  ON shop_payment_transactions FOR SELECT
  USING (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_payment_transactions.shop_id AND shops.owner_id = auth.uid())
    OR is_admin(auth.uid())
  );

CREATE POLICY "Customers can create payment transactions"
  ON shop_payment_transactions FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Relevant users can update payment transactions"
  ON shop_payment_transactions FOR UPDATE
  USING (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_payment_transactions.shop_id AND shops.owner_id = auth.uid())
  );

-- support_ticket_tags policies
CREATE POLICY "Users can view tags on their tickets"
  ON support_ticket_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_ticket_tags.ticket_id
      AND (support_tickets.user_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Staff can manage tags"
  ON support_ticket_tags FOR ALL
  USING (is_admin(auth.uid()));

-- ============================================================================
-- SECTION 6: CREATE TRIGGERS FOR NEW TABLES
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_product_stats_updated_at
  BEFORE UPDATE ON product_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_categories_updated_at
  BEFORE UPDATE ON shop_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_owner_profiles_updated_at
  BEFORE UPDATE ON shop_owner_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_payment_transactions_updated_at
  BEFORE UPDATE ON shop_payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_favorites_updated_at
  BEFORE UPDATE ON user_favorites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 7: UPDATE SEARCH VECTORS FOR SHOPS
-- ============================================================================

-- Function to update shop search vector
CREATE OR REPLACE FUNCTION update_shop_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(NEW.categories, ' ')), 'C');
  RETURN NEW;
END;
$$;

-- Trigger to auto-update search vector
CREATE TRIGGER update_shops_search_vector
  BEFORE INSERT OR UPDATE OF name, description, categories ON shops
  FOR EACH ROW EXECUTE FUNCTION update_shop_search_vector();

-- Populate search vectors for existing shops
UPDATE shops SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', array_to_string(categories, ' ')), 'C')
WHERE search_vector IS NULL;

-- ============================================================================
-- SECTION 8: DATA VALIDATION AND CLEANUP
-- ============================================================================

-- Set default values for columns that should not be NULL
UPDATE users SET is_active = true WHERE is_active IS NULL;
UPDATE products SET is_active = true WHERE is_active IS NULL;
UPDATE products SET inventory_tracking = true WHERE inventory_tracking IS NULL;
UPDATE shops SET accepts_online_payments = true WHERE accepts_online_payments IS NULL;

-- ============================================================================
-- SECTION 9: VERIFICATION QUERIES
-- ============================================================================

-- Count rows in new tables (should be 0 after fresh migration)
DO $$
DECLARE
  rec RECORD;
  row_count INTEGER;
BEGIN
  RAISE NOTICE '=== New Tables Row Counts ===';
  FOR rec IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
      'inventory_movements',
      'product_stats',
      'referral_config',
      'review_helpfulness',
      'review_reports',
      'review_templates',
      'shop_categories',
      'shop_owner_profiles',
      'shop_payment_transactions',
      'support_ticket_tags'
    )
  LOOP
    EXECUTE format('SELECT count(*) FROM %I', rec.table_name) INTO row_count;
    RAISE NOTICE '% : % rows', rec.table_name, row_count;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- END OF MIGRATION FIXES
-- ============================================================================
--
-- Post-migration steps:
-- 1. Verify all tables exist: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- 2. Check for missing indexes: SELECT * FROM pg_indexes WHERE schemaname = 'public';
-- 3. Verify RLS policies: SELECT * FROM pg_policies;
-- 4. Generate new types.ts: supabase gen types typescript --local > types_new.ts
-- 5. Compare types_new.ts with current types.ts
-- 6. Run application tests
-- ============================================================================
