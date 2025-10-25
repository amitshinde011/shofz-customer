-- LocalConnect Admin Platform - UPDATE Existing Schema
-- This script safely updates existing tables without dropping data
-- Run check-schema.sql first to see what exists

-- ============================================================================
-- STEP 1: Create missing ENUMS (only if they don't exist)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'shop_owner', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'banned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE shop_status AS ENUM ('pending', 'active', 'suspended', 'rejected', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'requires_update');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('order', 'refund', 'commission', 'payout', 'subscription', 'adjustment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'premium', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE content_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('info', 'warning', 'error', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: Update USERS table (add missing columns)
-- ============================================================================

-- Add columns if they don't exist
DO $$
BEGIN
    -- Check if users table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN

        -- Add auth_id if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_id') THEN
            ALTER TABLE users ADD COLUMN auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- Add role if missing (try both user_role enum and varchar)
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN
            ALTER TABLE users ADD COLUMN role user_role DEFAULT 'customer';
        END IF;

        -- Add status if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status') THEN
            ALTER TABLE users ADD COLUMN status user_status DEFAULT 'active';
        END IF;

        -- Add email_verified if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email_verified') THEN
            ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
        END IF;

        -- Add phone_verified if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone_verified') THEN
            ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT false;
        END IF;

        -- Add last_login_at if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_login_at') THEN
            ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
        END IF;

        -- Add total_spent if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'total_spent') THEN
            ALTER TABLE users ADD COLUMN total_spent DECIMAL(10,2) DEFAULT 0;
        END IF;

        -- Add total_orders if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'total_orders') THEN
            ALTER TABLE users ADD COLUMN total_orders INTEGER DEFAULT 0;
        END IF;

        -- Add metadata if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'metadata') THEN
            ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}';
        END IF;

        -- Add updated_at if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at') THEN
            ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

    ELSE
        -- Create users table if it doesn't exist
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
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Update SHOPS table (add missing columns)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shops') THEN

        -- Add missing columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'verification_status') THEN
            ALTER TABLE shops ADD COLUMN verification_status verification_status DEFAULT 'pending';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'total_reviews') THEN
            ALTER TABLE shops ADD COLUMN total_reviews INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'total_orders') THEN
            ALTER TABLE shops ADD COLUMN total_orders INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'total_revenue') THEN
            ALTER TABLE shops ADD COLUMN total_revenue DECIMAL(12,2) DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'commission_rate') THEN
            ALTER TABLE shops ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 15.00;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'subscription_tier') THEN
            ALTER TABLE shops ADD COLUMN subscription_tier subscription_tier DEFAULT 'free';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'featured') THEN
            ALTER TABLE shops ADD COLUMN featured BOOLEAN DEFAULT false;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'metadata') THEN
            ALTER TABLE shops ADD COLUMN metadata JSONB DEFAULT '{}';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'updated_at') THEN
            ALTER TABLE shops ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

    ELSE
        -- Create shops table if it doesn't exist
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
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Create NEW admin tables (only if they don't exist)
-- ============================================================================

-- Shop verification documents
CREATE TABLE IF NOT EXISTS shop_verification_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_url TEXT NOT NULL,
    status verification_status DEFAULT 'pending',
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type transaction_type NOT NULL,
    status transaction_status DEFAULT 'pending',
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    user_id UUID REFERENCES users(id),
    shop_id UUID REFERENCES shops(id),
    order_id UUID,
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

-- Payouts
CREATE TABLE IF NOT EXISTS payouts (
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
CREATE TABLE IF NOT EXISTS shop_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL,
    status subscription_status DEFAULT 'active',
    price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT true,
    cancelled_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform alerts
CREATE TABLE IF NOT EXISTS platform_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type alert_type NOT NULL,
    status alert_status DEFAULT 'active',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity INTEGER DEFAULT 1,
    source VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id UUID,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
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
CREATE TABLE IF NOT EXISTS activity_feed (
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
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message templates
CREATE TABLE IF NOT EXISTS message_templates (
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
-- STEP 5: Create INDEXES (only if they don't exist)
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Shops indexes
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE INDEX IF NOT EXISTS idx_shops_verification_status ON shops(verification_status);
CREATE INDEX IF NOT EXISTS idx_shops_created_at ON shops(created_at);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_shop_id ON transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Activity feed indexes
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON activity_feed(type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_shop_id ON activity_feed(shop_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at);

-- ============================================================================
-- STEP 6: Create TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (DROP IF EXISTS first)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shops_updated_at ON shops;
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: Enable RLS (only if not already enabled)
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: Create helper FUNCTIONS
-- ============================================================================

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

-- Get platform statistics
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM users WHERE role = 'customer'),
        'total_shops', (SELECT COUNT(*) FROM shops WHERE status = 'active'),
        'total_orders', (SELECT COUNT(*) FROM orders WHERE true),
        'total_revenue', (SELECT COALESCE(SUM(total), 0) FROM orders WHERE payment_status = 'completed'),
        'pending_verifications', (SELECT COUNT(*) FROM shops WHERE verification_status = 'pending'),
        'active_alerts', (SELECT COUNT(*) FROM platform_alerts WHERE status = 'active')
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 9: Create RLS POLICIES (drop existing first)
-- ============================================================================

-- Users policies
DROP POLICY IF EXISTS "Admins have full access to users" ON users;
CREATE POLICY "Admins have full access to users"
    ON users FOR ALL
    USING (is_admin());

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth_id = auth.uid());

-- Shops policies
DROP POLICY IF EXISTS "Admins have full access to shops" ON shops;
CREATE POLICY "Admins have full access to shops"
    ON shops FOR ALL
    USING (is_admin());

-- Other admin-only policies
DROP POLICY IF EXISTS "Admins have full access to platform_alerts" ON platform_alerts;
CREATE POLICY "Admins have full access to platform_alerts"
    ON platform_alerts FOR ALL
    USING (is_admin());

DROP POLICY IF EXISTS "Admins have full access to audit_logs" ON audit_logs;
CREATE POLICY "Admins have full access to audit_logs"
    ON audit_logs FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins have full access to activity_feed" ON activity_feed;
CREATE POLICY "Admins have full access to activity_feed"
    ON activity_feed FOR ALL
    USING (is_admin());

-- ============================================================================
-- STEP 10: Insert default PLATFORM SETTINGS
-- ============================================================================

INSERT INTO platform_settings (key, value, description, category) VALUES
    ('commission_rate', '{"default": 15, "min": 10, "max": 30}'::JSONB, 'Platform commission rates', 'financial'),
    ('payout_schedule', '{"frequency": "weekly", "minimum": 100}'::JSONB, 'Payout configuration', 'financial'),
    ('subscription_plans', '{"basic": 29.99, "premium": 79.99, "enterprise": 199.99}'::JSONB, 'Subscription pricing', 'financial')
ON CONFLICT (key) DO NOTHING;

-- Done!
SELECT 'Schema update completed successfully! Check the tables and columns.' AS message;
