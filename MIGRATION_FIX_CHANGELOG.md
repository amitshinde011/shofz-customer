# MASTER_MIGRATION_FIXES.sql - Changelog

## Version 1.0.3 - 2025-10-26

### Fixed

**Issue #3:** PL/pgSQL Verification Query Error
- **Error Message:** `ERROR: 42703: record "rec" has no field "table_name"`
- **State Code:** `42703`

**Root Cause:**
In the verification query at the end (SECTION 9), the code attempted to reuse the `rec` RECORD variable to store both table metadata and the count result. After executing `INTO rec`, the original fields like `table_name` were overwritten.

**Solution:**
Added a separate `row_count INTEGER` variable to store the count result, keeping `rec` intact for its table_name field.

**Changes Made:**
```sql
-- Before:
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT table_name FROM ...
  LOOP
    EXECUTE format('SELECT count(*) FROM %I', rec.table_name) INTO rec;
    RAISE NOTICE '% : % rows', rec.table_name, rec.count;  -- ERROR: rec.table_name no longer exists
  END LOOP;
END $$;

-- After:
DECLARE
  rec RECORD;
  row_count INTEGER;  -- New variable
BEGIN
  FOR rec IN SELECT table_name FROM ...
  LOOP
    EXECUTE format('SELECT count(*) FROM %I', rec.table_name) INTO row_count;
    RAISE NOTICE '% : % rows', rec.table_name, row_count;  -- Works correctly
  END LOOP;
END $$;
```

---

## Version 1.0.2 - 2025-10-26

### Fixed

**Issue #2:** `is_admin()` Function Ambiguity Error
- **Error Message:** `ERROR: 42725: function is_admin() is not unique. Could not choose a best candidate function. You might need to add explicit type casts.`
- **State Code:** `42725`

**Root Cause:**
The RLS policies were calling `is_admin()` without parameters, but the function is defined as `is_admin(user_uuid UUID DEFAULT NULL)`. PostgreSQL couldn't determine which overload to use when called without arguments.

**Solution:**
Updated all `is_admin()` calls in RLS policies to explicitly pass `auth.uid()` as the parameter.

**Changes Made:**
- Fixed 9 RLS policy statements across 8 new tables
- Changed all `is_admin()` to `is_admin(auth.uid())`
- Affected tables: `product_stats`, `referral_config`, `review_reports`, `review_templates`, `shop_categories`, `shop_owner_profiles`, `shop_payment_transactions`, `support_ticket_tags`

**Example Fix:**
```sql
-- Before:
CREATE POLICY "Only admins can modify referral config"
  ON referral_config FOR ALL
  USING (is_admin());

-- After:
CREATE POLICY "Only admins can modify referral config"
  ON referral_config FOR ALL
  USING (is_admin(auth.uid()));
```

---

## Version 1.0.1 - 2025-10-26

### Fixed

**Issue #1:** `ON CONFLICT` SQL Error
- **Error Message:** `ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification`
- **State Code:** `42P10`

**Root Cause:**
The original script used `ON CONFLICT (column_name) DO NOTHING` syntax, which requires the table to be created AND have a unique constraint on that column. Since we're using `CREATE TABLE IF NOT EXISTS`, the constraint might not exist when the INSERT runs.

**Solution:**
Replaced all `ON CONFLICT` clauses with `INSERT ... SELECT ... WHERE NOT EXISTS` pattern for idempotent inserts.

### Changes Made

#### 1. referral_config table inserts (Lines 76-86)
**Before:**
```sql
INSERT INTO referral_config (config_key, config_value, description) VALUES
  ('referrer_reward_credits', 100, '...'),
  ('referee_reward_credits', 50, '...'),
  ('min_transaction_amount', 100, '...')
ON CONFLICT (config_key) DO NOTHING;
```

