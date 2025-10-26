-- ============================================================================
-- LocalConnect Customer App - MASTER DATABASE MIGRATION
-- ============================================================================
-- Version: 1.0.0
-- Created: 2025-10-24
-- Description: Complete database schema for LocalConnect marketplace platform
--
-- This script creates the entire database schema from scratch, consolidating
-- all 126+ individual migrations into a single, conflict-free migration.
--
-- IMPORTANT: Run this on a FRESH Supabase database project
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Full-text search
CREATE EXTENSION IF NOT EXISTS "postgis";        -- Geospatial data
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions

-- Note: gen_random_uuid() is built-in for PostgreSQL 13+, no extension needed

-- ============================================================================
-- SECTION 2: ENUM TYPES
-- ============================================================================

-- User-related enums
CREATE TYPE user_role AS ENUM (
  'customer',
  'shop_owner',
  'admin',
  'super_admin'
);

CREATE TYPE user_status AS ENUM (
  'active',
  'inactive',
  'suspended',
  'banned'
);

-- Shop-related enums
CREATE TYPE shop_status AS ENUM (
  'pending',
  'active',
  'suspended',
  'rejected',
  'closed'
);

CREATE TYPE verification_status AS ENUM (
  'pending',
  'verified',
  'rejected',
  'requires_update'
);

CREATE TYPE subscription_tier AS ENUM (
  'free',
  'basic',
  'premium',
  'enterprise'
);

CREATE TYPE subscription_status AS ENUM (
  'active',
  'cancelled',
  'expired',
  'suspended'
);

-- Inquiry and offer enums
CREATE TYPE inquiry_status AS ENUM (
  'draft',
  'pending',
  'accepted',
  'rejected',
  'completed',
  'cancelled',
  'quoted'
);

CREATE TYPE offer_status AS ENUM (
  'draft',
  'active',
  'expired',
  'paused',
  'cancelled'
);

-- Transaction and payment enums
CREATE TYPE transaction_type AS ENUM (
  'order',
  'refund',
  'commission',
  'payout',
  'subscription',
  'adjustment',
  'credit_purchase',
  'credit_deduction'
);

CREATE TYPE transaction_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'cancelled',
  'refunded'
);

CREATE TYPE payout_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE payment_method_type AS ENUM (
  'upi',
  'card',
  'netbanking',
  'wallet',
  'cod'
);

-- Review and content enums
CREATE TYPE review_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'flagged'
);

CREATE TYPE content_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'flagged'
);

-- Credit system enums
CREATE TYPE credit_action_type AS ENUM (
  'inquiry_response',
  'featured_product',
  'featured_offer',
  'featured_shop',
  'boost_visibility',
  'premium_badge'
);

-- Support and contact enums
CREATE TYPE contact_request_status AS ENUM (
  'new',
  'in_progress',
  'resolved',
  'closed'
);

CREATE TYPE support_ticket_status AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'closed'
);

CREATE TYPE support_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Alert enums
CREATE TYPE alert_type AS ENUM (
  'info',
  'warning',
  'error',
  'critical'
);

CREATE TYPE alert_status AS ENUM (
  'active',
  'acknowledged',
  'resolved',
  'dismissed'
);

-- ============================================================================
-- SECTION 3: CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Users Table (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auth integration
  auth_id UUID UNIQUE,  -- Reference to auth.users, nullable for testing

  -- Profile information
  email VARCHAR(255),
  phone_number VARCHAR(20),
  full_name VARCHAR(255),
  avatar_url TEXT,

  -- Address information
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  location GEOGRAPHY(POINT),  -- PostGIS point for lat/lng

  -- Role and status
  role user_role DEFAULT 'customer',
  status user_status DEFAULT 'active',

  -- Verification
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,

  -- Activity tracking
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,

  -- Customer-specific fields
  total_spent NUMERIC(12,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,

  -- Referral system
  referral_code VARCHAR(20) UNIQUE,
  referred_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone_number IS NOT NULL)
);

-- Add foreign key to auth.users if it exists
-- Note: This may need to be added after ensuring auth schema exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    ALTER TABLE users ADD CONSTRAINT users_auth_id_fkey
      FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMENT ON TABLE users IS 'Core users table for both customers and shop owners';
COMMENT ON COLUMN users.auth_id IS 'Links to Supabase auth.users for authentication';
COMMENT ON COLUMN users.location IS 'PostGIS geography point for location-based features';

-- ----------------------------------------------------------------------------
-- User Roles Table (for admin access control)
-- ----------------------------------------------------------------------------
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, role)
);

COMMENT ON TABLE user_roles IS 'Manages user role assignments with expiration';

-- ----------------------------------------------------------------------------
-- Customer Profiles Table (extended customer data)
-- ----------------------------------------------------------------------------
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Preferences
  preferred_categories TEXT[],
  favorite_shops UUID[],
  saved_addresses JSONB DEFAULT '[]'::jsonb,

  -- Shopping preferences
  preferred_payment_method payment_method_type,
  budget_range JSONB,  -- {min: number, max: number}

  -- Activity
  last_inquiry_at TIMESTAMPTZ,
  total_inquiries INTEGER DEFAULT 0,

  -- Loyalty
  loyalty_tier VARCHAR(50) DEFAULT 'bronze',
  loyalty_points INTEGER DEFAULT 0,

  -- Metadata
  preferences JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE customer_profiles IS 'Extended profile data for customer users';

-- ----------------------------------------------------------------------------
-- Customer Payment Preferences
-- ----------------------------------------------------------------------------
CREATE TABLE customer_payment_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferred_payment_app VARCHAR(50),  -- 'gpay', 'phonepe', 'paytm', etc.
  saved_upi_ids TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Shops Table
-- ----------------------------------------------------------------------------
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic information
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  tagline VARCHAR(255),

  -- Categories
  categories TEXT[] DEFAULT '{}'::text[],

  -- Contact information
  email VARCHAR(255),
  phone_number VARCHAR(20),
  whatsapp_number VARCHAR(20),

  -- Address and location
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  location GEOGRAPHY(POINT),  -- PostGIS point

  -- Media
  logo_url TEXT,
  cover_image_url TEXT,
  gallery_images TEXT[] DEFAULT '{}'::text[],
  qr_code_url TEXT,  -- For UPI payments

  -- Business details
  business_hours JSONB DEFAULT '{}'::jsonb,
  website VARCHAR(500),
  social_links JSONB DEFAULT '{}'::jsonb,

  -- Status and verification
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  verification_status verification_status DEFAULT 'pending',
  status shop_status DEFAULT 'pending',

  -- Subscription
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_status subscription_status DEFAULT 'active',
  subscription_expires_at TIMESTAMPTZ,

  -- Ratings and stats
  rating NUMERIC(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  response_rate NUMERIC(5,2) DEFAULT 0,
  response_time_hours NUMERIC(8,2),

  -- Credits
  credits_balance INTEGER DEFAULT 0,

  -- Commission
  commission_rate NUMERIC(5,2) DEFAULT 15.00,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ
);

COMMENT ON TABLE shops IS 'Shop/business listings on the platform';
COMMENT ON COLUMN shops.location IS 'PostGIS geography point for location-based search';
COMMENT ON COLUMN shops.qr_code_url IS 'UPI QR code for accepting payments';

-- ----------------------------------------------------------------------------
-- Shop Credits Table
-- ----------------------------------------------------------------------------
CREATE TABLE shop_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,

  -- Balance
  total_credits INTEGER DEFAULT 0,
  available_credits INTEGER DEFAULT 0,
  reserved_credits INTEGER DEFAULT 0,

  -- Lifetime stats
  total_purchased INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,

  -- Last activity
  last_purchase_at TIMESTAMPTZ,
  last_deduction_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE shop_credits IS 'Tracks credit balance for each shop';

-- ----------------------------------------------------------------------------
-- Credit Plans Table
-- ----------------------------------------------------------------------------
CREATE TABLE credit_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan details
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,

  -- Pricing
  credits_amount INTEGER NOT NULL,
  bonus_credits INTEGER DEFAULT 0,
  price_inr NUMERIC(10,2) NOT NULL,

  -- Validity
  validity_days INTEGER DEFAULT 365,

  -- Features
  features JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE credit_plans IS 'Predefined credit packages for shops to purchase';

-- ----------------------------------------------------------------------------
-- Credit Batches Table (tracks purchases)
-- ----------------------------------------------------------------------------
CREATE TABLE credit_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Purchase details
  credits_purchased INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,

  -- Payment
  payment_transaction_id UUID,  -- FK added later

  -- Validity
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE credit_batches IS 'Tracks individual credit purchases with expiration';

-- ----------------------------------------------------------------------------
-- Credit Costs Table (defines costs for actions)
-- ----------------------------------------------------------------------------
CREATE TABLE credit_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Action definition
  action_type credit_action_type NOT NULL UNIQUE,
  description TEXT,

  -- Costs
  cost_per_action INTEGER DEFAULT 0,
  daily_cost INTEGER DEFAULT 0,
  duration_days INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE credit_costs IS 'Defines credit costs for various platform actions';

-- ----------------------------------------------------------------------------
-- Credit Transactions Table
-- ----------------------------------------------------------------------------
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL,  -- 'purchase', 'deduction', 'refund', 'bonus'
  amount INTEGER NOT NULL,  -- Positive for credit, negative for debit
  balance_after INTEGER NOT NULL,

  -- References
  reference_type VARCHAR(50),  -- 'featured_item', 'inquiry_response', etc.
  reference_id UUID,
  payment_transaction_id UUID,  -- FK added later

  -- Description
  description TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'completed',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE credit_transactions IS 'Audit log of all credit additions and deductions';

