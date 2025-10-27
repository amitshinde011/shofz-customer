# MASTER_MIGRATION_FIXES.sql - Summary

## Current Version: 1.0.3 (2025-10-26)

### Status: ✅ READY FOR DEPLOYMENT

All known SQL syntax errors have been resolved. The migration script is now ready for testing and deployment.

---

## Issues Fixed

### ✅ Issue #1: ON CONFLICT Error (v1.0.1)
**Error:** `ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification`

**Fixed in:** 3 locations
- `referral_config` inserts (3 rows)
- `review_templates` inserts (5 rows)
- `shop_categories` inserts (10 rows)

**Solution:** Replaced `INSERT ... VALUES ... ON CONFLICT` with `INSERT ... SELECT ... WHERE NOT EXISTS` pattern

---

### ✅ Issue #2: is_admin() Function Ambiguity (v1.0.2)
**Error:** `ERROR: 42725: function is_admin() is not unique`

**Fixed in:** 9 RLS policy statements across 8 tables
- product_stats (1 policy)
- referral_config (1 policy)
- review_reports (2 policies)
- review_templates (2 policies)
- shop_categories (2 policies)
- shop_owner_profiles (1 policy)
- shop_payment_transactions (1 policy)
- support_ticket_tags (2 policies)

**Solution:** Changed all `is_admin()` to `is_admin(auth.uid())`

---

### ✅ Issue #3: PL/pgSQL Verification Query Error (v1.0.3)
**Error:** `ERROR: 42703: record "rec" has no field "table_name"`

**Fixed in:** SECTION 9 verification query

**Root Cause:** The code tried to reuse the `rec` RECORD variable to store both table metadata and count results, causing the original `table_name` field to be lost.

**Solution:** Added a separate `row_count INTEGER` variable to store the count, keeping `rec` intact for table metadata.

---

## What This Migration Does

### 1. Creates 10 New Tables
- `inventory_movements` - Track product stock changes
- `product_stats` - Pre-calculated product analytics
- `referral_config` - System-wide referral settings
- `review_helpfulness` - User votes on reviews
- `review_reports` - Flagged inappropriate reviews
- `review_templates` - Quick review options
- `shop_categories` - Master category list
- `shop_owner_profiles` - Extended owner information
- `shop_payment_transactions` - Direct payment records
- `support_ticket_tags` - Support ticket tagging

### 2. Adds Missing Columns to Existing Tables
- **users**: `name`, `phone`, `profile_image_url`, `email_verified_at`, `last_login`, `is_active`
- **inquiries**: `product_name`, `product_details`, `image_url`, `preferred_contact`, `attachment_urls`
- **inquiry_responses**: `estimated_delivery_days`, `payment_request_expires_at`, `payment_status`, `response_message`, `response_type`
- **products**: `brand`, `cost_price`, `stock_quantity`, `inventory_tracking`, `credits_cost`, `featured_until`, `is_active`
- **shops**: `payment_upi_id`, `payment_qr_code_url`, `payment_phone_number`, `payment_instructions`, `preferred_payment_methods`, `accepts_online_payments`, `featured_until`, `search_vector`
- **messages**: `message_text`
- **payment_requests**: `completed_at`, `confirmation_notes`, `expires_at`, `payment_confirmed_at`, `payment_confirmed_by_shop`, `payment_screenshot_url`, `request_status`
- **payment_transactions**: `final_amount`, `name`, `plan_id`
- **offers**: `applicable_to`, `discount_percentage`, `featured_until`, `is_active`, `offer_type`, `terms_conditions`
- **shop_credits**: `credits_expire_at`, `earned_from_customer_referrals`, `earned_from_shop_referrals`, `lifetime_credits_purchased`
- **user_favorites**: `product_id`, `shop_id`, `updated_at`
- **user_roles**: `role_data`, `updated_at`
- **reviews**: `customer_id`, `is_verified`
- **shop_reviews**: `customer_id`, `inquiry_id`, `is_anonymous`, `is_verified_purchase`, `price_rating`, `rating`, `review_images`, `review_status`, `shop_response_at`
- **shop_review_stats**: `avg_price`, `last_review_at`, `last_updated`, `reviews_with_images_count`, `reviews_with_response_count`, `verified_reviews_count`
- And more...

