# Migration Quick Start Guide

## Overview
This guide helps you apply the schema fixes to sync MASTER_MIGRATION.sql with the actual application schema (types.ts).

## Files Generated
1. **SCHEMA_COMPARISON_REPORT.md** - Detailed analysis of all discrepancies
2. **MASTER_MIGRATION_FIXES.sql** - SQL script to fix all issues
3. **MIGRATION_QUICK_START.md** - This quick start guide

## Critical Issues Found
- **13 tables completely missing** from MASTER_MIGRATION.sql
- **Hundreds of column mismatches** across 42 tables
- **featured_items table completely incompatible** between migration and types
- **Field naming inconsistencies** (e.g., `name` vs `full_name`, `quantity` vs `stock_quantity`)

## Quick Fix (Development)

### Option 1: Fresh Database
If you're setting up a fresh database:

```bash
# 1. Run the original migration
psql -d your_database -f MASTER_MIGRATION.sql

# 2. Apply the fixes
psql -d your_database -f MASTER_MIGRATION_FIXES.sql

# 3. Verify
psql -d your_database -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### Option 2: Existing Database
If you have an existing database that was created with MASTER_MIGRATION.sql:

```bash
# Just apply the fixes
psql -d your_database -f MASTER_MIGRATION_FIXES.sql
```

**Warning:** The fixes script will:
- Drop and recreate the `featured_items` table (backs up data first)
- Add many new columns to existing tables
- Migrate data from old column names to new ones

## Verification Steps

### 1. Check Table Count
```sql
SELECT count(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';
```
Expected: ~55 tables

### 2. Check for Missing Tables
```sql
SELECT table_name FROM information_schema.tables
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
ORDER BY table_name;
```
Expected: 10 rows

### 3. Check Critical Columns
```sql
-- Users table
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('name', 'phone', 'is_active', 'last_login')
ORDER BY column_name;

-- Products table
SELECT column_name FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('stock_quantity', 'inventory_tracking', 'featured_until', 'is_active')
ORDER BY column_name;

-- Shops table
SELECT column_name FROM information_schema.columns
WHERE table_name = 'shops'
AND column_name IN ('payment_upi_id', 'payment_qr_code_url', 'search_vector')
ORDER BY column_name;
```

### 4. Check RLS Policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN (
  'inventory_movements',
  'product_stats',
  'shop_payment_transactions'
)
ORDER BY tablename;
```

## Supabase Integration

If using Supabase:

### 1. Apply Migration via Supabase CLI
```bash
# Create a new migration
supabase migration new fix_schema_discrepancies

# Copy MASTER_MIGRATION_FIXES.sql content to the new migration file
# Then apply it
supabase db push
```

### 2. Regenerate Types
```bash
# Generate new TypeScript types
supabase gen types typescript --local > src/integrations/supabase/types_new.ts

# Compare with current types.ts
diff src/integrations/supabase/types.ts src/integrations/supabase/types_new.ts

# If satisfied, replace
mv src/integrations/supabase/types_new.ts src/integrations/supabase/types.ts
```

## Testing After Migration

### 1. Database Connectivity
```typescript
// Test basic query
const { data, error } = await supabase
  .from('users')
  .select('id, name, email')
  .limit(1);

console.log('Connection test:', { data, error });
```

### 2. Critical Paths
Test these application features:
- [ ] User registration/login
- [ ] Shop creation
- [ ] Product listing
- [ ] Create inquiry
- [ ] Send message
- [ ] Payment flow
- [ ] Reviews
- [ ] Featured items

### 3. Schema Validation
```typescript
// Verify expected columns exist
const tableTests = [
  { table: 'users', columns: ['name', 'phone', 'is_active'] },
  { table: 'products', columns: ['stock_quantity', 'inventory_tracking'] },
  { table: 'shops', columns: ['payment_upi_id', 'payment_qr_code_url'] },
  { table: 'inquiries', columns: ['product_name', 'attachment_urls'] },
];

for (const test of tableTests) {
  const { data, error } = await supabase
    .from(test.table)
    .select(test.columns.join(','))
    .limit(0);

  console.log(`${test.table}:`, error ? 'FAILED' : 'OK');
}
```

## Known Issues & Workarounds

### Issue 1: orders and order_items tables
**Problem:** These tables exist in MASTER_MIGRATION.sql but NOT in types.ts

**Resolution Options:**
1. **If orders are used**: Add to types.ts manually or regenerate from DB
2. **If deprecated**: Drop the tables from MASTER_MIGRATION.sql

**Temporary Fix:**
```sql
-- Check if tables have data
SELECT count(*) FROM orders;
SELECT count(*) FROM order_items;

-- If empty and not needed, drop them
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
```

### Issue 2: Column name duplicates
**Problem:** Some tables now have both old and new column names (e.g., `full_name` and `name`)

**Resolution:** The migration keeps both for backward compatibility. After verifying the application works:
```sql
-- Example: Remove old columns after migration is stable
ALTER TABLE users DROP COLUMN IF EXISTS full_name;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
-- etc.
```

### Issue 3: featured_items data loss
**Problem:** The featured_items table is dropped and recreated

**Resolution:** The script creates `featured_items_backup` before dropping. After migration:
```sql
-- Check backup
SELECT count(*) FROM featured_items_backup;

-- If needed, manually migrate important data
-- INSERT INTO featured_items (...)
-- SELECT ... FROM featured_items_backup ...
```

## Rollback Plan

If something goes wrong:

### Option 1: Database Backup
```bash
# Before migration
pg_dump your_database > backup_before_fixes.sql

# Rollback
psql your_database < backup_before_fixes.sql
```

### Option 2: Selective Rollback
```sql
-- Drop new tables
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS product_stats CASCADE;
-- ... etc for all new tables

-- Restore featured_items from backup
DROP TABLE IF EXISTS featured_items CASCADE;
-- Restore from featured_items_backup or re-run MASTER_MIGRATION.sql
```

## Performance Considerations

### Index Creation
The fixes add many indexes. On large tables, this may take time:
```sql
-- Check index creation progress
SELECT * FROM pg_stat_progress_create_index;
```

### Search Vector Updates
Populating search_vector for all shops may be slow:
```sql
-- Check progress
SELECT count(*) as total,
       count(search_vector) as populated
FROM shops;
```

## Production Deployment

**DO NOT** run this migration directly on production without:

1. **Testing in staging** with production-like data volume
2. **Creating full database backup**
3. **Planning maintenance window** (expect 5-30 minutes depending on data size)
4. **Having rollback plan ready**
5. **Testing critical paths** after migration

### Recommended Production Steps
```bash
# 1. Backup
pg_dump production_db > prod_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Maintenance mode
# (Set your application to maintenance mode)

# 3. Apply migration
psql production_db -f MASTER_MIGRATION_FIXES.sql

# 4. Verify
psql production_db -f verify_migration.sql

# 5. Test
# (Run smoke tests)

# 6. Go live
# (Remove maintenance mode)

# 7. Monitor
# (Watch logs for errors)
```

## Support & Questions

### Common Questions

**Q: Will this break my existing application?**
A: The migration is designed to be backward compatible by keeping old columns. However, test thoroughly in development first.

**Q: How long will the migration take?**
A: Depends on data volume:
- Empty DB: < 1 minute
- Small (< 10k rows/table): 1-5 minutes
- Medium (< 100k rows): 5-15 minutes
- Large (> 100k rows): 15-30+ minutes

**Q: Can I run the migration multiple times?**
A: Yes, most operations use `IF NOT EXISTS` or `IF NOT NULL` checks. However, the featured_items drop/recreate will lose data each time.

**Q: Do I need to update my application code?**
A: Only if you were directly using old column names. The migration provides both old and new columns for transition period.

## Next Steps

1. ✅ Read SCHEMA_COMPARISON_REPORT.md for details
2. ✅ Review MASTER_MIGRATION_FIXES.sql
3. ✅ Test in development environment
4. ✅ Update application code if needed
5. ✅ Plan production deployment
6. ✅ Execute migration
7. ✅ Verify and monitor

---

**Last Updated:** 2025-10-26
**Version:** 1.0.0
**Status:** Ready for Testing