**After:**
```sql
INSERT INTO referral_config (config_key, config_value, description)
SELECT 'referrer_reward_credits', 100, '...'
WHERE NOT EXISTS (SELECT 1 FROM referral_config WHERE config_key = 'referrer_reward_credits');

INSERT INTO referral_config (config_key, config_value, description)
SELECT 'referee_reward_credits', 50, '...'
WHERE NOT EXISTS (SELECT 1 FROM referral_config WHERE config_key = 'referee_reward_credits');

INSERT INTO referral_config (config_key, config_value, description)
SELECT 'min_transaction_amount', 100, '...'
WHERE NOT EXISTS (SELECT 1 FROM referral_config WHERE config_key = 'min_transaction_amount');
```

#### 2. review_templates table inserts (Lines 147-165)
**Before:**
```sql
INSERT INTO review_templates (category, rating, template_text) VALUES
  ('excellent_service', 5, '...'),
  ('good_quality', 4, '...'),
  -- ... more rows
ON CONFLICT DO NOTHING;
```

**After:**
```sql
INSERT INTO review_templates (category, rating, template_text)
SELECT 'excellent_service', 5, '...'
WHERE NOT EXISTS (SELECT 1 FROM review_templates WHERE category = 'excellent_service' AND rating = 5);
-- Repeated for each template with proper WHERE clause
```

#### 3. shop_categories table inserts (Lines 189-227)
**Before:**
```sql
INSERT INTO shop_categories (name, slug, description, display_order) VALUES
  ('Electronics', 'electronics', '...', 1),
  ('Fashion', 'fashion', '...', 2),
  -- ... more rows
ON CONFLICT (name) DO NOTHING;
```

**After:**
```sql
INSERT INTO shop_categories (name, slug, description, display_order)
SELECT 'Electronics', 'electronics', '...', 1
WHERE NOT EXISTS (SELECT 1 FROM shop_categories WHERE slug = 'electronics');
-- Repeated for each category
```

### Benefits of This Approach

1. **No Constraint Dependency:** Works regardless of when constraints are created
2. **Fully Idempotent:** Can run multiple times safely without errors
3. **Better Performance:** Direct existence check is often faster than constraint violation handling
4. **More Explicit:** Clear intent of "insert only if doesn't exist"
5. **Compatible:** Works with PostgreSQL 9.5+ (older than ON CONFLICT which needs 9.5+)

### Testing

To verify the fix works:

```sql
-- Run the script once
\i MASTER_MIGRATION_FIXES.sql

-- Verify data inserted
SELECT * FROM referral_config;
SELECT * FROM review_templates;
SELECT * FROM shop_categories;

-- Run the script again (should not error)
\i MASTER_MIGRATION_FIXES.sql

-- Verify row counts haven't changed (idempotent)
SELECT COUNT(*) FROM referral_config;  -- Should be 3
SELECT COUNT(*) FROM review_templates; -- Should be 5
SELECT COUNT(*) FROM shop_categories;  -- Should be 10
```

### Migration Instructions

1. **Backup your database first!**
   ```bash
   pg_dump your_database > backup_before_migration.sql
   ```

2. **Run MASTER_MIGRATION.sql** (if not already done)
   ```bash
   psql -d your_database -f MASTER_MIGRATION.sql
   ```

3. **Run the fixed MASTER_MIGRATION_FIXES.sql**
   ```bash
   psql -d your_database -f MASTER_MIGRATION_FIXES.sql
   ```

4. **Verify success**
   ```sql
   -- Check all new tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;

   -- Check new columns added
   SELECT table_name, column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public'
   AND column_name IN ('name', 'phone', 'product_name', 'stock_quantity')
   ORDER BY table_name, column_name;
   ```

### Notes

- All three INSERT sections have been updated to use the safer pattern
- No functional changes to the migration logic
- All other parts of the script remain unchanged
- The script is now fully idempotent and can be safely re-run

### Related Files

- Main fix file: `MASTER_MIGRATION_FIXES.sql`
- Original analysis: `SCHEMA_COMPARISON_REPORT.md`
- Deployment guide: `MIGRATION_QUICK_START.md`
