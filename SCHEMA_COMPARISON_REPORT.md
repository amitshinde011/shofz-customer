# Database Schema Comparison Report
## MASTER_MIGRATION.sql vs types.ts

**Generated:** 2025-10-26
**Status:** CRITICAL DISCREPANCIES FOUND

---

## Executive Summary

A comprehensive comparison between `MASTER_MIGRATION.sql` and the actual database schema (as defined in `src/integrations/supabase/types.ts`) has revealed **significant discrepancies**:

### Key Findings:
- **13 tables** defined in types.ts are COMPLETELY MISSING from MASTER_MIGRATION.sql
- **7 tables** exist in MASTER_MIGRATION.sql but not in types.ts (legacy/deprecated)
- **42 common tables** have numerous column mismatches
- **65 total discrepancy groups** identified
- Several ENUM types are missing or have incorrect values

### Impact:
- Running MASTER_MIGRATION.sql will create a database that does NOT match the application's expectations
- This will cause runtime errors, failed queries, and data integrity issues
- The migration is currently **NOT PRODUCTION-READY**

---

## Section 1: Missing Tables

### Tables in types.ts BUT MISSING from MASTER_MIGRATION.sql

These tables MUST be added to the migration:

1. **`geography_columns`** (PostGIS system view - should auto-exist)
2. **`geometry_columns`** (PostGIS system view - should auto-exist)
3. **`inventory_movements`** - Product inventory tracking
4. **`product_stats`** - Product analytics
5. **`referral_config`** - Referral system configuration
6. **`review_helpfulness`** - Review helpful/not helpful votes
7. **`review_reports`** - Flagged review reports
8. **`review_templates`** - Quick review templates
9. **`shop_categories`** - Shop category master data
10. **`shop_owner_profiles`** - Extended shop owner data
11. **`shop_payment_transactions`** - Shop payment records
12. **`spatial_ref_sys`** (PostGIS system table - should auto-exist)
13. **`support_ticket_tags`** - Ticket tagging system

**Note:** Tables 1, 2, and 12 are PostGIS system tables and should exist automatically when PostGIS extension is enabled.

---

## Section 2: Extra Tables (in MASTER_MIGRATION.sql but not in types.ts)

These tables exist in the migration but NOT in the current schema. They may be deprecated or unused:

1. **`inquiry_shops`** - Multi-shop inquiry junction (possibly deprecated)
2. **`order_items`** - Order line items (missing from types!)
3. **`orders`** - Customer orders (missing from types!)
4. **`payment_disputes`** - Payment dispute tracking
5. **`payment_follow_ups`** - Automated payment follow-ups
6. **`user_searches`** - User search analytics
7. **`wallet_transactions`** - User wallet system

**CRITICAL:** `orders` and `order_items` are business-critical tables that should be in types.ts!

---

## Section 3: Column Discrepancies by Table

### CRITICAL: inquiries table

**Missing in MIGRATION (exist in types.ts):**
- `attachment_urls` (string[])
- `image_url` (string)
- `preferred_contact` (string)
- `product_details` (string)
- `product_name` (string) - **REQUIRED FIELD!**
- `status` (string)

**Extra in MIGRATION (not in types.ts):**
- `delivery_address`, `images`, `last_response_at`, `metadata`, `product_id`, `required_by`, `requirements`, `response_count`, `title`, `unit`

**IMPACT:** Application expects `product_name` but migration has `title` instead!

---

### CRITICAL: inquiry_responses table

**Missing in MIGRATION:**
- `estimated_delivery_days` (number)
- `payment_request_expires_at` (string)
- `payment_status` (string)
- `response_message` (string)
- `response_type` (string)

**Extra in MIGRATION:**
- `attachments`, `delivery_time_days`, `message`, `payment_terms`, `responded_at`, `status`, `terms_and_conditions`, `viewed_at`

---

### CRITICAL: products table

**Missing in MIGRATION:**
- `brand` (string)
- `cost_price` (number)
- `credits_cost` (number)
- `featured_until` (string)
- `inventory_tracking` (boolean)
- `is_active` (boolean)
- `stock_quantity` (number)

**Extra in MIGRATION:**
- `barcode`, `cost`, `inquiry_count`, `is_available`, `order_count`, `published_at`, `quantity`, `search_terms`, `short_description`, `slug`, `thumbnail_url`, `track_inventory`, `variants`, `view_count`

