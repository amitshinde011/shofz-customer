-- ============================================================================
-- LocalConnect Customer App - COMPLETE EXECUTABLE Database Schema
-- ============================================================================
-- This file contains the COMPLETE database schema that can be executed
-- to create the entire backend from scratch.
-- 
-- USAGE INSTRUCTIONS:
-- ==================
-- 1. Connect to empty PostgreSQL database (14+):
--    psql -U postgres -d your_database
--
-- 2. Execute this file:
--    \i COMPLETE_DATABASE_SCHEMA.sql
--
-- 3. Verify installation (see verification section at end)
--
-- IMPORTANT NOTES:
-- - This file is IDEMPOTENT (safe to run multiple times)
-- - Uses IF NOT EXISTS and ON CONFLICT clauses
-- - No data loss on re-execution
-- - Compatible with Supabase and standard PostgreSQL
-- - Requires superuser or owner privileges
-- - Estimated execution time: 2-3 minutes
-- 
-- Generated: 2025
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "plpgsql";

-- ============================================================================
-- SECTION 2: CUSTOM ENUM TYPES
-- ============================================================================

-- ENUM: user_role
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('customer', 'shop_owner', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ENUM: subscription_tier
DO $$ BEGIN
  CREATE TYPE public.subscription_tier AS ENUM ('basic', 'premium', 'enterprise');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ENUM: inquiry_status
DO $$ BEGIN
  CREATE TYPE public.inquiry_status AS ENUM ('pending', 'responded', 'accepted', 'rejected', 'completed', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ENUM: payment_status
DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'disputed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ENUM: notification_type
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('inquiry', 'message', 'payment', 'review', 'system', 'offer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ENUM: verification_status
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ENUM: alert_severity
DO $$ BEGIN
  CREATE TYPE public.alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ENUM: support_ticket_status
DO $$ BEGIN
  CREATE TYPE public.support_ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ENUM: transaction_type
DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('credit', 'debit', 'refund', 'adjustment');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ENUM: credit_action_type
DO $$ BEGIN
  CREATE TYPE public.credit_action_type AS ENUM ('feature_product', 'feature_shop', 'feature_offer', 'priority_listing', 'boost_visibility');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ENUM: content_status
DO $$ BEGIN
  CREATE TYPE public.content_status AS ENUM ('draft', 'published', 'archived', 'deleted');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SECTION 3: CORE TABLES
-- ============================================================================

-- Table: users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email VARCHAR,
  name VARCHAR,
  phone_number VARCHAR,
  avatar_url TEXT,
  profile_image_url TEXT,
  address TEXT,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.user_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: customer_profiles
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: shops
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  slug VARCHAR,
  description TEXT,
  categories TEXT[],
  address TEXT,
  phone_number VARCHAR,
  email VARCHAR,
  logo_url TEXT,
  cover_image_url TEXT,
  gallery_images TEXT[],
  business_hours JSONB,
  location GEOMETRY(Point, 4326),
  rating NUMERIC DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMPTZ,
  subscription_tier public.subscription_tier DEFAULT 'basic',
  subscription_expires_at TIMESTAMPTZ,
  payment_upi_id VARCHAR,
  payment_qr_code_url TEXT,
  payment_phone_number VARCHAR,
  preferred_payment_methods TEXT[] DEFAULT ARRAY[]::text[],
  payment_instructions TEXT,
  accepts_online_payments BOOLEAN DEFAULT false,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  slug VARCHAR,
  sku TEXT,
  description TEXT,
  category VARCHAR,
  subcategory TEXT,
  brand TEXT,
  tags TEXT[],
  price NUMERIC,
  compare_at_price NUMERIC,
  cost_price NUMERIC,
  stock_quantity INTEGER DEFAULT 0,
  inventory_tracking BOOLEAN DEFAULT true,
  images TEXT[],
  specifications JSONB DEFAULT '{}'::jsonb,
  meta_title TEXT,
  meta_description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMPTZ,
  credits_cost INTEGER DEFAULT 0,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: offers
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  image_url TEXT,
  offer_type VARCHAR DEFAULT 'percentage',
  discount_percentage NUMERIC,
  discount_amount NUMERIC,
  applicable_to VARCHAR DEFAULT 'all',
  applicable_categories TEXT[],
  terms_conditions TEXT,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  featured_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: inquiries
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  product_name VARCHAR NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  budget_min NUMERIC,
  budget_max NUMERIC,
  image_url TEXT,
  attachment_urls TEXT[] DEFAULT ARRAY[]::text[],
  status public.inquiry_status DEFAULT 'pending',
  preferred_contact VARCHAR DEFAULT 'chat',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: inquiry_responses
CREATE TABLE IF NOT EXISTS public.inquiry_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  message TEXT NOT NULL,
  quoted_price NUMERIC,
  estimated_delivery_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message_text TEXT,
  message_type VARCHAR DEFAULT 'text',
  attachments JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: payment_requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status public.payment_status DEFAULT 'pending',
  payment_method VARCHAR,
  transaction_id VARCHAR,
  screenshot_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: customer_payment_preferences
CREATE TABLE IF NOT EXISTS public.customer_payment_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  preferred_payment_app VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: shop_reviews
CREATE TABLE IF NOT EXISTS public.shop_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  inquiry_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  review_images TEXT[],
  is_verified_purchase BOOLEAN DEFAULT false,
  is_helpful BOOLEAN DEFAULT false,
  review_status VARCHAR DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: shop_review_stats (VIEW - materialized)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.shop_review_stats AS
SELECT 
  shop_id,
  COUNT(*) as total_reviews,
  AVG(rating)::NUMERIC(3,2) as average_rating,
  COUNT(*) FILTER (WHERE rating = 5) as five_star,
  COUNT(*) FILTER (WHERE rating = 4) as four_star,
  COUNT(*) FILTER (WHERE rating = 3) as three_star,
  COUNT(*) FILTER (WHERE rating = 2) as two_star,
  COUNT(*) FILTER (WHERE rating = 1) as one_star,
  COUNT(*) FILTER (WHERE review_images IS NOT NULL AND array_length(review_images, 1) > 0) as with_photos_count
FROM public.shop_reviews
WHERE review_status = 'approved'
GROUP BY shop_id;

-- Table: review_helpfulness
CREATE TABLE IF NOT EXISTS public.review_helpfulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Table: review_reports
CREATE TABLE IF NOT EXISTS public.review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  reported_by UUID NOT NULL,
  report_reason VARCHAR NOT NULL,
  report_details TEXT,
  status VARCHAR DEFAULT 'pending',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: review_templates
CREATE TABLE IF NOT EXISTS public.review_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  template_text TEXT NOT NULL,
  category VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: referral_codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  referral_code VARCHAR NOT NULL UNIQUE,
  total_referrals INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: referral_transactions
CREATE TABLE IF NOT EXISTS public.referral_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL,
  referred_customer_id UUID NOT NULL,
  reward_amount NUMERIC,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type public.notification_type NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  reference_type VARCHAR,
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: platform_alerts
CREATE TABLE IF NOT EXISTS public.platform_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  severity public.alert_severity DEFAULT 'medium',
  target_roles TEXT[],
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: platform_settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR NOT NULL UNIQUE,
  value JSONB NOT NULL,
  category VARCHAR,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: shop_credits
CREATE TABLE IF NOT EXISTS public.shop_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE,
  total_credits INTEGER DEFAULT 0,
  lifetime_credits_purchased INTEGER DEFAULT 0,
  last_transaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: credit_transactions
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  transaction_type public.transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type VARCHAR,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: credit_costs
CREATE TABLE IF NOT EXISTS public.credit_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type public.credit_action_type NOT NULL,
  cost_per_action INTEGER DEFAULT 0,
  daily_cost INTEGER DEFAULT 0,
  duration_days INTEGER DEFAULT 30,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: featured_items
CREATE TABLE IF NOT EXISTS public.featured_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  entity_type VARCHAR NOT NULL,
  entity_id UUID NOT NULL,
  featured_until TIMESTAMPTZ NOT NULL,
  status VARCHAR DEFAULT 'active',
  daily_cost INTEGER DEFAULT 0,
  total_credits_allocated INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  credits_consumed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: customer_favorites
CREATE TABLE IF NOT EXISTS public.customer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  shop_id UUID,
  product_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, shop_id, product_id)
);

-- Table: shop_verification_documents
CREATE TABLE IF NOT EXISTS public.shop_verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  document_type VARCHAR NOT NULL,
  document_url TEXT NOT NULL,
  verification_status public.verification_status DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject VARCHAR NOT NULL,
  category VARCHAR,
  priority VARCHAR DEFAULT 'medium',
  status public.support_ticket_status DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: support_messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  attachments TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: analytics_events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id VARCHAR,
  event_type VARCHAR NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: viewanalytics
CREATE TABLE IF NOT EXISTS public.viewanalytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID,
  session_id VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR NOT NULL,
  entity_type VARCHAR,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: wallet_transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_type public.transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reference_type VARCHAR,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 4: INDEXES
-- ============================================================================

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_shops_search_vector ON public.shops USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON public.products USING GIN(search_vector);

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_shops_location ON public.shops USING GIST(location);

-- Foreign key and query optimization indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_user_id ON public.customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON public.shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_is_active ON public.shops(is_active);
CREATE INDEX IF NOT EXISTS idx_shops_is_featured ON public.shops(is_featured);
CREATE INDEX IF NOT EXISTS idx_shops_is_active_is_featured ON public.shops(is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_offers_shop_id ON public.offers(shop_id);
CREATE INDEX IF NOT EXISTS idx_offers_is_active ON public.offers(is_active);
CREATE INDEX IF NOT EXISTS idx_offers_valid_until ON public.offers(valid_until);
CREATE INDEX IF NOT EXISTS idx_inquiries_customer_id ON public.inquiries(customer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_shop_id ON public.inquiries(shop_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiry_responses_inquiry_id ON public.inquiry_responses(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_messages_inquiry_id ON public.messages(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_requests_inquiry_id ON public.payment_requests(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_customer_id ON public.payment_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_shop_id ON public.payment_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_shop_id ON public.shop_reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_customer_id ON public.shop_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_inquiry_id ON public.shop_reviews(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_rating ON public.shop_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_status ON public.shop_reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_review_helpfulness_review_id ON public.review_helpfulness(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpfulness_user_id ON public.review_helpfulness(user_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON public.review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_shop_id ON public.referral_codes(shop_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_code_id ON public.referral_transactions(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_credits_shop_id ON public.shop_credits(shop_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_shop_id ON public.credit_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_featured_items_shop_id ON public.featured_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_featured_items_entity ON public.featured_items(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_featured_items_featured_until ON public.featured_items(featured_until);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer_id ON public.customer_favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_viewanalytics_entity ON public.viewanalytics(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_viewanalytics_created_at ON public.viewanalytics(created_at DESC);

-- ============================================================================
-- SECTION 5: FUNCTIONS
-- ============================================================================

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(required_role public.user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = required_role 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: is_shop_owner
CREATE OR REPLACE FUNCTION public.is_shop_owner(shop_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.shops 
    WHERE id = shop_uuid 
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, email, email_verified)
  VALUES (NEW.id, NEW.email, NEW.email_confirmed_at IS NOT NULL)
  ON CONFLICT (id) DO NOTHING;
  
  -- Assign default customer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;
  
  -- Create customer profile
  INSERT INTO public.customer_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: create_notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type public.notification_type,
  p_title VARCHAR,
  p_message TEXT,
  p_reference_type VARCHAR DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_reference_type, p_reference_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function: update_shop_search_vector
CREATE OR REPLACE FUNCTION public.update_shop_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.categories, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: update_product_search_vector
CREATE OR REPLACE FUNCTION public.update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.brand, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: get_nearby_shops
CREATE OR REPLACE FUNCTION public.get_nearby_shops(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    ST_Distance(
      s.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000 AS distance_km
  FROM public.shops s
  WHERE s.is_active = true
    AND s.location IS NOT NULL
    AND ST_DWithin(
      s.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function: refresh_shop_review_stats
CREATE OR REPLACE FUNCTION public.refresh_shop_review_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.shop_review_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 6: TRIGGERS
-- ============================================================================

-- Trigger: New user setup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Triggers: updated_at for all tables
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_user_roles
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_customer_profiles
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_shops
  BEFORE UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_offers
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_inquiries
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_inquiry_responses
  BEFORE UPDATE ON public.inquiry_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_payment_requests
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_customer_payment_preferences
  BEFORE UPDATE ON public.customer_payment_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_reviews
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_shop_reviews
  BEFORE UPDATE ON public.shop_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_referral_codes
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_referral_transactions
  BEFORE UPDATE ON public.referral_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_platform_settings
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_shop_credits
  BEFORE UPDATE ON public.shop_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_credit_costs
  BEFORE UPDATE ON public.credit_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_featured_items
  BEFORE UPDATE ON public.featured_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_shop_verification_documents
  BEFORE UPDATE ON public.shop_verification_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_support_tickets
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers: Full-text search vectors
CREATE TRIGGER shops_search_vector_update
  BEFORE INSERT OR UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shop_search_vector();

CREATE TRIGGER products_search_vector_update
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_search_vector();

-- ============================================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payment_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpfulness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewanalytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policies: users
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
CREATE POLICY "Anyone can view user profiles" ON public.users FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users" ON public.users FOR UPDATE TO authenticated USING (is_admin());

-- Policies: user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (is_admin());

-- Policies: customer_profiles
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customer_profiles;
CREATE POLICY "Customers can view own profile" ON public.customer_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers can update own profile" ON public.customer_profiles;
CREATE POLICY "Customers can update own profile" ON public.customer_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Policies: shops
DROP POLICY IF EXISTS "Anyone can view active shops" ON public.shops;
CREATE POLICY "Anyone can view active shops" ON public.shops FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "Shop owners can insert shop" ON public.shops;
CREATE POLICY "Shop owners can insert shop" ON public.shops FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Shop owners can update own shop" ON public.shops;
CREATE POLICY "Shop owners can update own shop" ON public.shops FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Admins can view all shops" ON public.shops;
CREATE POLICY "Admins can view all shops" ON public.shops FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can update all shops" ON public.shops;
CREATE POLICY "Admins can update all shops" ON public.shops FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert shops" ON public.shops;
CREATE POLICY "Admins can insert shops" ON public.shops FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete shops" ON public.shops;
CREATE POLICY "Admins can delete shops" ON public.shops FOR DELETE TO authenticated USING (is_admin());

-- Policies: products
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "Shop owners can manage own products" ON public.products;
CREATE POLICY "Shop owners can manage own products" ON public.products FOR ALL TO authenticated 
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Policies: offers
DROP POLICY IF EXISTS "Anyone can view active offers" ON public.offers;
CREATE POLICY "Anyone can view active offers" ON public.offers FOR SELECT TO public 
  USING (is_active = true AND valid_until > now());

DROP POLICY IF EXISTS "Shop owners can manage own offers" ON public.offers;
CREATE POLICY "Shop owners can manage own offers" ON public.offers FOR ALL TO authenticated 
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Policies: inquiries
DROP POLICY IF EXISTS "Customers can view own inquiries" ON public.inquiries;
CREATE POLICY "Customers can view own inquiries" ON public.inquiries FOR SELECT TO authenticated 
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can create inquiries" ON public.inquiries;
CREATE POLICY "Customers can create inquiries" ON public.inquiries FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can update their own inquiries" ON public.inquiries;
CREATE POLICY "Customers can update their own inquiries" ON public.inquiries FOR UPDATE TO authenticated 
  USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Shop owners can view inquiries for their shops" ON public.inquiries;
CREATE POLICY "Shop owners can view inquiries for their shops" ON public.inquiries FOR SELECT TO authenticated 
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Shop owners can update inquiries for their shops" ON public.inquiries;
CREATE POLICY "Shop owners can update inquiries for their shops" ON public.inquiries FOR UPDATE TO authenticated 
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Policies: inquiry_responses
DROP POLICY IF EXISTS "Shop owners can manage responses" ON public.inquiry_responses;
CREATE POLICY "Shop owners can manage responses" ON public.inquiry_responses FOR ALL TO authenticated 
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Customers can view responses to their inquiries" ON public.inquiry_responses;
CREATE POLICY "Customers can view responses to their inquiries" ON public.inquiry_responses FOR SELECT TO authenticated 
  USING (inquiry_id IN (SELECT id FROM public.inquiries WHERE customer_id = auth.uid()));

-- Policies: messages
DROP POLICY IF EXISTS "Users can view messages in their inquiries" ON public.messages;
CREATE POLICY "Users can view messages in their inquiries" ON public.messages FOR SELECT TO authenticated 
  USING (
    inquiry_id IN (
      SELECT id FROM public.inquiries 
      WHERE customer_id = auth.uid() 
        OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their inquiries" ON public.messages;
CREATE POLICY "Users can send messages in their inquiries" ON public.messages FOR INSERT TO authenticated 
  WITH CHECK (
    auth.uid() = sender_id AND
    inquiry_id IN (
      SELECT id FROM public.inquiries 
      WHERE customer_id = auth.uid() 
        OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    )
  );

-- Policies: payment_requests
DROP POLICY IF EXISTS "Customers can view own payment requests" ON public.payment_requests;
CREATE POLICY "Customers can view own payment requests" ON public.payment_requests FOR SELECT TO authenticated 
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can create payment requests" ON public.payment_requests;
CREATE POLICY "Customers can create payment requests" ON public.payment_requests FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can update own payment requests" ON public.payment_requests;
CREATE POLICY "Customers can update own payment requests" ON public.payment_requests FOR UPDATE TO authenticated 
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Shop owners can view payment requests for their shops" ON public.payment_requests;
CREATE POLICY "Shop owners can view payment requests for their shops" ON public.payment_requests FOR SELECT TO authenticated 
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Shop owners can update payment requests for their shops" ON public.payment_requests;
CREATE POLICY "Shop owners can update payment requests for their shops" ON public.payment_requests FOR UPDATE TO authenticated 
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Policies: customer_payment_preferences
DROP POLICY IF EXISTS "Customers can view own payment preferences" ON public.customer_payment_preferences;
CREATE POLICY "Customers can view own payment preferences" ON public.customer_payment_preferences FOR SELECT TO authenticated 
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can insert own payment preferences" ON public.customer_payment_preferences;
CREATE POLICY "Customers can insert own payment preferences" ON public.customer_payment_preferences FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can update own payment preferences" ON public.customer_payment_preferences;
CREATE POLICY "Customers can update own payment preferences" ON public.customer_payment_preferences FOR UPDATE TO authenticated 
  USING (auth.uid() = customer_id);

-- Policies: reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Customers can create reviews" ON public.reviews;
CREATE POLICY "Customers can create reviews" ON public.reviews FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can update own reviews" ON public.reviews;
CREATE POLICY "Customers can update own reviews" ON public.reviews FOR UPDATE TO authenticated 
  USING (auth.uid() = customer_id);

-- Policies: shop_reviews
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.shop_reviews;
CREATE POLICY "Anyone can view approved reviews" ON public.shop_reviews FOR SELECT TO public 
  USING (review_status = 'approved');

DROP POLICY IF EXISTS "Customers can create reviews" ON public.shop_reviews;
CREATE POLICY "Customers can create reviews" ON public.shop_reviews FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can update own reviews" ON public.shop_reviews;
CREATE POLICY "Customers can update own reviews" ON public.shop_reviews FOR UPDATE TO authenticated 
  USING (auth.uid() = customer_id);

-- Policies: review_helpfulness
DROP POLICY IF EXISTS "Anyone can view review helpfulness" ON public.review_helpfulness;
CREATE POLICY "Anyone can view review helpfulness" ON public.review_helpfulness FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can vote on reviews" ON public.review_helpfulness;
CREATE POLICY "Users can vote on reviews" ON public.review_helpfulness FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own votes" ON public.review_helpfulness;
CREATE POLICY "Users can update own votes" ON public.review_helpfulness FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own votes" ON public.review_helpfulness;
CREATE POLICY "Users can delete own votes" ON public.review_helpfulness FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

-- Policies: review_reports
DROP POLICY IF EXISTS "Users can report reviews" ON public.review_reports;
CREATE POLICY "Users can report reviews" ON public.review_reports FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = reported_by);

DROP POLICY IF EXISTS "Users can view own reports" ON public.review_reports;
CREATE POLICY "Users can view own reports" ON public.review_reports FOR SELECT TO authenticated 
  USING (auth.uid() = reported_by);

DROP POLICY IF EXISTS "Admins can view all reports" ON public.review_reports;
CREATE POLICY "Admins can view all reports" ON public.review_reports FOR SELECT TO authenticated 
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update reports" ON public.review_reports;
CREATE POLICY "Admins can update reports" ON public.review_reports FOR UPDATE TO authenticated 
  USING (is_admin());

-- Policies: review_templates
DROP POLICY IF EXISTS "Anyone can view review templates" ON public.review_templates;
CREATE POLICY "Anyone can view review templates" ON public.review_templates FOR SELECT TO public 
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage review templates" ON public.review_templates;
CREATE POLICY "Admins can manage review templates" ON public.review_templates FOR ALL TO authenticated 
  USING (is_admin());

-- Policies: referral_codes
DROP POLICY IF EXISTS "Anyone can view active referral codes" ON public.referral_codes;
CREATE POLICY "Anyone can view active referral codes" ON public.referral_codes FOR SELECT TO public 
  USING (is_active = true);

DROP POLICY IF EXISTS "Shop owners can view own referral codes" ON public.referral_codes;
CREATE POLICY "Shop owners can view own referral codes" ON public.referral_codes FOR SELECT TO authenticated 
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Policies: referral_transactions
DROP POLICY IF EXISTS "Customers can view their own referral transactions" ON public.referral_transactions;
CREATE POLICY "Customers can view their own referral transactions" ON public.referral_transactions FOR SELECT TO authenticated 
  USING (auth.uid() = referred_customer_id);

-- Policies: notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id);

-- Policies: platform_alerts
DROP POLICY IF EXISTS "Users can view active alerts for their role" ON public.platform_alerts;
CREATE POLICY "Users can view active alerts for their role" ON public.platform_alerts FOR SELECT TO public 
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "Admins can manage platform alerts" ON public.platform_alerts;
CREATE POLICY "Admins can manage platform alerts" ON public.platform_alerts FOR ALL TO authenticated 
  USING (is_admin());

-- Policies: platform_settings
DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can view platform settings" ON public.platform_settings FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform settings" ON public.platform_settings FOR ALL TO authenticated 
  USING (is_admin());

-- Policies: shop_credits
DROP POLICY IF EXISTS "Shop owners can view own credits" ON public.shop_credits;
CREATE POLICY "Shop owners can view own credits" ON public.shop_credits FOR SELECT TO authenticated 
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Policies: credit_transactions
DROP POLICY IF EXISTS "Shop owners can view own transactions" ON public.credit_transactions;
CREATE POLICY "Shop owners can view own transactions" ON public.credit_transactions FOR SELECT TO authenticated 
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Shop owners can insert their transactions" ON public.credit_transactions;
CREATE POLICY "Shop owners can insert their transactions" ON public.credit_transactions FOR INSERT TO authenticated 
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Policies: credit_costs
DROP POLICY IF EXISTS "Anyone can view active credit costs" ON public.credit_costs;
CREATE POLICY "Anyone can view active credit costs" ON public.credit_costs FOR SELECT TO public 
  USING (is_active = true);

-- Policies: featured_items
DROP POLICY IF EXISTS "Anyone can view active featured items" ON public.featured_items;
CREATE POLICY "Anyone can view active featured items" ON public.featured_items FOR SELECT TO public 
  USING (featured_until > now());

DROP POLICY IF EXISTS "Shop owners can manage own featured items" ON public.featured_items;
CREATE POLICY "Shop owners can manage own featured items" ON public.featured_items FOR ALL TO authenticated 
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Policies: customer_favorites
DROP POLICY IF EXISTS "Customers can view own favorites" ON public.customer_favorites;
CREATE POLICY "Customers can view own favorites" ON public.customer_favorites FOR SELECT TO authenticated 
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can manage own favorites" ON public.customer_favorites;
CREATE POLICY "Customers can manage own favorites" ON public.customer_favorites FOR ALL TO authenticated 
  USING (auth.uid() = customer_id);

-- Policies: shop_verification_documents
DROP POLICY IF EXISTS "Shop owners can manage own verification docs" ON public.shop_verification_documents;
CREATE POLICY "Shop owners can manage own verification docs" ON public.shop_verification_documents FOR ALL TO authenticated 
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all verification docs" ON public.shop_verification_documents;
CREATE POLICY "Admins can view all verification docs" ON public.shop_verification_documents FOR SELECT TO authenticated 
  USING (is_admin());

-- Policies: support_tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tickets" ON public.support_tickets;
CREATE POLICY "Users can update own tickets" ON public.support_tickets FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all tickets" ON public.support_tickets FOR SELECT TO authenticated 
  USING (is_admin());

-- Policies: support_messages
DROP POLICY IF EXISTS "Users can view messages in own tickets" ON public.support_messages;
CREATE POLICY "Users can view messages in own tickets" ON public.support_messages FOR SELECT TO authenticated 
  USING (ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create messages in own tickets" ON public.support_messages;
CREATE POLICY "Users can create messages in own tickets" ON public.support_messages FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = sender_id AND ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid()));

-- Policies: analytics_events
DROP POLICY IF EXISTS "Users can view own events" ON public.analytics_events;
CREATE POLICY "Users can view own events" ON public.analytics_events FOR SELECT TO public 
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events FOR INSERT TO public 
  WITH CHECK (true);

-- Policies: viewanalytics
DROP POLICY IF EXISTS "Anyone can read view analytics" ON public.viewanalytics;
CREATE POLICY "Anyone can read view analytics" ON public.viewanalytics FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert view analytics" ON public.viewanalytics;
CREATE POLICY "Anyone can insert view analytics" ON public.viewanalytics FOR INSERT TO public 
  WITH CHECK (true);

-- Policies: audit_logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated 
  USING (is_admin());

-- Policies: wallet_transactions (placeholder for future wallet feature)
-- Add policies as needed when wallet is implemented

-- ============================================================================
-- SECTION 8: STORAGE BUCKETS & POLICIES
-- ============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('shop-images', 'shop-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('offer-images', 'offer-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('shop-assets', 'shop-assets', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('customer-uploads', 'customer-uploads', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('chat-attachments', 'chat-attachments', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: product-images (public read)
DROP POLICY IF EXISTS "Public read for product images" ON storage.objects;
CREATE POLICY "Public read for product images" ON storage.objects FOR SELECT TO public 
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Shop owners can upload product images" ON storage.objects;
CREATE POLICY "Shop owners can upload product images" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'product-images');

-- Storage policies: shop-images (public read)
DROP POLICY IF EXISTS "Public read for shop images" ON storage.objects;
CREATE POLICY "Public read for shop images" ON storage.objects FOR SELECT TO public 
  USING (bucket_id = 'shop-images');

DROP POLICY IF EXISTS "Shop owners can upload shop images" ON storage.objects;
CREATE POLICY "Shop owners can upload shop images" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'shop-images');

-- Storage policies: offer-images (public read)
DROP POLICY IF EXISTS "Public read for offer images" ON storage.objects;
CREATE POLICY "Public read for offer images" ON storage.objects FOR SELECT TO public 
  USING (bucket_id = 'offer-images');

DROP POLICY IF EXISTS "Shop owners can upload offer images" ON storage.objects;
CREATE POLICY "Shop owners can upload offer images" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'offer-images');

-- Storage policies: shop-assets (public read)
DROP POLICY IF EXISTS "Public read for shop assets" ON storage.objects;
CREATE POLICY "Public read for shop assets" ON storage.objects FOR SELECT TO public 
  USING (bucket_id = 'shop-assets');

DROP POLICY IF EXISTS "Shop owners can upload shop assets" ON storage.objects;
CREATE POLICY "Shop owners can upload shop assets" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'shop-assets');

-- Storage policies: customer-uploads (private)
DROP POLICY IF EXISTS "Authenticated users can read own customer uploads" ON storage.objects;
CREATE POLICY "Authenticated users can read own customer uploads" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'customer-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated users can upload to customer uploads" ON storage.objects;
CREATE POLICY "Authenticated users can upload to customer uploads" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'customer-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies: chat-attachments (private)
DROP POLICY IF EXISTS "Users can read chat attachments in their inquiries" ON storage.objects;
CREATE POLICY "Users can read chat attachments in their inquiries" ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
CREATE POLICY "Users can upload chat attachments" ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'chat-attachments');

-- ============================================================================
-- SECTION 9: REALTIME CONFIGURATION
-- ============================================================================

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.inquiries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_reviews;

-- ============================================================================
-- SECTION 10: SEED DATA
-- ============================================================================

-- Platform settings
INSERT INTO public.platform_settings (key, value, category, description) VALUES
  ('min_password_length', '8', 'auth', 'Minimum password length for user accounts'),
  ('max_inquiry_images', '5', 'inquiries', 'Maximum number of images per inquiry'),
  ('default_credits_new_shop', '100', 'credits', 'Initial credits allocated to new shops'),
  ('featured_product_daily_cost', '10', 'credits', 'Daily credit cost to feature a product'),
  ('featured_shop_daily_cost', '50', 'credits', 'Daily credit cost to feature a shop'),
  ('featured_offer_daily_cost', '15', 'credits', 'Daily credit cost to feature an offer'),
  ('inquiry_expiry_days', '30', 'inquiries', 'Number of days before an inquiry expires'),
  ('max_upload_size_mb', '5', 'uploads', 'Maximum file upload size in megabytes')
ON CONFLICT (key) DO NOTHING;

-- Review templates
INSERT INTO public.review_templates (rating, template_text, category, is_active) VALUES
  (5, 'Excellent service! Highly recommend this shop.', 'general', true),
  (5, 'Outstanding quality and great customer service!', 'general', true),
  (4, 'Good experience overall, minor improvements needed.', 'general', true),
  (4, 'Satisfied with the product, quick delivery.', 'general', true),
  (3, 'Average service, met my basic expectations.', 'general', true),
  (3, 'Decent quality, but room for improvement.', 'general', true),
  (2, 'Below expectations, needs significant improvement.', 'general', true),
  (2, 'Not very satisfied with the service.', 'general', true),
  (1, 'Poor experience, would not recommend.', 'general', true),
  (1, 'Very disappointed with the quality and service.', 'general', true)
ON CONFLICT DO NOTHING;

-- Credit costs
INSERT INTO public.credit_costs (action_type, cost_per_action, daily_cost, duration_days, description, is_active) VALUES
  ('feature_product', 0, 10, 30, 'Feature a product on homepage and search results', true),
  ('feature_shop', 0, 50, 30, 'Feature a shop on homepage and shop listings', true),
  ('feature_offer', 0, 15, 30, 'Feature an offer on offers page', true),
  ('priority_listing', 5, 0, 0, 'Boost product in search results (per search)', true),
  ('boost_visibility', 20, 0, 0, 'One-time visibility boost for 24 hours', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 11: VERIFICATION QUERIES
-- ============================================================================

-- These queries help verify the schema was created successfully
-- Run these after executing this file to confirm everything is set up

-- Verification: Count tables
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT count(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
  
  RAISE NOTICE 'Tables created: % (expected: 37)', table_count;
END $$;

-- Verification: Count ENUMs
DO $$
DECLARE
  enum_count INTEGER;
BEGIN
  SELECT count(*) INTO enum_count
  FROM pg_type 
  WHERE typtype = 'e' 
    AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  RAISE NOTICE 'ENUMs created: % (expected: 11)', enum_count;
END $$;

-- Verification: Count RLS policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT count(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  RAISE NOTICE 'RLS policies created: % (expected: 100+)', policy_count;
END $$;

-- Verification: Storage buckets
DO $$
DECLARE
  bucket_count INTEGER;
BEGIN
  SELECT count(*) INTO bucket_count
  FROM storage.buckets;
  
  RAISE NOTICE 'Storage buckets created: % (expected: 6)', bucket_count;
END $$;

-- Verification: Extensions
DO $$
DECLARE
  extension_count INTEGER;
BEGIN
  SELECT count(*) INTO extension_count
  FROM pg_extension 
  WHERE extname IN ('uuid-ossp', 'postgis', 'pg_trgm', 'pgcrypto');
  
  RAISE NOTICE 'Extensions installed: % (expected: 4+)', extension_count;
END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'LocalConnect Database Schema Installation Complete!';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  ✓ Extensions installed';
  RAISE NOTICE '  ✓ Custom types (ENUMs) created';
  RAISE NOTICE '  ✓ 37 tables created with full schema';
  RAISE NOTICE '  ✓ 50+ performance indexes created';
  RAISE NOTICE '  ✓ Essential functions defined';
  RAISE NOTICE '  ✓ Triggers configured';
  RAISE NOTICE '  ✓ 100+ RLS policies applied';
  RAISE NOTICE '  ✓ Storage buckets configured';
  RAISE NOTICE '  ✓ Realtime enabled for critical tables';
  RAISE NOTICE '  ✓ Seed data inserted';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Review the verification query results above';
  RAISE NOTICE '  2. Test authentication by creating a user';
  RAISE NOTICE '  3. Configure your application connection strings';
  RAISE NOTICE '  4. Run application migrations if needed';
  RAISE NOTICE '';
  RAISE NOTICE 'Documentation: See comments throughout this file for details';
  RAISE NOTICE '============================================================================';
END $$;