-- ----------------------------------------------------------------------------
-- Shop Verification Documents
-- ----------------------------------------------------------------------------
CREATE TABLE shop_verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Document info
  document_type VARCHAR(100) NOT NULL,  -- 'business_license', 'tax_id', 'identity', 'address_proof'
  document_url TEXT NOT NULL,
  document_number VARCHAR(100),

  -- Status
  status verification_status DEFAULT 'pending',

  -- Review
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE shop_verification_documents IS 'Documents submitted for shop verification';

-- ----------------------------------------------------------------------------
-- Shop Subscriptions Table
-- ----------------------------------------------------------------------------
CREATE TABLE shop_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Subscription details
  tier subscription_tier NOT NULL,
  status subscription_status DEFAULT 'active',

  -- Pricing
  price NUMERIC(10,2) NOT NULL,
  billing_cycle VARCHAR(20) DEFAULT 'monthly',  -- 'monthly', 'yearly'

  -- Period
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,

  -- Auto-renewal
  auto_renew BOOLEAN DEFAULT true,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE shop_subscriptions IS 'Tracks shop subscription history';

-- ============================================================================
-- SECTION 4: PRODUCT AND CATALOG TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Products Table
-- ----------------------------------------------------------------------------
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Basic information
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),

  -- Categories and tags
  category VARCHAR(100),
  subcategory VARCHAR(100),
  tags TEXT[] DEFAULT '{}'::text[],

  -- Pricing
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC(10,2),
  cost NUMERIC(10,2),

  -- Inventory
  sku VARCHAR(100),
  barcode VARCHAR(100),
  quantity INTEGER DEFAULT 0,
  track_inventory BOOLEAN DEFAULT true,
  low_stock_threshold INTEGER DEFAULT 10,

  -- Images
  images TEXT[] DEFAULT '{}'::text[],
  thumbnail_url TEXT,

  -- Specifications
  specifications JSONB DEFAULT '{}'::jsonb,
  variants JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_available BOOLEAN DEFAULT true,
  status content_status DEFAULT 'pending',
  is_featured BOOLEAN DEFAULT false,

  -- Stats
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  order_count INTEGER DEFAULT 0,

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  search_terms TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(shop_id, slug)
);

COMMENT ON TABLE products IS 'Product catalog for shops';

-- ============================================================================
-- SECTION 5: INQUIRY AND MESSAGING TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Inquiries Table
-- ----------------------------------------------------------------------------
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parties
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,  -- Primary shop for single inquiry

  -- Product reference (optional)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Inquiry details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,

  -- Budget and quantity
  budget_min NUMERIC(10,2),
  budget_max NUMERIC(10,2),
  quantity INTEGER,
  unit VARCHAR(50),

  -- Timeline
  required_by DATE,

  -- Status
  status inquiry_status DEFAULT 'pending',

  -- Response tracking
  response_count INTEGER DEFAULT 0,
  last_response_at TIMESTAMPTZ,

  -- Images
  images TEXT[] DEFAULT '{}'::text[],

  -- Delivery
  delivery_address JSONB,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

COMMENT ON TABLE inquiries IS 'Customer inquiries for products or services';

-- ----------------------------------------------------------------------------
-- Inquiry Shops Junction Table (for multi-shop inquiries)
-- ----------------------------------------------------------------------------
CREATE TABLE inquiry_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Status for this shop
  status inquiry_status DEFAULT 'pending',

  -- Shop response
  shop_response TEXT,
  quoted_price NUMERIC(10,2),
  quoted_delivery_days INTEGER,
  shop_response_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(inquiry_id, shop_id)
);

COMMENT ON TABLE inquiry_shops IS 'Many-to-many relationship for inquiries sent to multiple shops';

-- ----------------------------------------------------------------------------
-- Inquiry Responses Table
-- ----------------------------------------------------------------------------
CREATE TABLE inquiry_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Response details
  message TEXT NOT NULL,
  quoted_price NUMERIC(10,2),
  delivery_time_days INTEGER,

  -- Terms
  terms_and_conditions TEXT,
  payment_terms TEXT,

  -- Attachments
  attachments TEXT[] DEFAULT '{}'::text[],

  -- Status
  status VARCHAR(50) DEFAULT 'sent',  -- 'sent', 'viewed', 'accepted', 'rejected'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ
);

COMMENT ON TABLE inquiry_responses IS 'Shop responses to customer inquiries';

-- ----------------------------------------------------------------------------
-- Messages Table (chat between customer and shop)
-- ----------------------------------------------------------------------------
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parties
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Context
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,

  -- Message content
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',  -- 'text', 'image', 'file', 'quote'
  attachments TEXT[] DEFAULT '{}'::text[],

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- System messages
  is_system_message BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE messages IS 'Chat messages between customers and shops';

-- ============================================================================
-- SECTION 6: ORDERS AND TRANSACTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Orders Table
-- ----------------------------------------------------------------------------
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Order identification
  order_number VARCHAR(50) UNIQUE NOT NULL,

  -- Parties
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,

  -- Related entities
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,

  -- Order details
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'

  -- Amounts
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) DEFAULT 0,
  shipping NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,

  -- Commission
  commission_amount NUMERIC(10,2) DEFAULT 0,
  commission_rate NUMERIC(5,2),

  -- Payment
  payment_method payment_method_type,
  payment_status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'paid', 'failed', 'refunded'
  paid_at TIMESTAMPTZ,

  -- Addresses
  shipping_address JSONB NOT NULL,
  billing_address JSONB,

  -- Tracking
  tracking_number VARCHAR(100),
  carrier VARCHAR(100),

  -- Dates
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Notes
  customer_notes TEXT,
  shop_notes TEXT,
  admin_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE orders IS 'Customer orders placed with shops';

-- ----------------------------------------------------------------------------
-- Order Items Table
-- ----------------------------------------------------------------------------
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Product reference
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),

  -- Variant
  variant_info JSONB,

  -- Quantity and pricing
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE order_items IS 'Line items in customer orders';

-- ----------------------------------------------------------------------------
-- Transactions Table (financial records)
-- ----------------------------------------------------------------------------
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transaction type and status
  type transaction_type NOT NULL,
  status transaction_status DEFAULT 'pending',

  -- Parties
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,

  -- Related entities
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payout_id UUID,  -- FK added later

  -- Amount
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  fee NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(12,2),

  -- Payment details
  payment_method payment_method_type,
  payment_provider VARCHAR(50),
  provider_transaction_id VARCHAR(255),

  -- Description
  description TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

COMMENT ON TABLE transactions IS 'Financial transaction records for all money movement';

-- ----------------------------------------------------------------------------
-- Payouts Table
-- ----------------------------------------------------------------------------
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Amount
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',

  -- Status
  status payout_status DEFAULT 'pending',

  -- Method
  method VARCHAR(50),  -- 'bank_transfer', 'upi', etc.
  account_details JSONB,  -- Encrypted account info

  -- Processing
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,

  -- Failure
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE payouts IS 'Payout requests to shops';

-- Add foreign key from transactions to payouts
ALTER TABLE transactions ADD CONSTRAINT transactions_payout_id_fkey
  FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 7: PAYMENT SYSTEM (UPI)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Payment Requests Table
-- ----------------------------------------------------------------------------
CREATE TABLE payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parties
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Related entity
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Payment details
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 50 AND amount <= 100000),
  payment_method VARCHAR(50) DEFAULT 'UPI',

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'initiated' CHECK (
    status IN (
      'initiated',
      'launched',
      'customer_claimed_success',
      'customer_claimed_failed',
      'shop_confirmed',
      'shop_rejected',
      'verified',
      'disputed',
      'refunded',
      'cancelled'
    )
  ),

  -- Customer confirmation
  customer_confirmation VARCHAR(20) CHECK (
    customer_confirmation IN ('success', 'failed', 'pending')
  ),
  customer_confirmed_at TIMESTAMPTZ,
  customer_screenshot_url TEXT,

  -- Shop confirmation
  shop_confirmation VARCHAR(20) CHECK (
    shop_confirmation IN ('received', 'not_received', 'pending')
  ),
  shop_confirmed_at TIMESTAMPTZ,
  shop_screenshot_url TEXT,

  -- Transaction details
  transaction_id VARCHAR(100),
  transaction_ref VARCHAR(100),
  upi_transaction_id VARCHAR(50),

  -- Verification
  verification_confidence INTEGER DEFAULT 0 CHECK (verification_confidence >= 0 AND verification_confidence <= 100),
  verification_evidence JSONB DEFAULT '[]'::jsonb,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),

  -- Timeline
  payment_initiated_at TIMESTAMPTZ DEFAULT now(),
  payment_completed_at TIMESTAMPTZ,
  dispute_raised_at TIMESTAMPTZ,
  dispute_resolved_at TIMESTAMPTZ,

  -- Notes
  customer_notes TEXT,
  shop_notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE payment_requests IS 'Tracks UPI payment requests with verification workflow';

-- ----------------------------------------------------------------------------
-- Payment Verification Evidence
-- ----------------------------------------------------------------------------
CREATE TABLE payment_verification_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,

  -- Evidence type
  evidence_type VARCHAR(50) NOT NULL CHECK (
    evidence_type IN (
      'customer_confirmation',
      'shop_confirmation',
      'transaction_id',
      'screenshot',
      'bank_statement',
      'upi_notification',
      'admin_verification'
    )
  ),

  -- Evidence data
  evidence_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- Submission
  submitted_by UUID REFERENCES users(id),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE payment_verification_evidence IS 'Evidence submitted for payment verification';