**IMPACT:** Column names don't match! `stock_quantity` vs `quantity`, `inventory_tracking` vs `track_inventory`

---

### CRITICAL: shops table

**Missing in MIGRATION:**
- `accepts_online_payments` (boolean)
- `featured_until` (string)
- `payment_instructions` (string)
- `payment_phone_number` (string)
- `payment_qr_code_url` (string)
- `payment_upi_id` (string)
- `preferred_payment_methods` (string[])
- `search_vector` (tsvector)
- `subscription_tier` (enum)

**Extra in MIGRATION:**
- `city`, `commission_rate`, `country`, `credits_balance`, `last_active_at`, `metadata`, `qr_code_url`, `response_rate`, `response_time_hours`, `settings`, `social_links`, `state`, `tagline`, `total_orders`, `total_revenue`, `verified_at`, `website`, `whatsapp_number`, `zip_code`

**IMPACT:** Missing critical payment-related fields!

---

###users table

**Missing in MIGRATION:**
- `email_verified_at` (string)
- `is_active` (boolean)
- `last_login` (string)
- `name` (string) - **REQUIRED!**
- `phone` (string)
- `profile_image_url` (string)

**Extra in MIGRATION:**
- `auth_id`, `city`, `country`, `full_name`, `last_login_at`, `location`, `login_count`, `loyalty_points`, `metadata`, `phone_verified`, `preferences`, `referral_code`, `referred_by`, `state`, `total_orders`, `total_spent`, `zip_code`

**IMPACT:** Field name mismatch! `name` vs `full_name`, `last_login` vs `last_login_at`

---

### featured_items table

**Schema COMPLETELY DIFFERENT!**

**In types.ts:**
- `credits_consumed`, `credits_used`, `daily_cost`, `entity_id`, `entity_type`, `featured_until`, `status`, `total_credits_allocated`, `version`

**In MIGRATION:**
- `auto_renewed`, `clicks_count`, `conversion_count`, `credits_per_day`, `end_date`, `is_active`, `item_id`, `item_type`, `position`, `start_date`, `total_credits_spent`, `updated_at`, `views_count`

**IMPACT:** Completely incompatible schemas! `entity_id` vs `item_id`, `entity_type` vs `item_type`

---

### messages table

**Missing in MIGRATION:**
- `message_text` (string) - **REQUIRED!**

**Extra in MIGRATION:**
- `content`, `is_system_message`, `metadata`, `read_at`, `recipient_id`, `shop_id`

**IMPACT:** Field renamed from `message_text` to `content`

---

### payment_requests table

**Missing in MIGRATION:**
- `completed_at`, `confirmation_notes`, `expires_at`, `payment_confirmed_at`, `payment_confirmed_by_shop`, `payment_screenshot_url`, `request_status`

**Extra in MIGRATION:**
- 20+ fields including: `admin_notes`, `customer_confirmation`, `customer_confirmed_at`, `customer_notes`, `customer_screenshot_url`, `dispute_raised_at`, `dispute_resolved_at`, `order_id`, `payment_completed_at`, `payment_initiated_at`, `payment_method`, `shop_confirmation`, `shop_confirmed_at`, `shop_notes`, `shop_screenshot_url`, `status`, `transaction_id`, `transaction_ref`, `verification_confidence`, `verification_evidence`, `verified_at`, `verified_by`

**IMPACT:** Migration has MUCH more detailed tracking than types.ts expects!

---

### shop_credits table

**Missing in MIGRATION:**
- `credits_expire_at` (string)
- `earned_from_customer_referrals` (number)
- `earned_from_shop_referrals` (number)
- `lifetime_credits_purchased` (number)

**Extra in MIGRATION:**
- `available_credits`, `last_deduction_at`, `total_earned`, `total_purchased`, `total_spent`

---

### user_favorites table

**Schema DIFFERENT!**

**In types.ts (specific):**
- `product_id` (nullable)
- `shop_id` (nullable)
- `updated_at`

**In MIGRATION (generic):**
- `item_id` (generic reference)
- `item_type` ('product' | 'shop' | 'offer')

**IMPACT:** Types.ts expects separate columns, migration uses polymorphic pattern

---

## Section 4: Missing ENUM Types

Several enum types exist in types.ts but may be missing or have incorrect values in MASTER_MIGRATION.sql:

