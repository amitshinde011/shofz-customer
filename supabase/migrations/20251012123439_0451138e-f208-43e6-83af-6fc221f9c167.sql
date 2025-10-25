-- LocalConnect Customer App - Multi-Role Email Authentication Schema
-- Phase 1: Clean up existing data (as requested by user)

-- Drop all dependent tables first
DROP TABLE IF EXISTS featured_item_deductions CASCADE;
DROP TABLE IF EXISTS featured_items CASCADE;
DROP TABLE IF EXISTS customer_payment_preferences CASCADE;
DROP TABLE IF EXISTS payment_verification_evidence CASCADE;
DROP TABLE IF EXISTS payment_follow_ups CASCADE;
DROP TABLE IF EXISTS payment_disputes CASCADE;
DROP TABLE IF EXISTS payment_requests CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS coupon_usage CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS shop_credits CASCADE;
DROP TABLE IF EXISTS referral_transactions CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS shop_review_stats CASCADE;
DROP TABLE IF EXISTS shop_review_reports CASCADE;
DROP TABLE IF EXISTS shop_reviews CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS inquiry_responses CASCADE;
DROP TABLE IF EXISTS inquiry_shops CASCADE;
DROP TABLE IF EXISTS inquiries CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS user_role CASCADE;

-- Phase 2: Create new schema with multi-role support

-- Create role enum (matches requirement for separate roles table)
CREATE TYPE app_role AS ENUM ('customer', 'shop_owner', 'admin');

-- Main users table (linked to auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (CRITICAL: separate table for security)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    role_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Customer profiles (for users with customer role)
CREATE TABLE customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    delivery_addresses JSONB DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    loyalty_points INTEGER DEFAULT 0,
    favorite_shops UUID[] DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shop owner profiles (for users with shop_owner role)
CREATE TABLE shop_owner_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    business_verified BOOLEAN DEFAULT false,
    verification_documents JSONB DEFAULT '[]'::jsonb,
    business_name VARCHAR(255),
    business_category VARCHAR(100),
    business_address TEXT,
    gstin VARCHAR(20),
    business_phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recreate subscription_tier type if needed
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('basic', 'premium', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Shops table (linked to users)
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    address TEXT,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    cover_image_url TEXT,
    gallery_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    business_hours JSONB,
    location geography(Point, 4326),
    rating NUMERIC DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    subscription_tier subscription_tier DEFAULT 'basic',
    subscription_expires_at TIMESTAMPTZ,
    search_vector tsvector,
    payment_upi_id VARCHAR(100),
    payment_phone_number VARCHAR(20),
    accepts_online_payments BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 3: Security Definer Functions (CRITICAL for security)

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = _user_id 
  AND is_active = true
$$;

-- Phase 4: Row Level Security Policies

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Users: can only access own data
CREATE POLICY users_own_data ON users
    FOR ALL USING (auth.uid() = id);

-- User roles: can only access own roles
CREATE POLICY user_roles_own_data ON user_roles
    FOR ALL USING (auth.uid() = user_id);

-- Customer profiles: own data only
CREATE POLICY customer_profiles_own_data ON customer_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Shop owner profiles: own data only
CREATE POLICY shop_owner_profiles_own_data ON shop_owner_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Shops: owners can manage, public can read active shops
CREATE POLICY shops_owner_manage ON shops
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY shops_public_read ON shops
    FOR SELECT USING (is_active = true);

-- Phase 5: Auto-create user profile and customer role on signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Create user record
  INSERT INTO public.users (id, email, name, email_verified, email_verified_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at IS NOT NULL,
    NEW.email_confirmed_at
  );
  
  -- Auto-assign customer role for this app
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  -- Create customer profile
  INSERT INTO public.customer_profiles (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Phase 6: Update timestamp trigger

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_roles_updated_at 
    BEFORE UPDATE ON user_roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customer_profiles_updated_at 
    BEFORE UPDATE ON customer_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_shop_owner_profiles_updated_at 
    BEFORE UPDATE ON shop_owner_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_shops_updated_at 
    BEFORE UPDATE ON shops 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Phase 7: Indexes for performance

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role, is_active);
CREATE INDEX idx_shops_owner_id ON shops(owner_id);
CREATE INDEX idx_shops_category ON shops USING GIN(categories);
CREATE INDEX idx_shops_location ON shops USING GIST(location);
CREATE INDEX idx_shops_active_verified ON shops(is_active, is_verified) WHERE is_active = true;

-- Verification
SELECT 'Multi-role email authentication schema created successfully' AS status;