-- ----------------------------------------------------------------------------
-- Payment Follow-ups
-- ----------------------------------------------------------------------------
CREATE TABLE payment_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,

  -- Follow-up type
  follow_up_type VARCHAR(50) NOT NULL CHECK (
    follow_up_type IN (
      'verification_reminder',
      'shop_confirmation_request',
      'dispute_investigation',
      'refund_process',
      'payment_timeout'
    )
  ),

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'completed', 'cancelled')
  ),

  -- Schedule
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Communication
  message_sent TEXT,
  response_received TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE payment_follow_ups IS 'Automated follow-ups for payment verification';

-- ----------------------------------------------------------------------------
-- Payment Disputes
-- ----------------------------------------------------------------------------
CREATE TABLE payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,

  -- Dispute details
  raised_by UUID NOT NULL REFERENCES users(id),
  dispute_type VARCHAR(50) NOT NULL CHECK (
    dispute_type IN (
      'payment_not_received',
      'wrong_amount',
      'duplicate_payment',
      'unauthorized_payment',
      'other'
    )
  ),

  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}'::text[],

  -- Status
  status VARCHAR(20) DEFAULT 'open' CHECK (
    status IN ('open', 'investigating', 'resolved', 'rejected', 'escalated')
  ),

  -- Resolution
  resolution TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE payment_disputes IS 'Handles payment disputes and resolution';

-- ----------------------------------------------------------------------------
-- Payment Transactions Table
-- ----------------------------------------------------------------------------
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Payment details
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  payment_gateway VARCHAR(50),  -- 'razorpay', 'phonepe', 'manual_upi', etc.

  -- Parties
  payer_id UUID REFERENCES users(id),
  payee_id UUID REFERENCES users(id),
  shop_id UUID REFERENCES shops(id),

  -- Amount
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',

  -- Status
  status transaction_status DEFAULT 'pending',

  -- Gateway response
  gateway_transaction_id VARCHAR(255),
  gateway_response JSONB,

  -- Method
  payment_method payment_method_type,
  upi_id VARCHAR(100),

  -- Related entities
  order_id UUID REFERENCES orders(id),
  payment_request_id UUID REFERENCES payment_requests(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE payment_transactions IS 'Records all payment transactions through payment gateways';

-- Add FK to credit_batches
ALTER TABLE credit_batches ADD CONSTRAINT credit_batches_payment_transaction_id_fkey
  FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE SET NULL;

-- Add FK to credit_transactions
ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_payment_transaction_id_fkey
  FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 8: OFFERS AND PROMOTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Offers Table
-- ----------------------------------------------------------------------------
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Offer details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  terms_and_conditions TEXT,

  -- Discount
  discount_type VARCHAR(20),  -- 'percentage', 'fixed', 'bogo'
  discount_value NUMERIC(10,2),

  -- Validity
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,

  -- Limits
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  max_uses_per_customer INTEGER DEFAULT 1,

  -- Targeting
  applicable_products UUID[] DEFAULT '{}'::uuid[],
  applicable_categories TEXT[] DEFAULT '{}'::text[],
  minimum_order_value NUMERIC(10,2),

  -- Status
  status offer_status DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT false,

  -- Images
  image_url TEXT,
  banner_url TEXT,

  -- Stats
  view_count INTEGER DEFAULT 0,
  redemption_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE offers IS 'Promotional offers created by shops';

-- ============================================================================
-- SECTION 9: REVIEWS AND RATINGS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Reviews Table (product reviews)
-- ----------------------------------------------------------------------------
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parties
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,

  -- Images
  images TEXT[] DEFAULT '{}'::text[],

  -- Status
  status review_status DEFAULT 'pending',

  -- Moderation
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMPTZ,

  -- Engagement
  helpful_count INTEGER DEFAULT 0,

  -- Verified purchase
  is_verified_purchase BOOLEAN DEFAULT false,

  -- Shop response
  shop_response TEXT,
  shop_responded_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE reviews IS 'Product and order reviews by customers';

-- ----------------------------------------------------------------------------
-- Shop Reviews Table (overall shop ratings)
-- ----------------------------------------------------------------------------
CREATE TABLE shop_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parties
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Ratings (detailed)
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  product_quality_rating INTEGER CHECK (product_quality_rating >= 1 AND product_quality_rating <= 5),
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),

  -- Review content
  title VARCHAR(255),
  comment TEXT,

  -- Images
  images TEXT[] DEFAULT '{}'::text[],

  -- Status
  status review_status DEFAULT 'pending',

  -- Moderation
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMPTZ,

  -- Engagement
  helpful_count INTEGER DEFAULT 0,

  -- Shop response
  shop_response TEXT,
  shop_responded_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, order_id)  -- One review per order
);

COMMENT ON TABLE shop_reviews IS 'Overall shop ratings and reviews';

-- ----------------------------------------------------------------------------
-- Shop Review Stats (materialized stats)
-- ----------------------------------------------------------------------------
CREATE TABLE shop_review_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,

  -- Overall stats
  total_reviews INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,

  -- Rating distribution
  rating_5_count INTEGER DEFAULT 0,
  rating_4_count INTEGER DEFAULT 0,
  rating_3_count INTEGER DEFAULT 0,
  rating_2_count INTEGER DEFAULT 0,
  rating_1_count INTEGER DEFAULT 0,

  -- Detailed ratings
  avg_product_quality NUMERIC(3,2) DEFAULT 0,
  avg_service NUMERIC(3,2) DEFAULT 0,
  avg_communication NUMERIC(3,2) DEFAULT 0,
  avg_delivery NUMERIC(3,2) DEFAULT 0,

  -- Timestamps
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE shop_review_stats IS 'Pre-calculated review statistics for shops';

-- ============================================================================
-- SECTION 10: FEATURED ITEMS AND PROMOTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Featured Items Table
-- ----------------------------------------------------------------------------
CREATE TABLE featured_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Item details
  item_type VARCHAR(50) NOT NULL,  -- 'product', 'offer', 'shop'
  item_id UUID NOT NULL,

  -- Visibility
  feature_type credit_action_type NOT NULL,  -- Maps to credit costs
  position INTEGER,

  -- Period
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  auto_renewed BOOLEAN DEFAULT false,

  -- Credits
  credits_per_day INTEGER NOT NULL,
  total_credits_spent INTEGER DEFAULT 0,

  -- Stats
  views_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,

  -- Last deduction
  last_deduction_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE featured_items IS 'Tracks featured items (products, offers, shops) with credit deduction';

-- ----------------------------------------------------------------------------
-- Featured Item Deductions
-- ----------------------------------------------------------------------------
CREATE TABLE featured_item_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  featured_item_id UUID NOT NULL REFERENCES featured_items(id) ON DELETE CASCADE,

  -- Deduction details
  credits_deducted INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  deduction_date DATE NOT NULL,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE featured_item_deductions IS 'Daily credit deductions for featured items';

-- ============================================================================
-- SECTION 11: NOTIFICATIONS AND ALERTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Notifications Table
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification details
  type VARCHAR(100) NOT NULL,  -- 'inquiry_response', 'order_update', 'payment_received', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Related entity
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Action
  action_url TEXT,
  action_label VARCHAR(50),

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Delivery
  delivery_channels TEXT[] DEFAULT '{email, push}'::text[],
  delivered_at TIMESTAMPTZ,

  -- Priority
  priority VARCHAR(20) DEFAULT 'normal',  -- 'low', 'normal', 'high', 'urgent'

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

COMMENT ON TABLE notifications IS 'User notifications for various events';

-- ----------------------------------------------------------------------------
-- Platform Alerts Table (admin alerts)
-- ----------------------------------------------------------------------------
CREATE TABLE platform_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert details
  type alert_type NOT NULL,
  status alert_status DEFAULT 'active',

  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity INTEGER DEFAULT 1 CHECK (severity >= 1 AND severity <= 5),

  -- Source
  source VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Response
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE platform_alerts IS 'System alerts for platform administrators';

-- ============================================================================
-- SECTION 12: ANALYTICS AND TRACKING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Analytics Events Table
-- ----------------------------------------------------------------------------
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID,

  -- Event
  event_type VARCHAR(100) NOT NULL,  -- 'page_view', 'product_view', 'inquiry_submit', etc.
  event_data JSONB DEFAULT '{}'::jsonb,

  -- Request details
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE analytics_events IS 'Tracks user events for analytics';

-- Create partition by month for analytics_events
-- Note: Implement partitioning strategy based on data volume

-- ----------------------------------------------------------------------------
-- View Analytics Table
-- ----------------------------------------------------------------------------
CREATE TABLE viewanalytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity being viewed
  entity_type VARCHAR(50) NOT NULL,  -- 'product', 'shop', 'offer'
  entity_id UUID NOT NULL,

  -- Viewer
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID,

  -- Request details
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,

  -- Location
  country VARCHAR(100),
  city VARCHAR(100),

  -- Duration
  duration_seconds INTEGER,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE viewanalytics IS 'Tracks views of products, shops, and offers';

-- ----------------------------------------------------------------------------
-- Entity View Counts (materialized counts)
-- ----------------------------------------------------------------------------
CREATE TABLE entityviewcounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,

  -- Period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Counts
  total_views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(entity_type, entity_id, period_start)
);

COMMENT ON TABLE entityviewcounts IS 'Pre-calculated view counts for entities by time period';

-- ----------------------------------------------------------------------------
-- Activity Feed Table
-- ----------------------------------------------------------------------------
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Activity
  type VARCHAR(100) NOT NULL,  -- 'shop_opened', 'product_added', 'order_placed', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Parties
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,

  -- Related entity
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Visibility
  is_public BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE activity_feed IS 'Public activity feed for platform events';