### ENUMs in types.ts:
1. `alert_status` - active | acknowledged | resolved | dismissed
2. `alert_type` - info | warning | error | critical
3. `app_role` - customer | shop_owner | admin
4. `availability_status` - in_stock | low_stock | out_of_stock | discontinued
5. `contact_preference` - chat | phone | email
6. `contact_request_status` - new | in_progress | responded | closed
7. `content_status` - pending | approved | rejected | flagged
8. `coupon_type` - percentage | fixed_amount | bonus_credits
9. `credit_action_type` - add_product | add_offer | feature_shop | feature_product | feature_offer | shop_setup_complete | bulk_product_upload
10. `credit_transaction_type` - purchase | usage | refund | bonus | expiry | adjustment
11. `featured_item_status` - active | paused | completed | cancelled
12. `inquiry_status` - pending | quoted | accepted | rejected | completed | expired | in_progress
13. `message_type` - text | image | file | quote
14. `order_status` - pending | confirmed | preparing | ready | delivered | cancelled
15. `payment_status` - initiated | pending | success | failed | refunded
16. `payout_status` - pending | processing | completed | failed | cancelled
17. `referral_entity_type` - shop | customer
18. `referral_transaction_status` - pending | completed | cancelled
19. `shop_status` - pending | active | suspended | rejected | closed
20. `subscription_status` - active | cancelled | expired | suspended
21. `subscription_tier` - basic | premium | enterprise | free
22. `support_ticket_category` - payment_issues | technical_issues | account_verification | refunds_disputes | general_inquiry | shop_management | product_issues
23. `support_ticket_priority` - low | medium | high | urgent
24. `support_ticket_status` - open | in_progress | resolved | closed
25. `transaction_status` - pending | completed | failed | cancelled | refunded
26. `transaction_type` - order | refund | commission | payout | subscription | adjustment
27. `user_status` - active | inactive | suspended | banned
28. `verification_status` - pending | verified | rejected | requires_update

**Verification needed:** Check if all these exist in MASTER_MIGRATION.sql with correct values.

---

## Section 5: Tables Needing CREATE Statements

The following tables are completely missing from MASTER_MIGRATION.sql and need CREATE TABLE statements:

### 1. inventory_movements
```sql
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL, -- 'sale', 'restock', 'adjustment', 'return'
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at DESC);

COMMENT ON TABLE inventory_movements IS 'Tracks inventory changes for products';
```

### 2. product_stats
```sql
CREATE TABLE product_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_stats_product_id ON product_stats(product_id);

COMMENT ON TABLE product_stats IS 'Aggregated statistics for products';
```

### 3. referral_config
```sql
CREATE TABLE referral_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value NUMERIC(10,2) NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE referral_config IS 'System configuration for referral rewards';
```

### 4. review_helpfulness
```sql
CREATE TABLE review_helpfulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(review_id, user_id)
);

CREATE INDEX idx_review_helpfulness_review_id ON review_helpfulness(review_id);
CREATE INDEX idx_review_helpfulness_user_id ON review_helpfulness(user_id);

COMMENT ON TABLE review_helpfulness IS 'Tracks helpful votes on reviews';
```

### 5. review_reports
```sql
CREATE TABLE review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  report_reason VARCHAR(100) NOT NULL,
  report_details TEXT,
  report_status VARCHAR(50) DEFAULT 'pending',
  resolution_action VARCHAR(100),
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_review_reports_review_id ON review_reports(review_id);
CREATE INDEX idx_review_reports_status ON review_reports(report_status);

COMMENT ON TABLE review_reports IS 'Reports of inappropriate reviews';
```

### 6. review_templates
```sql
CREATE TABLE review_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  template_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_review_templates_category ON review_templates(category);
CREATE INDEX idx_review_templates_rating ON review_templates(rating);

COMMENT ON TABLE review_templates IS 'Quick review templates for users';
```

### 7. shop_categories
```sql
CREATE TABLE shop_categories (
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

CREATE INDEX idx_shop_categories_slug ON shop_categories(slug);
CREATE INDEX idx_shop_categories_display_order ON shop_categories(display_order);

COMMENT ON TABLE shop_categories IS 'Master list of shop categories';
```

### 8. shop_owner_profiles
```sql
CREATE TABLE shop_owner_profiles (
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

CREATE INDEX idx_shop_owner_profiles_user_id ON shop_owner_profiles(user_id);

COMMENT ON TABLE shop_owner_profiles IS 'Extended profile data for shop owners';
```