### 3. Migrates Data from Old Columns to New Columns
Preserves existing data by copying from old column names to new ones:
- `full_name` → `name`
- `last_login_at` → `last_login`
- `phone_number` → `phone`
- `quantity` → `stock_quantity`
- `track_inventory` → `inventory_tracking`
- `content` → `message_text`
- And many more...

### 4. Restructures featured_items Table
Complete drop and recreate with new schema to match types.ts expectations.

### 5. Creates Missing ENUM Types
Adds 11 ENUM types if they don't exist:
- `availability_status`, `contact_preference`, `coupon_type`, `credit_transaction_type`, `featured_item_status`, `message_type`, `order_status`, `payment_status`, `referral_entity_type`, `referral_transaction_status`, `support_ticket_category`

### 6. Adds RLS Policies
Complete Row Level Security policies for all 10 new tables with proper access controls.

### 7. Creates Triggers
Auto-update triggers for `updated_at` columns on 5 tables, plus shop search vector auto-update trigger.

### 8. Implements Full-Text Search
Adds `search_vector` column to shops table with automatic updates via trigger.

---

## Pre-Deployment Checklist

Before running this migration in production:

- [ ] **Backup database**
  ```bash
  pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Run MASTER_MIGRATION.sql first** (if not already done)
  - This creates the base schema

- [ ] **Test in development/staging environment**
  - Create test database
  - Run MASTER_MIGRATION.sql
  - Run MASTER_MIGRATION_FIXES.sql
  - Verify no errors
  - Check row counts
  - Test application functionality

- [ ] **Review generated data**
  - 3 referral config records
  - 5 review template records
  - 10 shop category records

- [ ] **Verify function exists**
  ```sql
  SELECT * FROM pg_proc WHERE proname = 'is_admin';
  ```

- [ ] **Check for naming conflicts**
  ```sql
  -- Check if any tables will be dropped
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('featured_items', 'featured_item_deductions');
  ```

---

## Deployment Instructions

### Development/Staging
```bash
# 1. Backup
pg_dump your_database > backup_before_fixes.sql

# 2. Run migration
psql -d your_database -f MASTER_MIGRATION_FIXES.sql

# 3. Verify
psql -d your_database -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

### Production
```bash
# 1. Schedule maintenance window (estimate 10-30 minutes depending on data size)

# 2. Full backup with compression
pg_dump -Fc your_database > backup_production_$(date +%Y%m%d_%H%M%S).dump

# 3. Run migration with timing
psql -d your_database -f MASTER_MIGRATION_FIXES.sql 2>&1 | tee migration_$(date +%Y%m%d_%H%M%S).log

# 4. Verify critical tables exist
psql -d your_database -c "SELECT COUNT(*) FROM shop_categories;" # Should be 10
psql -d your_database -c "SELECT COUNT(*) FROM referral_config;" # Should be 3
psql -d your_database -c "SELECT COUNT(*) FROM review_templates;" # Should be 5

# 5. Check for column additions
psql -d your_database -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('name', 'phone', 'is_active');"

# 6. Test application critical paths
# - User login
# - Product browsing
# - Inquiry creation
# - Shop search
```

---

## Post-Deployment Verification

Run these queries to verify the migration succeeded:

```sql
-- 1. Check new tables exist and have correct row counts
SELECT
  table_name,
  (SELECT COUNT(*) FROM inventory_movements) as inventory_movements_count,
  (SELECT COUNT(*) FROM product_stats) as product_stats_count,
  (SELECT COUNT(*) FROM referral_config) as referral_config_count,
  (SELECT COUNT(*) FROM review_helpfulness) as review_helpfulness_count,
  (SELECT COUNT(*) FROM review_reports) as review_reports_count,
  (SELECT COUNT(*) FROM review_templates) as review_templates_count,
  (SELECT COUNT(*) FROM shop_categories) as shop_categories_count,
  (SELECT COUNT(*) FROM shop_owner_profiles) as shop_owner_profiles_count,
  (SELECT COUNT(*) FROM shop_payment_transactions) as shop_payment_transactions_count,
  (SELECT COUNT(*) FROM support_ticket_tags) as support_ticket_tags_count
FROM information_schema.tables
WHERE table_schema = 'public'
LIMIT 1;

-- 2. Verify data migration worked
SELECT
  COUNT(*) as total_users,
  COUNT(name) as users_with_name,
  COUNT(phone) as users_with_phone,
  COUNT(is_active) as users_with_is_active
FROM users;

SELECT
  COUNT(*) as total_products,
  COUNT(stock_quantity) as products_with_stock_quantity,
  COUNT(inventory_tracking) as products_with_inventory_tracking
FROM products;

-- 3. Check RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'inventory_movements', 'product_stats', 'referral_config',
  'review_helpfulness', 'review_reports', 'review_templates',
  'shop_categories', 'shop_owner_profiles', 'shop_payment_transactions',
  'support_ticket_tags'
)
ORDER BY tablename, policyname;

-- 4. Verify triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN (
  'product_stats', 'shop_categories', 'shop_owner_profiles',
  'shop_payment_transactions', 'user_favorites', 'shops'
)
ORDER BY event_object_table;

-- 5. Check shop search vectors are populated
SELECT COUNT(*) as shops_with_search_vector
FROM shops
WHERE search_vector IS NOT NULL;
```

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback (if migration fails mid-way)
```sql
ROLLBACK; -- Only works if migration is still in transaction
```