-- ============================================================================
-- SECTION 13: SUPPORT AND HELP
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Support Tickets Table
-- ----------------------------------------------------------------------------
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ticket details
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Reporter
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Classification
  category VARCHAR(100),  -- 'technical', 'billing', 'general', etc.
  priority support_priority DEFAULT 'medium',

  -- Status
  status support_ticket_status DEFAULT 'open',

  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ,

  -- Resolution
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Related entity
  related_entity_type VARCHAR(50),
  related_entity_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE support_tickets IS 'Customer support tickets';

-- ----------------------------------------------------------------------------
-- Support Messages Table
-- ----------------------------------------------------------------------------
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,

  -- Message details
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,

  -- Attachments
  attachments TEXT[] DEFAULT '{}'::text[],

  -- Internal note (not visible to customer)
  is_internal BOOLEAN DEFAULT false,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE support_messages IS 'Messages within support tickets';

-- ----------------------------------------------------------------------------
-- Contact Requests Table (for non-authenticated inquiries)
-- ----------------------------------------------------------------------------
CREATE TABLE contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact details
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Status
  status contact_request_status DEFAULT 'new',

  -- Assignment
  assigned_to UUID REFERENCES users(id),
  response_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE contact_requests IS 'Contact form submissions from website';

-- ============================================================================
-- SECTION 14: USER ENGAGEMENT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- User Favorites Table
-- ----------------------------------------------------------------------------
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Favorited item
  item_type VARCHAR(50) NOT NULL,  -- 'product', 'shop', 'offer'
  item_id UUID NOT NULL,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, item_type, item_id)
);

COMMENT ON TABLE user_favorites IS 'User saved/favorited items';

-- ----------------------------------------------------------------------------
-- User Searches Table
-- ----------------------------------------------------------------------------
CREATE TABLE user_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID,

  -- Search details
  search_query TEXT NOT NULL,
  search_type VARCHAR(50),  -- 'products', 'shops', 'all'
  filters JSONB DEFAULT '{}'::jsonb,

  -- Results
  results_count INTEGER DEFAULT 0,
  clicked_result_id UUID,
  clicked_result_position INTEGER,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE user_searches IS 'Tracks user search queries for analytics and improvement';

-- ============================================================================
-- SECTION 15: REFERRAL SYSTEM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Referral Codes Table
-- ----------------------------------------------------------------------------
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Code details
  code VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Type
  code_type VARCHAR(50) DEFAULT 'user_referral',  -- 'user_referral', 'campaign', 'promo'

  -- Benefits
  referrer_benefit JSONB DEFAULT '{}'::jsonb,  -- What referrer gets
  referee_benefit JSONB DEFAULT '{}'::jsonb,   -- What new user gets

  -- Limits
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE referral_codes IS 'Referral codes for user acquisition';

-- ----------------------------------------------------------------------------
-- Referral Transactions Table
-- ----------------------------------------------------------------------------
CREATE TABLE referral_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parties
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id),

  -- Benefits given
  referrer_reward JSONB DEFAULT '{}'::jsonb,
  referee_reward JSONB DEFAULT '{}'::jsonb,

  -- Status
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'completed', 'cancelled'

  -- Completion conditions
  completed_at TIMESTAMPTZ,
  completion_condition VARCHAR(100),  -- 'first_order', 'registration', etc.

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE referral_transactions IS 'Tracks referral rewards and completion';

-- ============================================================================
-- SECTION 16: ADMIN AND AUDIT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Audit Logs Table
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Action
  action VARCHAR(100) NOT NULL,  -- 'create', 'update', 'delete', 'approve', 'reject'
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,

  -- Changes
  changes JSONB,  -- {old: {...}, new: {...}}

  -- Request details
  ip_address INET,
  user_agent TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE audit_logs IS 'Audit trail of all significant actions';

-- Create partition by month for audit_logs
-- Note: Implement partitioning strategy based on compliance requirements

-- ----------------------------------------------------------------------------
-- Wallet Transactions Table
-- ----------------------------------------------------------------------------
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction
  transaction_type VARCHAR(50) NOT NULL,  -- 'credit', 'debit', 'refund', 'bonus'
  amount NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,

  -- Related entity
  reference_type VARCHAR(50),
  reference_id UUID,

  -- Description
  description TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE wallet_transactions IS 'User wallet transaction history';

-- ----------------------------------------------------------------------------
-- Platform Settings Table
-- ----------------------------------------------------------------------------
CREATE TABLE platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50),

  -- Audit
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE platform_settings IS 'Platform-wide configuration settings';

-- ----------------------------------------------------------------------------
-- Message Templates Table
-- ----------------------------------------------------------------------------
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template details
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50),

  -- Content
  subject VARCHAR(255),
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}'::text[],

  -- Channels
  channels TEXT[] DEFAULT '{email}'::text[],  -- 'email', 'sms', 'push'

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE message_templates IS 'Reusable message templates for notifications';

-- ============================================================================
-- SECTION 17: INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);
CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Shops indexes
CREATE INDEX idx_shops_owner_id ON shops(owner_id);
CREATE INDEX idx_shops_slug ON shops(slug);
CREATE INDEX idx_shops_status ON shops(status);
CREATE INDEX idx_shops_is_active ON shops(is_active);
CREATE INDEX idx_shops_is_verified ON shops(is_verified);
CREATE INDEX idx_shops_is_featured ON shops(is_featured);
CREATE INDEX idx_shops_location ON shops USING GIST(location);
CREATE INDEX idx_shops_rating ON shops(rating DESC);
CREATE INDEX idx_shops_categories ON shops USING GIN(categories);
CREATE INDEX idx_shops_name_trgm ON shops USING GIN(name gin_trgm_ops);
CREATE INDEX idx_shops_created_at ON shops(created_at DESC);

-- Products indexes
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_slug ON products(shop_id, slug);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_is_available ON products(is_available);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
CREATE INDEX idx_products_search_terms_trgm ON products USING GIN(search_terms gin_trgm_ops);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- Inquiries indexes
CREATE INDEX idx_inquiries_customer_id ON inquiries(customer_id);
CREATE INDEX idx_inquiries_shop_id ON inquiries(shop_id);
CREATE INDEX idx_inquiries_product_id ON inquiries(product_id);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);

-- Inquiry shops indexes
CREATE INDEX idx_inquiry_shops_inquiry_id ON inquiry_shops(inquiry_id);
CREATE INDEX idx_inquiry_shops_shop_id ON inquiry_shops(shop_id);
CREATE INDEX idx_inquiry_shops_status ON inquiry_shops(status);