### 9. shop_payment_transactions
```sql
CREATE TABLE shop_payment_transactions (
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

CREATE INDEX idx_shop_payment_transactions_shop_id ON shop_payment_transactions(shop_id);
CREATE INDEX idx_shop_payment_transactions_customer_id ON shop_payment_transactions(customer_id);
CREATE INDEX idx_shop_payment_transactions_inquiry_id ON shop_payment_transactions(inquiry_id);
CREATE INDEX idx_shop_payment_transactions_status ON shop_payment_transactions(payment_status);

COMMENT ON TABLE shop_payment_transactions IS 'Payment transactions between customers and shops';
```

### 10. support_ticket_tags
```sql
CREATE TABLE support_ticket_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_support_ticket_tags_ticket_id ON support_ticket_tags(ticket_id);
CREATE INDEX idx_support_ticket_tags_tag ON support_ticket_tags(tag);

COMMENT ON TABLE support_ticket_tags IS 'Tags for support tickets';
```

---

## Section 6: Column Fixes Needed

Due to the extensive number of discrepancies, here are the CRITICAL ALTER TABLE statements needed:

### Fix users table
```sql
-- Add missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Migrate data if needed
UPDATE users SET name = full_name WHERE name IS NULL;
UPDATE users SET last_login = last_login_at WHERE last_login IS NULL;
```

### Fix inquiries table
```sql
-- Add missing columns
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS product_details TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS preferred_contact VARCHAR(50);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}'::text[];

-- Migrate data if needed
UPDATE inquiries SET product_name = title WHERE product_name IS NULL;
```

### Fix products table
```sql
-- Add missing columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_tracking BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS credits_cost INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Migrate data
UPDATE products SET stock_quantity = quantity WHERE stock_quantity IS NULL;
UPDATE products SET inventory_tracking = track_inventory WHERE inventory_tracking IS NULL;
UPDATE products SET cost_price = cost WHERE cost_price IS NULL;
```

### Fix shops table
```sql
-- Add payment-related columns
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_upi_id VARCHAR(100);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_qr_code_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_phone_number VARCHAR(20);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS preferred_payment_methods TEXT[] DEFAULT '{}'::text[];
ALTER TABLE shops ADD COLUMN IF NOT EXISTS accepts_online_payments BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Migrate qr_code_url to payment_qr_code_url
UPDATE shops SET payment_qr_code_url = qr_code_url WHERE payment_qr_code_url IS NULL;
```

### Fix messages table
```sql
-- Add missing column
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_text TEXT;

-- Migrate data
UPDATE messages SET message_text = content WHERE message_text IS NULL;
```

### Fix featured_items table
```sql
-- This table needs a complete restructure!
-- Option 1: Drop and recreate (if data is not critical)
DROP TABLE IF EXISTS featured_item_deductions CASCADE;
DROP TABLE IF EXISTS featured_items CASCADE;

CREATE TABLE featured_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('shop', 'product', 'offer')),
  featured_until TIMESTAMPTZ NOT NULL,
  daily_cost INTEGER NOT NULL,
  credits_used INTEGER DEFAULT 0,
  credits_consumed INTEGER DEFAULT 0,
  total_credits_allocated INTEGER,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'expired')),
  version INTEGER DEFAULT 1,
  last_deduction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_featured_items_shop_id ON featured_items(shop_id);
CREATE INDEX idx_featured_items_entity ON featured_items(entity_type, entity_id);
CREATE INDEX idx_featured_items_status ON featured_items(status);
CREATE INDEX idx_featured_items_featured_until ON featured_items(featured_until);
```

### Fix shop_credits table
```sql
-- Add missing columns
ALTER TABLE shop_credits ADD COLUMN IF NOT EXISTS credits_expire_at TIMESTAMPTZ;
ALTER TABLE shop_credits ADD COLUMN IF NOT EXISTS earned_from_customer_referrals INTEGER DEFAULT 0;
ALTER TABLE shop_credits ADD COLUMN IF NOT EXISTS earned_from_shop_referrals INTEGER DEFAULT 0;
ALTER TABLE shop_credits ADD COLUMN IF NOT EXISTS lifetime_credits_purchased INTEGER DEFAULT 0;

-- Migrate data
UPDATE shop_credits SET lifetime_credits_purchased = total_purchased WHERE lifetime_credits_purchased IS NULL;
```