### Full Rollback (if migration completed but issues found)
```bash
# 1. Stop application traffic

# 2. Restore from backup
pg_restore -d your_database backup_production_YYYYMMDD_HHMMSS.dump

# OR if using SQL backup:
psql -d your_database < backup_production_YYYYMMDD_HHMMSS.sql

# 3. Verify restoration
psql -d your_database -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

# 4. Resume application traffic
```

### Partial Rollback (keep new tables but revert column changes)
```sql
-- Drop new tables
DROP TABLE IF EXISTS support_ticket_tags CASCADE;
DROP TABLE IF EXISTS shop_payment_transactions CASCADE;
DROP TABLE IF EXISTS shop_owner_profiles CASCADE;
DROP TABLE IF EXISTS shop_categories CASCADE;
DROP TABLE IF EXISTS review_templates CASCADE;
DROP TABLE IF EXISTS review_reports CASCADE;
DROP TABLE IF EXISTS review_helpfulness CASCADE;
DROP TABLE IF EXISTS referral_config CASCADE;
DROP TABLE IF EXISTS product_stats CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;

-- Drop new columns (example for users table)
ALTER TABLE users DROP COLUMN IF EXISTS name;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
-- ... repeat for other tables
```

---

## Known Limitations

1. **featured_items data loss**: The old `featured_items` table is backed up to `featured_items_backup`, but data is not automatically migrated due to schema incompatibility. Manual data migration required if needed.

2. **Backward compatibility**: Old column names remain in place alongside new ones for gradual migration. Application must be updated to use new column names.

3. **Performance impact**: Adding columns and indexes on large tables may cause temporary slowdown during migration.

4. **RLS policy changes**: New policies may affect existing application behavior if not thoroughly tested.

---

## Support & Troubleshooting

### Common Issues

**Issue:** Migration hangs on UPDATE statements
- **Cause:** Large tables taking time to update
- **Solution:** Be patient, or add `WHERE` clauses to process in batches

**Issue:** Foreign key constraint violations
- **Cause:** Referenced tables don't exist
- **Solution:** Ensure MASTER_MIGRATION.sql ran successfully first

**Issue:** is_admin() errors persist
- **Cause:** Function not created properly in MASTER_MIGRATION.sql
- **Solution:** Check function exists: `SELECT * FROM pg_proc WHERE proname = 'is_admin'`

**Issue:** Trigger errors
- **Cause:** `update_updated_at_column()` function doesn't exist
- **Solution:** Verify MASTER_MIGRATION.sql created all helper functions

---

## Related Documentation

- **SCHEMA_COMPARISON_REPORT.md** - Detailed analysis of all schema differences
- **MIGRATION_FIX_CHANGELOG.md** - Version history and detailed changes
- **MIGRATION_QUICK_START.md** - Quick deployment guide
- **MASTER_MIGRATION.sql** - Base schema migration (must run first)
- **MASTER_MIGRATION_FIXES.sql** - This fixes script

---

## Version History

- **v1.0.3** (2025-10-26) - Fixed PL/pgSQL verification query error
- **v1.0.2** (2025-10-26) - Fixed is_admin() function ambiguity
- **v1.0.1** (2025-10-26) - Fixed ON CONFLICT errors
- **v1.0.0** (2025-10-26) - Initial comprehensive schema fixes

---

**Questions or Issues?**
Review the SCHEMA_COMPARISON_REPORT.md for detailed analysis, or consult the MIGRATION_FIX_CHANGELOG.md for specific changes made.