-- Messages indexes
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_inquiry_id ON messages(inquiry_id);
CREATE INDEX idx_messages_shop_id ON messages(shop_id);
CREATE INDEX idx_messages_is_read ON messages(recipient_id, is_read);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Orders indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Transactions indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_shop_id ON transactions(shop_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Payment requests indexes
CREATE INDEX idx_payment_requests_customer_id ON payment_requests(customer_id);
CREATE INDEX idx_payment_requests_shop_id ON payment_requests(shop_id);
CREATE INDEX idx_payment_requests_inquiry_id ON payment_requests(inquiry_id);
CREATE INDEX idx_payment_requests_order_id ON payment_requests(order_id);
CREATE INDEX idx_payment_requests_status ON payment_requests(status);
CREATE INDEX idx_payment_requests_created_at ON payment_requests(created_at DESC);

-- Payment verification evidence indexes
CREATE INDEX idx_payment_verification_evidence_payment_id ON payment_verification_evidence(payment_request_id);
CREATE INDEX idx_payment_verification_evidence_type ON payment_verification_evidence(evidence_type);

-- Payment disputes indexes
CREATE INDEX idx_payment_disputes_payment_id ON payment_disputes(payment_request_id);
CREATE INDEX idx_payment_disputes_raised_by ON payment_disputes(raised_by);
CREATE INDEX idx_payment_disputes_status ON payment_disputes(status);

-- Offers indexes
CREATE INDEX idx_offers_shop_id ON offers(shop_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_is_featured ON offers(is_featured);
CREATE INDEX idx_offers_valid_from ON offers(valid_from);
CREATE INDEX idx_offers_valid_until ON offers(valid_until);
CREATE INDEX idx_offers_created_at ON offers(created_at DESC);

-- Reviews indexes
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_shop_id ON reviews(shop_id);
CREATE INDEX idx_reviews_order_id ON reviews(order_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Shop reviews indexes
CREATE INDEX idx_shop_reviews_user_id ON shop_reviews(user_id);
CREATE INDEX idx_shop_reviews_shop_id ON shop_reviews(shop_id);
CREATE INDEX idx_shop_reviews_order_id ON shop_reviews(order_id);
CREATE INDEX idx_shop_reviews_status ON shop_reviews(status);
CREATE INDEX idx_shop_reviews_rating ON shop_reviews(overall_rating);
CREATE INDEX idx_shop_reviews_created_at ON shop_reviews(created_at DESC);

-- Featured items indexes
CREATE INDEX idx_featured_items_shop_id ON featured_items(shop_id);
CREATE INDEX idx_featured_items_item_type_id ON featured_items(item_type, item_id);
CREATE INDEX idx_featured_items_is_active ON featured_items(is_active);
CREATE INDEX idx_featured_items_dates ON featured_items(start_date, end_date);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Analytics events indexes
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- View analytics indexes
CREATE INDEX idx_viewanalytics_entity ON viewanalytics(entity_type, entity_id);
CREATE INDEX idx_viewanalytics_user_id ON viewanalytics(user_id);
CREATE INDEX idx_viewanalytics_session_id ON viewanalytics(session_id);
CREATE INDEX idx_viewanalytics_created_at ON viewanalytics(created_at DESC);

-- Entity view counts indexes
CREATE INDEX idx_entityviewcounts_entity ON entityviewcounts(entity_type, entity_id);
CREATE INDEX idx_entityviewcounts_period ON entityviewcounts(period_start, period_end);

-- Activity feed indexes
CREATE INDEX idx_activity_feed_type ON activity_feed(type);
CREATE INDEX idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX idx_activity_feed_shop_id ON activity_feed(shop_id);
CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at DESC);

-- Support tickets indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- User favorites indexes
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_item ON user_favorites(item_type, item_id);

-- Referral codes indexes
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_is_active ON referral_codes(is_active);

-- Referral transactions indexes
CREATE INDEX idx_referral_transactions_referrer_id ON referral_transactions(referrer_id);
CREATE INDEX idx_referral_transactions_referee_id ON referral_transactions(referee_id);
CREATE INDEX idx_referral_transactions_status ON referral_transactions(status);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Credit transactions indexes
CREATE INDEX idx_credit_transactions_shop_id ON credit_transactions(shop_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_reference ON credit_transactions(reference_type, reference_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- ============================================================================
-- SECTION 18: FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger function: Update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates updated_at column on row update';

-- ----------------------------------------------------------------------------
-- Helper function: Check if user is admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(user_uuid, auth.uid());

  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = check_user_id
    AND role IN ('admin', 'super_admin')
    AND status = 'active'
  );
END;
$$;

COMMENT ON FUNCTION is_admin(UUID) IS 'Checks if a user has admin or super_admin role';

-- ----------------------------------------------------------------------------
-- Helper function: Check if user is shop owner
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_shop_owner(shop_uuid UUID, user_uuid UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(user_uuid, auth.uid());

  RETURN EXISTS (
    SELECT 1 FROM shops
    WHERE id = shop_uuid
    AND owner_id = check_user_id
  );
END;
$$;

COMMENT ON FUNCTION is_shop_owner(UUID, UUID) IS 'Checks if a user owns a specific shop';

-- ----------------------------------------------------------------------------
-- Function: Get nearby shops
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_nearby_shops(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10.0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  categories TEXT[],
  address TEXT,
  phone_number VARCHAR,
  logo_url TEXT,
  cover_image_url TEXT,
  rating NUMERIC,
  total_reviews INTEGER,
  is_verified BOOLEAN,
  is_featured BOOLEAN,
  subscription_tier subscription_tier,
  distance_km DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  owner_id UUID,
  slug VARCHAR,
  description TEXT,
  email VARCHAR,
  gallery_images TEXT[],
  business_hours JSONB,
  is_active BOOLEAN,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.categories,
    s.address,
    s.phone_number,
    s.logo_url,
    s.cover_image_url,
    s.rating,
    s.total_reviews,
    s.is_verified,
    s.is_featured,
    s.subscription_tier,
    CASE
      WHEN s.location IS NOT NULL THEN
        ST_Distance(
          s.location::geography,
          ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000.0  -- Convert meters to kilometers
      ELSE 999.0
    END as distance_km,
    CASE
      WHEN s.location IS NOT NULL THEN ST_Y(s.location::geometry)
      ELSE NULL
    END as latitude,
    CASE
      WHEN s.location IS NOT NULL THEN ST_X(s.location::geometry)
      ELSE NULL
    END as longitude,
    s.owner_id,
    s.slug,
    s.description,
    s.email,
    s.gallery_images,
    s.business_hours,
    s.is_active,
    s.subscription_expires_at,
    s.created_at,
    s.updated_at
  FROM shops s
  WHERE
    s.is_active = true
    AND s.is_verified = true
    AND (
      s.location IS NULL OR
      ST_DWithin(
        s.location::geography,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_km * 1000.0  -- Convert km to meters
      )
    )
  ORDER BY
    s.is_featured DESC,
    distance_km ASC,
    s.rating DESC;
END;
$$;

COMMENT ON FUNCTION get_nearby_shops(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) IS 'Returns shops within specified radius of a location, sorted by distance and rating';

-- ----------------------------------------------------------------------------
-- Function: Get featured shops
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_featured_shops(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  logo_url TEXT,
  rating NUMERIC,
  total_reviews INTEGER,
  categories TEXT[],
  is_verified BOOLEAN,
  subscription_tier subscription_tier
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.slug,
    s.logo_url,
    s.rating,
    s.total_reviews,
    s.categories,
    s.is_verified,
    s.subscription_tier
  FROM shops s
  INNER JOIN featured_items fi ON fi.item_id = s.id AND fi.item_type = 'shop'
  WHERE
    s.is_active = true
    AND s.is_verified = true
    AND fi.is_active = true
    AND fi.start_date <= now()
    AND fi.end_date >= now()
  ORDER BY fi.position ASC, s.rating DESC
  LIMIT limit_count;
END;
$$;

COMMENT ON FUNCTION get_featured_shops(INTEGER) IS 'Returns currently featured shops';

-- ----------------------------------------------------------------------------
-- Function: Increment view count
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_view_count(
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert view analytics record
  INSERT INTO viewanalytics (
    entity_type,
    entity_id,
    user_id,
    session_id
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_user_id,
    p_session_id
  );

  -- Update view count on the entity
  CASE p_entity_type
    WHEN 'product' THEN
      UPDATE products SET view_count = view_count + 1 WHERE id = p_entity_id;
    WHEN 'offer' THEN
      UPDATE offers SET view_count = view_count + 1 WHERE id = p_entity_id;
    WHEN 'shop' THEN
      -- Shop view counts are calculated separately
      NULL;
    ELSE
      NULL;
  END CASE;
END;
$$;

COMMENT ON FUNCTION increment_view_count(VARCHAR, UUID, UUID, UUID) IS 'Records a view and increments view count for an entity';

-- ----------------------------------------------------------------------------
-- Function: Get user daily payment usage
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_daily_payment_usage(
  user_uuid UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_amount NUMERIC,
  transaction_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0) as total_amount,
    COUNT(*) as transaction_count
  FROM payment_requests
  WHERE customer_id = user_uuid
    AND DATE(created_at) = target_date
    AND status IN ('customer_claimed_success', 'shop_confirmed', 'verified');
END;
$$;

COMMENT ON FUNCTION get_daily_payment_usage(UUID, DATE) IS 'Returns daily payment usage for a user';

-- ----------------------------------------------------------------------------
-- Function: Get user account age in hours
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_account_age_hours(user_uuid UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  age_hours NUMERIC;
BEGIN
  SELECT EXTRACT(EPOCH FROM (now() - created_at)) / 3600 INTO age_hours
  FROM users
  WHERE id = user_uuid;

  RETURN COALESCE(age_hours, 0);
END;
$$;

COMMENT ON FUNCTION get_user_account_age_hours(UUID) IS 'Returns user account age in hours';

-- ----------------------------------------------------------------------------
-- Function: Calculate shop review stats
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_shop_review_stats(shop_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_reviews INTEGER;
  v_average_rating NUMERIC;
  v_rating_5 INTEGER;
  v_rating_4 INTEGER;
  v_rating_3 INTEGER;
  v_rating_2 INTEGER;
  v_rating_1 INTEGER;
  v_avg_product_quality NUMERIC;
  v_avg_service NUMERIC;
  v_avg_communication NUMERIC;
  v_avg_delivery NUMERIC;
BEGIN
  -- Calculate stats
  SELECT
    COUNT(*),
    COALESCE(AVG(overall_rating), 0),
    COUNT(*) FILTER (WHERE overall_rating = 5),
    COUNT(*) FILTER (WHERE overall_rating = 4),
    COUNT(*) FILTER (WHERE overall_rating = 3),
    COUNT(*) FILTER (WHERE overall_rating = 2),
    COUNT(*) FILTER (WHERE overall_rating = 1),
    COALESCE(AVG(product_quality_rating), 0),
    COALESCE(AVG(service_rating), 0),
    COALESCE(AVG(communication_rating), 0),
    COALESCE(AVG(delivery_rating), 0)
  INTO
    v_total_reviews,
    v_average_rating,
    v_rating_5,
    v_rating_4,
    v_rating_3,
    v_rating_2,
    v_rating_1,
    v_avg_product_quality,
    v_avg_service,
    v_avg_communication,
    v_avg_delivery
  FROM shop_reviews
  WHERE shop_id = shop_uuid AND status = 'approved';

  -- Upsert stats
  INSERT INTO shop_review_stats (
    shop_id,
    total_reviews,
    average_rating,
    rating_5_count,
    rating_4_count,
    rating_3_count,
    rating_2_count,
    rating_1_count,
    avg_product_quality,
    avg_service,
    avg_communication,
    avg_delivery,
    last_calculated_at
  ) VALUES (
    shop_uuid,
    v_total_reviews,
    v_average_rating,
    v_rating_5,
    v_rating_4,
    v_rating_3,
    v_rating_2,
    v_rating_1,
    v_avg_product_quality,
    v_avg_service,
    v_avg_communication,
    v_avg_delivery,
    now()
  )
  ON CONFLICT (shop_id) DO UPDATE SET
    total_reviews = v_total_reviews,
    average_rating = v_average_rating,
    rating_5_count = v_rating_5,
    rating_4_count = v_rating_4,
    rating_3_count = v_rating_3,
    rating_2_count = v_rating_2,
    rating_1_count = v_rating_1,
    avg_product_quality = v_avg_product_quality,
    avg_service = v_avg_service,
    avg_communication = v_avg_communication,
    avg_delivery = v_avg_delivery,
    last_calculated_at = now(),
    updated_at = now();

  -- Update shop rating
  UPDATE shops
  SET
    rating = v_average_rating,
    total_reviews = v_total_reviews
  WHERE id = shop_uuid;
END;
$$;

COMMENT ON FUNCTION calculate_shop_review_stats(UUID) IS 'Calculates and updates shop review statistics';

-- ----------------------------------------------------------------------------
-- Function: Handle new shop owner registration
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_shop_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create shop if user is a shop_owner
  IF NEW.role = 'shop_owner' THEN
    INSERT INTO shops (
      owner_id,
      name,
      slug,
      address,
      email,
      phone_number,
      is_active,
      is_verified,
      subscription_tier,
      status
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.full_name, 'My Shop'),
      LOWER(REPLACE(COALESCE(NEW.full_name, 'shop'), ' ', '-')) || '-' || substr(NEW.id::text, 1, 8),
      NEW.address,
      NEW.email,
      NEW.phone_number,
      true,
      false,
      'free',
      'pending'
    );

    -- Initialize shop credits
    INSERT INTO shop_credits (shop_id)
    VALUES ((SELECT id FROM shops WHERE owner_id = NEW.id));
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_shop_owner() IS 'Automatically creates shop and credits when shop_owner user is created';

-- ============================================================================
-- SECTION 19: TRIGGERS
-- ============================================================================

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_profiles_updated_at BEFORE UPDATE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_payment_preferences_updated_at BEFORE UPDATE ON customer_payment_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_credits_updated_at BEFORE UPDATE ON shop_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_plans_updated_at BEFORE UPDATE ON credit_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_costs_updated_at BEFORE UPDATE ON credit_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_verification_documents_updated_at BEFORE UPDATE ON shop_verification_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_subscriptions_updated_at BEFORE UPDATE ON shop_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiry_shops_updated_at BEFORE UPDATE ON inquiry_shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiry_responses_updated_at BEFORE UPDATE ON inquiry_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_requests_updated_at BEFORE UPDATE ON payment_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_follow_ups_updated_at BEFORE UPDATE ON payment_follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_disputes_updated_at BEFORE UPDATE ON payment_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_reviews_updated_at BEFORE UPDATE ON shop_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_review_stats_updated_at BEFORE UPDATE ON shop_review_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_featured_items_updated_at BEFORE UPDATE ON featured_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_requests_updated_at BEFORE UPDATE ON contact_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_codes_updated_at BEFORE UPDATE ON referral_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entityviewcounts_updated_at BEFORE UPDATE ON entityviewcounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for automatic shop creation
DROP TRIGGER IF EXISTS on_shop_owner_created ON users;
CREATE TRIGGER on_shop_owner_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_shop_owner();

-- Trigger to update shop review stats when review is approved
CREATE OR REPLACE FUNCTION trigger_update_shop_review_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR
     (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') OR
     (TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status != 'approved') OR
     (TG_OP = 'DELETE' AND OLD.status = 'approved') THEN
    PERFORM calculate_shop_review_stats(COALESCE(NEW.shop_id, OLD.shop_id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_shop_review_stats_on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON shop_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_shop_review_stats();
-- Fix credit system: Upfront deduction for featured items
-- This migration corrects the feature_*_atomic functions to properly deduct from total_credits upfront

-- ============================================================================
-- Fix feature_offer_atomic function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.feature_offer_atomic(
  p_offer_id UUID,
  p_shop_id UUID,
  p_duration_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost_record RECORD;
  v_daily_cost DECIMAL(10,2);
  v_total_cost DECIMAL(10,2);
  v_current_credits RECORD;
  v_available DECIMAL(10,2);
  v_end_date TIMESTAMPTZ;
  v_featured_item_id UUID;
  v_shop_owner_id UUID;
BEGIN
  -- Get daily cost for featured offers
  SELECT cost_per_action, daily_cost, duration_days
  INTO v_cost_record
  FROM credit_costs
  WHERE action_type = 'feature_offer' AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit cost configuration not found for feature_offer';
  END IF;

  v_daily_cost := COALESCE(v_cost_record.daily_cost, 0);
  
  IF v_daily_cost <= 0 THEN
    RAISE EXCEPTION 'Invalid daily cost configuration';
  END IF;

  v_total_cost := v_daily_cost * p_duration_days;
  v_end_date := NOW() + (p_duration_days || ' days')::INTERVAL;

  -- Get current shop credits with row lock
  SELECT total_credits, reserved_credits
  INTO v_current_credits
  FROM shop_credits
  WHERE shop_id = p_shop_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop credits not found';
  END IF;

  -- Calculate available credits (just total_credits since upfront deduction)
  v_available := COALESCE(v_current_credits.total_credits, 0);

  IF v_available < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', v_total_cost, v_available;
  END IF;

  -- Get shop owner for transaction record
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = p_shop_id;

  -- CRITICAL FIX: Deduct from total_credits AND add to reserved_credits
  UPDATE shop_credits
  SET total_credits = total_credits - v_total_cost,
      reserved_credits = reserved_credits + v_total_cost,
      updated_at = NOW()
  WHERE shop_id = p_shop_id;

  -- Create transaction record with correct balance
  INSERT INTO credit_transactions (
    shop_id, transaction_type, amount, balance_after, 
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_shop_id, 'reservation', -v_total_cost,
    v_current_credits.total_credits - v_total_cost,
    'offer', p_offer_id,
    'Upfront deduction for featuring (' || p_duration_days || ' days @ ' || v_daily_cost || '/day)',
    v_shop_owner_id
  );

  -- Create featured_items record
  INSERT INTO featured_items (
  shop_id, entity_id, entity_type, featured_until,
  total_credits_allocated, daily_cost, credits_consumed, credits_used,
  status, version
  ) VALUES (
  p_shop_id, p_shop_id, 'shop', v_end_date,
  v_total_cost, v_daily_cost, 0, 0, 'active', 1
  )
  RETURNING id INTO v_featured_item_id;

  -- Update the offer to mark it as featured
  UPDATE offers
  SET is_featured = true, updated_at = NOW()
  WHERE id = p_offer_id;

  RETURN jsonb_build_object(
    'success', true,
    'credits_deducted', v_total_cost,
    'featured_until', v_end_date,
    'new_balance', v_current_credits.total_credits - v_total_cost,
    'featured_item_id', v_featured_item_id
  );
END;
$$;

-- ============================================================================
-- Fix feature_product_atomic function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.feature_product_atomic(
  p_product_id UUID,
  p_shop_id UUID,
  p_duration_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost_record RECORD;
  v_daily_cost DECIMAL(10,2);
  v_total_cost DECIMAL(10,2);
  v_current_credits RECORD;
  v_available DECIMAL(10,2);
  v_end_date TIMESTAMPTZ;
  v_featured_item_id UUID;
  v_shop_owner_id UUID;
BEGIN
  -- Get daily cost for featured products
  SELECT cost_per_action, daily_cost, duration_days
  INTO v_cost_record
  FROM credit_costs
  WHERE action_type = 'feature_product' AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit cost configuration not found for feature_product';
  END IF;

  v_daily_cost := COALESCE(v_cost_record.daily_cost, 0);
  
  IF v_daily_cost <= 0 THEN
    RAISE EXCEPTION 'Invalid daily cost configuration';
  END IF;

  v_total_cost := v_daily_cost * p_duration_days;
  v_end_date := NOW() + (p_duration_days || ' days')::INTERVAL;

  -- Get current shop credits with row lock
  SELECT total_credits, reserved_credits
  INTO v_current_credits
  FROM shop_credits
  WHERE shop_id = p_shop_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop credits not found';
  END IF;

  -- Calculate available credits (just total_credits since upfront deduction)
  v_available := COALESCE(v_current_credits.total_credits, 0);

  IF v_available < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', v_total_cost, v_available;
  END IF;

  -- Get shop owner for transaction record
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = p_shop_id;

  -- CRITICAL FIX: Deduct from total_credits AND add to reserved_credits
  UPDATE shop_credits
  SET total_credits = total_credits - v_total_cost,
      reserved_credits = reserved_credits + v_total_cost,
      updated_at = NOW()
  WHERE shop_id = p_shop_id;

  -- Create transaction record with correct balance
  INSERT INTO credit_transactions (
    shop_id, transaction_type, amount, balance_after, 
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_shop_id, 'reservation', -v_total_cost,
    v_current_credits.total_credits - v_total_cost,
    'product', p_product_id,
    'Upfront deduction for featuring (' || p_duration_days || ' days @ ' || v_daily_cost || '/day)',
    v_shop_owner_id
  );

  -- Create featured_items record
  INSERT INTO featured_items (
  shop_id, entity_id, entity_type, featured_until,
  total_credits_allocated, daily_cost, credits_consumed, credits_used,
  status, version
  ) VALUES (
  p_shop_id, p_shop_id, 'shop', v_end_date,
  v_total_cost, v_daily_cost, 0, 0, 'active', 1
  )
  RETURNING id INTO v_featured_item_id;

  -- Update the product to mark it as featured
  UPDATE products
  SET is_featured = true, updated_at = NOW()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'success', true,
    'credits_deducted', v_total_cost,
    'featured_until', v_end_date,
    'new_balance', v_current_credits.total_credits - v_total_cost,
    'featured_item_id', v_featured_item_id
  );
END;
$$;

-- ============================================================================
-- Fix feature_shop_atomic function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.feature_shop_atomic(
  p_shop_id UUID,
  p_duration_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost_record RECORD;
  v_daily_cost DECIMAL(10,2);
  v_total_cost DECIMAL(10,2);
  v_current_credits RECORD;
  v_available DECIMAL(10,2);
  v_end_date TIMESTAMPTZ;
  v_featured_item_id UUID;
  v_shop_owner_id UUID;
BEGIN
  -- Get daily cost for featured shops
  SELECT cost_per_action, daily_cost, duration_days
  INTO v_cost_record
  FROM credit_costs
  WHERE action_type = 'feature_shop' AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit cost configuration not found for feature_shop';
  END IF;

  v_daily_cost := COALESCE(v_cost_record.daily_cost, 0);
  
  IF v_daily_cost <= 0 THEN
    RAISE EXCEPTION 'Invalid daily cost configuration';
  END IF;

  v_total_cost := v_daily_cost * p_duration_days;
  v_end_date := NOW() + (p_duration_days || ' days')::INTERVAL;

  -- Get current shop credits with row lock
  SELECT total_credits, reserved_credits
  INTO v_current_credits
  FROM shop_credits
  WHERE shop_id = p_shop_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop credits not found';
  END IF;

  -- Calculate available credits (just total_credits since upfront deduction)
  v_available := COALESCE(v_current_credits.total_credits, 0);

  IF v_available < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', v_total_cost, v_available;
  END IF;

  -- Get shop owner for transaction record
  SELECT owner_id INTO v_shop_owner_id FROM shops WHERE id = p_shop_id;

  -- CRITICAL FIX: Deduct from total_credits AND add to reserved_credits
  UPDATE shop_credits
  SET total_credits = total_credits - v_total_cost,
      reserved_credits = reserved_credits + v_total_cost,
      updated_at = NOW()
  WHERE shop_id = p_shop_id;

  -- Create transaction record with correct balance
  INSERT INTO credit_transactions (
    shop_id, transaction_type, amount, balance_after, 
    reference_type, reference_id, description, created_by
  ) VALUES (
    p_shop_id, 'reservation', -v_total_cost,
    v_current_credits.total_credits - v_total_cost,
    'shop', p_shop_id,
    'Upfront deduction for featuring (' || p_duration_days || ' days @ ' || v_daily_cost || '/day)',
    v_shop_owner_id
  );

  -- Create featured_items record
  INSERT INTO featured_items (
  shop_id, entity_id, entity_type, featured_until,
  total_credits_allocated, daily_cost, credits_consumed, credits_used,
  status, version
  ) VALUES (
  p_shop_id, p_shop_id, 'shop', v_end_date,
  v_total_cost, v_daily_cost, 0, 0, 'active', 1
  )
  RETURNING id INTO v_featured_item_id;

  -- Update the shop to mark it as featured
  UPDATE shops
  SET is_featured = true, updated_at = NOW()
  WHERE id = p_shop_id;

  RETURN jsonb_build_object(
    'success', true,
    'credits_deducted', v_total_cost,
    'featured_until', v_end_date,
    'new_balance', v_current_credits.total_credits - v_total_cost,
    'featured_item_id', v_featured_item_id
  );
END;
$$;
-- ============================================================================
-- SECTION 20: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payment_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_verification_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_review_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_item_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewanalytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE entityviewcounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Users table policies
-- ----------------------------------------------------------------------------

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Admins have full access
CREATE POLICY "Admins have full access to users"
  ON users FOR ALL
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Customer profiles policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view own customer profile"
  ON customer_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own customer profile"
  ON customer_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customer profile"
  ON customer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Shops table policies
-- ----------------------------------------------------------------------------

-- Everyone can view active shops
CREATE POLICY "Anyone can view active shops"
  ON shops FOR SELECT
  USING (is_active = true OR is_admin() OR auth.uid() = owner_id);

-- Shop owners can update their shops
CREATE POLICY "Shop owners can update their shops"
  ON shops FOR UPDATE
  USING (auth.uid() = owner_id);

-- Shop owners can insert shops
CREATE POLICY "Shop owners can create shops"
  ON shops FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Admins have full access
CREATE POLICY "Admins have full access to shops"
  ON shops FOR ALL
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Products table policies
-- ----------------------------------------------------------------------------

-- Everyone can view available products
CREATE POLICY "Anyone can view available products"
  ON products FOR SELECT
  USING (
    is_available = true
    OR is_admin()
    OR EXISTS (SELECT 1 FROM shops WHERE shops.id = products.shop_id AND shops.owner_id = auth.uid())
  );

-- Shop owners can manage their products
CREATE POLICY "Shop owners can manage their products"
  ON products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = products.shop_id AND shops.owner_id = auth.uid())
  );

-- Admins have full access
CREATE POLICY "Admins have full access to products"
  ON products FOR ALL
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Inquiries table policies
-- ----------------------------------------------------------------------------

-- Customers can view their own inquiries
CREATE POLICY "Customers can view own inquiries"
  ON inquiries FOR SELECT
  USING (
    auth.uid() = customer_id
    OR is_admin()
    OR EXISTS (SELECT 1 FROM shops WHERE shops.id = inquiries.shop_id AND shops.owner_id = auth.uid())
  );

-- Customers can create inquiries
CREATE POLICY "Customers can create inquiries"
  ON inquiries FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Customers can update their own inquiries
CREATE POLICY "Customers can update own inquiries"
  ON inquiries FOR UPDATE
  USING (auth.uid() = customer_id);

-- Shop owners can view inquiries sent to them
CREATE POLICY "Shop owners can view their inquiries"
  ON inquiries FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = inquiries.shop_id AND shops.owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Inquiry shops policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view relevant inquiry shops"
  ON inquiry_shops FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM inquiries WHERE inquiries.id = inquiry_shops.inquiry_id AND inquiries.customer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM shops WHERE shops.id = inquiry_shops.shop_id AND shops.owner_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Shop owners can update their inquiry shops"
  ON inquiry_shops FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = inquiry_shops.shop_id AND shops.owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Messages table policies
-- ----------------------------------------------------------------------------

-- Users can view messages they're part of
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR is_admin());

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they sent
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- ----------------------------------------------------------------------------
-- Orders table policies
-- ----------------------------------------------------------------------------

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM shops WHERE shops.id = orders.shop_id AND shops.owner_id = auth.uid())
    OR is_admin()
  );

-- Customers can create orders
CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Shop owners can update their orders
CREATE POLICY "Shop owners can update their orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = orders.shop_id AND shops.owner_id = auth.uid())
  );

-- Admins have full access
CREATE POLICY "Admins have full access to orders"
  ON orders FOR ALL
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Order items policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view relevant order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM shops WHERE shops.id = orders.shop_id AND shops.owner_id = auth.uid())
        OR is_admin()
      )
    )
  );

-- ----------------------------------------------------------------------------
-- Payment requests policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view relevant payment requests"
  ON payment_requests FOR SELECT
  USING (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM shops WHERE shops.id = payment_requests.shop_id AND shops.owner_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Customers can create payment requests"
  ON payment_requests FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update relevant payment requests"
  ON payment_requests FOR UPDATE
  USING (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM shops WHERE shops.id = payment_requests.shop_id AND shops.owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Reviews policies
-- ----------------------------------------------------------------------------

-- Everyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR is_admin());

-- Users can create reviews
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Shop owners can respond to reviews
CREATE POLICY "Shop owners can respond to reviews"
  ON reviews FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = reviews.shop_id AND shops.owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Shop reviews policies (similar to reviews)
-- ----------------------------------------------------------------------------

CREATE POLICY "Anyone can view approved shop reviews"
  ON shop_reviews FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create shop reviews"
  ON shop_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shop reviews"
  ON shop_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Shop owners can respond to shop reviews"
  ON shop_reviews FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_reviews.shop_id AND shops.owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Offers policies
-- ----------------------------------------------------------------------------

-- Everyone can view active offers
CREATE POLICY "Anyone can view active offers"
  ON offers FOR SELECT
  USING (
    (status = 'active' AND valid_from <= now() AND valid_until >= now())
    OR is_admin()
    OR EXISTS (SELECT 1 FROM shops WHERE shops.id = offers.shop_id AND shops.owner_id = auth.uid())
  );

-- Shop owners can manage their offers
CREATE POLICY "Shop owners can manage their offers"
  ON offers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = offers.shop_id AND shops.owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Notifications policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- View analytics policies
-- ----------------------------------------------------------------------------

-- Allow anonymous and authenticated users to insert view analytics
CREATE POLICY "Anyone can record views"
  ON viewanalytics FOR INSERT
  WITH CHECK (true);

-- Users can view analytics for their own shops/products
CREATE POLICY "Shop owners can view their analytics"
  ON viewanalytics FOR SELECT
  USING (
    is_admin()
    OR (entity_type = 'shop' AND EXISTS (SELECT 1 FROM shops WHERE shops.id = viewanalytics.entity_id AND shops.owner_id = auth.uid()))
    OR (entity_type = 'product' AND EXISTS (SELECT 1 FROM products JOIN shops ON shops.id = products.shop_id WHERE products.id = viewanalytics.entity_id AND shops.owner_id = auth.uid()))
  );

-- ----------------------------------------------------------------------------
-- Entity view counts policies
-- ----------------------------------------------------------------------------

-- Everyone can view entity view counts
CREATE POLICY "Anyone can view entity view counts"
  ON entityviewcounts FOR SELECT
  USING (true);

-- Only system can insert/update
CREATE POLICY "System can manage entity view counts"
  ON entityviewcounts FOR ALL
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Featured items policies
-- ----------------------------------------------------------------------------

-- Everyone can view active featured items
CREATE POLICY "Anyone can view active featured items"
  ON featured_items FOR SELECT
  USING (true);

-- Shop owners can manage their featured items
CREATE POLICY "Shop owners can manage their featured items"
  ON featured_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = featured_items.shop_id AND shops.owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Credit system policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Shop owners can view their credits"
  ON shop_credits FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_credits.shop_id AND shops.owner_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Shop owners can view their credit transactions"
  ON credit_transactions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = credit_transactions.shop_id AND shops.owner_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Shop owners can view their credit batches"
  ON credit_batches FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = credit_batches.shop_id AND shops.owner_id = auth.uid())
    OR is_admin()
  );

-- Everyone can view credit plans
CREATE POLICY "Anyone can view credit plans"
  ON credit_plans FOR SELECT
  USING (is_active = true OR is_admin());

-- Everyone can view credit costs
CREATE POLICY "Anyone can view credit costs"
  ON credit_costs FOR SELECT
  USING (is_active = true OR is_admin());

-- ----------------------------------------------------------------------------
-- Support tickets policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view own support tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create support tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own support tickets"
  ON support_tickets FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can view own support messages"
  ON support_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Users can create support messages"
  ON support_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- ----------------------------------------------------------------------------
-- User favorites policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can manage own favorites"
  ON user_favorites FOR ALL
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Activity feed policies
-- ----------------------------------------------------------------------------

-- Everyone can view public activity
CREATE POLICY "Anyone can view public activity"
  ON activity_feed FOR SELECT
  USING (is_public = true OR is_admin());

-- ----------------------------------------------------------------------------
-- Referral system policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view own referral code"
  ON referral_codes FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can view referral transactions"
  ON referral_transactions FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id OR is_admin());

-- ----------------------------------------------------------------------------
-- Audit logs policies
-- ----------------------------------------------------------------------------

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Platform settings and message templates policies
-- ----------------------------------------------------------------------------

-- Only admins can manage platform settings
CREATE POLICY "Admins can manage platform settings"
  ON platform_settings FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can manage message templates"
  ON message_templates FOR ALL
  USING (is_admin());

-- Shop owners can view message templates
CREATE POLICY "Users can view message templates"
  ON message_templates FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- SECTION 21: STORAGE BUCKETS AND POLICIES
-- ============================================================================

-- Note: Storage buckets are typically created via Supabase dashboard or CLI
-- Here we document the required buckets and provide policy SQL

-- Required storage buckets:
-- 1. shop-assets (for logos, covers, QR codes)
-- 2. products (for product images)
-- 3. avatars (for user profile pictures)
-- 4. payment-evidence (for payment screenshots)
-- 5. documents (for verification documents)

-- Insert storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('shop-assets', 'shop-assets', true),
  ('products', 'products', true),
  ('avatars', 'avatars', true),
  ('payment-evidence', 'payment-evidence', false),
  ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for shop-assets bucket
CREATE POLICY "Shop owners can upload to shop-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'shop-assets'
    AND (storage.foldername(storage.objects.name))[1] IN ('logos', 'covers', 'qr-codes', 'gallery')
    AND EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id::text = split_part((storage.foldername(storage.objects.name))[2], '_', 1)
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can update shop-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'shop-assets'
    AND EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id::text = split_part((storage.foldername(storage.objects.name))[2], '_', 1)
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can delete shop-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'shop-assets'
    AND EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id::text = split_part((storage.foldername(storage.objects.name))[2], '_', 1)
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view shop-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-assets');

-- Storage policies for products bucket
CREATE POLICY "Shop owners can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'products'
    AND EXISTS (
      SELECT 1 FROM products
      JOIN shops ON shops.id = products.shop_id
      WHERE products.id::text = split_part((storage.foldername(storage.objects.name))[1], '_', 1)
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

-- Storage policies for avatars bucket
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Storage policies for payment-evidence bucket (private)
CREATE POLICY "Users can upload payment evidence"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-evidence'
    AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view relevant payment evidence"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-evidence'
    AND (
      (storage.foldername(storage.objects.name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

-- ============================================================================
-- SECTION 22: SEED DATA
-- ============================================================================

-- Platform settings
INSERT INTO platform_settings (key, value, description, category) VALUES
  ('commission_rate', '{"default": 15, "min": 10, "max": 30}'::jsonb, 'Platform commission rates', 'financial'),
  ('payout_schedule', '{"frequency": "weekly", "minimum": 100}'::jsonb, 'Payout configuration', 'financial'),
  ('payment_limits', '{"daily_limit": 10000, "per_transaction_min": 50, "per_transaction_max": 100000, "new_user_limit": 5000}'::jsonb, 'Payment transaction limits', 'financial'),
  ('verification_requirements', '{"documents": ["business_license", "tax_id", "identity"]}'::jsonb, 'Shop verification requirements', 'shops'),
  ('content_moderation', '{"auto_approve": false, "review_required": true}'::jsonb, 'Content moderation settings', 'content'),
  ('email_notifications', '{"enabled": true, "from": "noreply@localconnect.com"}'::jsonb, 'Email notification settings', 'communication'),
  ('search_radius_km', '{"default": 10, "max": 50}'::jsonb, 'Default search radius for nearby shops', 'search'),
  ('featured_items_limit', '{"shops": 10, "products": 20, "offers": 15}'::jsonb, 'Limits for featured items', 'features')
ON CONFLICT (key) DO NOTHING;

-- Credit costs
INSERT INTO credit_costs (action_type, description, cost_per_action, daily_cost, duration_days, is_active) VALUES
  ('inquiry_response', 'Cost per inquiry response sent', 1, 0, NULL, true),
  ('featured_product', 'Daily cost for featuring a product', 0, 5, 30, true),
  ('featured_offer', 'Daily cost for featuring an offer', 0, 3, 30, true),
  ('featured_shop', 'Daily cost for featuring the shop', 0, 10, 30, true),
  ('boost_visibility', 'Daily cost for visibility boost', 0, 7, 7, true),
  ('premium_badge', 'Monthly cost for premium badge', 0, 1, 30, true)
ON CONFLICT (action_type) DO NOTHING;

-- Credit plans
INSERT INTO credit_plans (name, description, credits_amount, bonus_credits, price_inr, validity_days, features, is_active, display_order) VALUES
  ('Starter Pack', 'Perfect for small shops starting out', 100, 10, 499, 90, '["Respond to 110 inquiries", "Feature 1 product for 20 days", "Basic analytics"]'::jsonb, true, 1),
  ('Growth Pack', 'For shops looking to expand', 250, 50, 999, 180, '["Respond to 300 inquiries", "Feature 3 products for 15 days", "Advanced analytics", "Priority support"]'::jsonb, true, 2),
  ('Business Pack', 'For established businesses', 500, 150, 1799, 180, '["Respond to 650 inquiries", "Feature 5 products for 20 days", "Premium analytics", "Dedicated support"]'::jsonb, true, 3),
  ('Enterprise Pack', 'For large-scale operations', 1000, 400, 2999, 365, '["Respond to 1400 inquiries", "Feature 10 products for 30 days", "Custom analytics", "Account manager"]'::jsonb, true, 4)
ON CONFLICT (name) DO NOTHING;

-- Message templates
INSERT INTO message_templates (name, category, subject, body, variables, channels, is_active) VALUES
  ('inquiry_received', 'inquiry', 'New Inquiry Received', 'Hi {{shop_name}}, You have received a new inquiry from {{customer_name}}. Please respond promptly to increase your chances of winning the business!', ARRAY['shop_name', 'customer_name', 'inquiry_title'], ARRAY['email', 'push'], true),
  ('inquiry_response', 'inquiry', 'Shop Responded to Your Inquiry', 'Hi {{customer_name}}, {{shop_name}} has responded to your inquiry "{{inquiry_title}}". View the response now!', ARRAY['customer_name', 'shop_name', 'inquiry_title'], ARRAY['email', 'push'], true),
  ('order_confirmed', 'order', 'Order Confirmed', 'Hi {{customer_name}}, Your order #{{order_number}} has been confirmed by {{shop_name}}. Expected delivery: {{delivery_date}}.', ARRAY['customer_name', 'order_number', 'shop_name', 'delivery_date'], ARRAY['email', 'sms', 'push'], true),
  ('payment_received', 'payment', 'Payment Received', 'Hi {{shop_name}}, Payment of ₹{{amount}} has been received from {{customer_name}}.', ARRAY['shop_name', 'amount', 'customer_name'], ARRAY['email', 'push'], true),
  ('review_request', 'review', 'How was your experience?', 'Hi {{customer_name}}, We hope you enjoyed your purchase from {{shop_name}}. Please take a moment to leave a review!', ARRAY['customer_name', 'shop_name'], ARRAY['email', 'push'], true),
  ('credits_low', 'credits', 'Credit Balance Low', 'Hi {{shop_name}}, Your credit balance is running low ({{credits_remaining}} credits left). Purchase more credits to continue receiving inquiries.', ARRAY['shop_name', 'credits_remaining'], ARRAY['email', 'push'], true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SECTION 23: REALTIME CONFIGURATION
-- ============================================================================

-- Enable realtime for relevant tables
-- Note: This is typically configured via Supabase dashboard
-- Documentation: Configure Realtime for these tables:
-- - messages (for chat)
-- - notifications (for real-time notifications)
-- - inquiries (for status updates)
-- - orders (for status updates)
-- - payment_requests (for payment status)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- For anon and authenticated roles, rely on RLS policies
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- End of migration
DO $$
BEGIN
  RAISE NOTICE 'LocalConnect database migration completed successfully!';
  RAISE NOTICE 'Total tables created: 60+';
  RAISE NOTICE 'Total ENUM types: 24';
  RAISE NOTICE 'Total functions: 10+';
  RAISE NOTICE 'Total indexes: 100+';
  RAISE NOTICE 'RLS enabled on all tables with comprehensive policies';
  RAISE NOTICE 'Storage buckets and policies configured';
  RAISE NOTICE 'Seed data inserted';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Configure Realtime for messages, notifications, inquiries tables';
  RAISE NOTICE '2. Set up authentication providers in Supabase dashboard';
  RAISE NOTICE '3. Configure email templates and SMTP settings';
  RAISE NOTICE '4. Review and adjust platform_settings as needed';
  RAISE NOTICE '5. Test all RLS policies with different user roles';
END $$;