### Fix user_favorites table
```sql
-- Option 1: Keep polymorphic structure but add specific columns
ALTER TABLE user_favorites ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE user_favorites ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE CASCADE;
ALTER TABLE user_favorites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Migrate data from polymorphic structure
UPDATE user_favorites SET product_id = item_id WHERE item_type = 'product';
UPDATE user_favorites SET shop_id = item_id WHERE item_type = 'shop';

-- Drop old columns (optional, or keep for backward compatibility)
-- ALTER TABLE user_favorites DROP COLUMN IF EXISTS item_id;
-- ALTER TABLE user_favorites DROP COLUMN IF EXISTS item_type;
```

---

## Section 7: Missing RLS Policies

Check that ALL tables in types.ts have corresponding RLS policies. Missing policies can cause permission issues.

Tables that definitely need RLS policies:
- `inventory_movements`
- `product_stats`
- `referral_config`
- `review_helpfulness`
- `review_reports`
- `review_templates`
- `shop_categories`
- `shop_owner_profiles`
- `shop_payment_transactions`
- `support_ticket_tags`

---

## Section 8: Priority Action Items

### HIGH PRIORITY (Must Fix Before Deployment):

1. ✅ Add all 10 missing table CREATE statements
2. ✅ Fix `users` table column mismatches (name vs full_name)
3. ✅ Fix `inquiries` table (add product_name, attachment_urls, etc.)
4. ✅ Fix `products` table (stock_quantity vs quantity)
5. ✅ Fix `shops` table (add payment columns)
6. ✅ Fix `messages` table (message_text vs content)
7. ✅ Restructure `featured_items` table completely
8. ✅ Fix `user_favorites` table (polymorphic vs specific columns)
9. ✅ Add `orders` and `order_items` to types.ts OR remove from migration
10. ✅ Verify all ENUM types exist and have correct values

### MEDIUM PRIORITY:

11. Fix `payment_requests` table column differences
12. Fix `shop_credits` table columns
13. Fix `inquiry_responses` table columns
14. Add RLS policies for all new tables
15. Add indexes for all foreign keys

### LOW PRIORITY:

16. Document why certain tables are in migration but not types (inquiry_shops, payment_disputes, etc.)
17. Clean up deprecated fields
18. Add triggers for new tables
19. Update functions to work with new schema

---

## Section 9: Recommended Approach

### Step 1: Create a New Migration File
Instead of modifying MASTER_MIGRATION.sql directly, create a new migration file:

**File:** `MASTER_MIGRATION_FIXES.sql`

This file should contain:
1. All missing CREATE TABLE statements
2. All ALTER TABLE statements to add missing columns
3. Data migration SQL to populate new columns from old ones
4. Missing RLS policies
5. Missing indexes

### Step 2: Test Migration Path
1. Create a fresh test database
2. Run MASTER_MIGRATION.sql
3. Run MASTER_MIGRATION_FIXES.sql
4. Generate types.ts from the resulting database
5. Compare with current types.ts

### Step 3: Validate Application
1. Run application against migrated database
2. Test all critical paths (inquiries, products, payments)
3. Verify no runtime errors

---

## Section 10: Questions for Team

1. **orders & order_items**: Why are these in the migration but not in types.ts? Are they actively used?
2. **inquiry_shops**: Is the multi-shop inquiry feature deprecated?
3. **payment_disputes & payment_follow_ups**: Are these features still needed?
4. **user_searches & wallet_transactions**: Are these legacy tables?
5. **featured_items**: Why is the schema so different? Which version is correct?
6. **Column naming**: Should we standardize on snake_case everywhere?
7. **Polymorphic vs Specific**: user_favorites uses different patterns in migration vs types

---

## Conclusion

The MASTER_MIGRATION.sql file is **significantly out of sync** with the actual database schema defined in types.ts. Running this migration on a production database would cause **critical application failures**.

**Immediate action required** to:
1. Add 10 missing tables
2. Fix column mismatches in 15+ critical tables
3. Restructure featured_items table
4. Verify all enum types
5. Add missing RLS policies

**Estimated effort:** 8-16 hours to fully reconcile the schemas.

**Risk level:** ⚠️ **CRITICAL** - Do not deploy MASTER_MIGRATION.sql as-is.
