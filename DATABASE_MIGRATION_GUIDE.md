# LocalConnect Database Migration Guide

## Overview

This guide will help you set up a complete, working LocalConnect database from scratch using the consolidated `MASTER_MIGRATION.sql` script.

## What's Included

The master migration script consolidates **126+ individual migration files** into a single, conflict-free SQL script that creates:

- ✅ **24 ENUM types** for type safety
- ✅ **60+ tables** with all columns and relationships
- ✅ **100+ indexes** for performance
- ✅ **10+ functions** for business logic
- ✅ **30+ triggers** for automation
- ✅ **250+ RLS policies** for security
- ✅ **Storage buckets** and policies
- ✅ **Seed data** for platform settings

## Files Created

### 1. `DATABASE_ISSUES_ANALYSIS.md`
Complete analysis of issues found in your 126 migration files, including:
- Dependency order problems
- Duplicate definitions
- Schema inconsistencies
- RLS policy conflicts
- Function signature mismatches
- Recommendations for fixes

### 2. `MASTER_MIGRATION.sql`
Single comprehensive migration script that:
- Creates entire database in correct dependency order
- Resolves all conflicts from individual migrations
- Includes all features from all 126 migrations
- Properly documented and commented
- Ready to run on fresh Supabase database

### 3. `DATABASE_MIGRATION_GUIDE.md` (this file)
Step-by-step instructions for applying the migration

## Prerequisites

Before running the migration, ensure you have:

1. **Supabase Project**: A fresh Supabase project (recommended) or existing project with backed-up data
2. **Supabase CLI**: Install via `npm install -g supabase`
3. **PostgreSQL Client** (optional): For direct database access
4. **Database Backup**: If running on existing project, backup your data first

## Migration Methods

### Method 1: Via Supabase Dashboard (Recommended for Fresh Projects)

1. **Create New Supabase Project**:
   - Go to https://app.supabase.com
   - Click "New Project"
   - Choose region, database password, and project name
   - Wait for project to be ready

2. **Open SQL Editor**:
   - In your Supabase dashboard
   - Click "SQL Editor" in sidebar
   - Click "New Query"

3. **Copy Migration Script**:
   - Open `MASTER_MIGRATION.sql`
   - Copy entire contents (it's large, ~3000+ lines)
   - Paste into SQL Editor

4. **Execute Migration**:
   - Click "Run" button
   - Wait for execution (may take 2-5 minutes)
   - Check for any errors in output

5. **Verify Success**:
   ```sql
   -- Check tables created
   SELECT count(*) FROM information_schema.tables
   WHERE table_schema = 'public';
   -- Should return 60+

   -- Check RLS enabled
   SELECT count(*) FROM pg_tables
   WHERE schemaname = 'public' AND rowsecurity = true;
   -- Should return 60+

   -- Check functions
   SELECT count(*) FROM pg_proc
   WHERE pronamespace = 'public'::regnamespace;
   -- Should return 10+
   ```

### Method 2: Via Supabase CLI (Recommended for Development)

1. **Initialize Supabase Locally**:
   ```bash
   # In your project directory
   supabase init
   ```

2. **Link to Remote Project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Copy Migration**:
   ```bash
   # Copy master migration to migrations folder
   cp MASTER_MIGRATION.sql supabase/migrations/20251024000000_master_migration.sql
   ```

4. **Push Migration**:
   ```bash
   # Push to remote database
   supabase db push

   # Or run locally first
   supabase start
   supabase db reset  # Applies all migrations
   ```

5. **Verify**:
   ```bash
   supabase db diff  # Should show no changes if successful
   ```

### Method 3: Direct PostgreSQL Connection

1. **Get Connection String**:
   - From Supabase dashboard: Settings → Database
   - Copy "Connection string" (URI format)
   - Replace `[YOUR-PASSWORD]` with your database password

2. **Connect via psql**:
   ```bash
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
   ```

3. **Run Migration**:
   ```sql
   \i /path/to/MASTER_MIGRATION.sql
   ```

4. **Exit**:
   ```sql
   \q
   ```

## Post-Migration Steps

### 1. Configure Realtime

Enable realtime for these tables in Supabase Dashboard:

1. Go to Database → Replication
2. Enable replication for:
   - `messages` (for chat)
   - `notifications` (for real-time notifications)
   - `inquiries` (for status updates)
   - `orders` (for order tracking)
   - `payment_requests` (for payment status)

### 2. Set Up Authentication

1. **Enable Auth Providers**:
   - Go to Authentication → Providers
   - Enable:
     - Phone (for OTP)
     - Email (optional)
     - OAuth providers (optional)

2. **Configure Phone Auth**:
   - Choose SMS provider (Twilio, MessageBird, etc.)
   - Add API credentials
   - Configure phone templates

3. **Update Email Templates**:
   - Go to Authentication → Email Templates
   - Customize confirmation, reset password templates

### 3. Configure Storage

The migration creates storage buckets, but you may need to verify:

1. **Check Buckets Created**:
   - Go to Storage
   - Verify buckets exist:
     - `shop-assets` (public)
     - `products` (public)
     - `avatars` (public)
     - `payment-evidence` (private)
     - `documents` (private)

2. **If Buckets Missing**:
   ```sql
   -- Run this in SQL Editor
   INSERT INTO storage.buckets (id, name, public) VALUES
     ('shop-assets', 'shop-assets', true),
     ('products', 'products', true),
     ('avatars', 'avatars', true),
     ('payment-evidence', 'payment-evidence', false),
     ('documents', 'documents', false)
   ON CONFLICT DO NOTHING;
   ```

### 4. Update Platform Settings

Review and customize platform settings:

```sql
-- View current settings
SELECT * FROM platform_settings;

-- Update commission rate
UPDATE platform_settings
SET value = '{"default": 12, "min": 8, "max": 25}'::jsonb
WHERE key = 'commission_rate';

-- Update payment limits
UPDATE platform_settings
SET value = '{"daily_limit": 50000, "per_transaction_min": 100, "per_transaction_max": 200000}'::jsonb
WHERE key = 'payment_limits';
```

### 5. Create Admin User

```sql
-- First, create user via Supabase Auth Dashboard or your app
-- Then, promote to admin:

UPDATE users
SET role = 'admin',
    status = 'active'
WHERE email = 'admin@yourdomain.com';
```

### 6. Test RLS Policies

Test that RLS is working correctly:

```javascript
// In your app or via Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test 1: Anon user can view active shops
const { data: shops } = await supabase
  .from('shops')
  .select('*')
  .eq('is_active', true);

console.log('Public shops:', shops?.length);

// Test 2: User can only see own profile
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id);

console.log('Own profile:', profile);
```

### 7. Seed Initial Data (Optional)

Add initial categories, featured content, etc.:

```sql
-- Add product categories (customize for your needs)
-- These can be stored in a separate categories table or used as constants

-- Example: Add a demo shop (for testing)
INSERT INTO users (email, full_name, role, phone_number, status)
VALUES ('demo@shop.com', 'Demo Shop Owner', 'shop_owner', '+1234567890', 'active')
RETURNING id;

-- The trigger will automatically create a shop for the shop_owner
```

### 8. Configure Monitoring

Set up monitoring for production:

1. **Enable Supabase Metrics**:
   - Database health
   - API usage
   - Auth events

2. **Set Up Alerts**:
   - Database size threshold
   - Error rate spikes
   - Slow queries

3. **Configure Logging**:
   - Enable API logs
   - Set retention period

## Verifying the Migration

Run these queries to verify everything is set up correctly:

```sql
-- 1. Check extensions
SELECT * FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm', 'pgcrypto');
-- Should return 3 rows

-- 2. Check ENUM types
SELECT count(*) FROM pg_type WHERE typcategory = 'E' AND typnamespace = 'public'::regnamespace;
-- Should return 24

-- 3. Check tables
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Should return 60+ tables

-- 4. Check RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Should return 0 rows (all tables should have RLS)

-- 5. Check indexes
SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';
-- Should return 100+

-- 6. Check functions
SELECT proname, prosrc FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;
-- Should return functions like get_nearby_shops, is_admin, etc.

-- 7. Check triggers
SELECT tgname, tgrelid::regclass FROM pg_trigger
WHERE tgrelid::regclass::text LIKE 'public.%';
-- Should return 30+ triggers

-- 8. Check seed data
SELECT * FROM platform_settings;
-- Should return 8 settings

SELECT * FROM credit_costs;
-- Should return 6 cost definitions

SELECT * FROM credit_plans;
-- Should return 4 plans

SELECT * FROM message_templates;
-- Should return 6 templates

-- 9. Check storage buckets
SELECT * FROM storage.buckets;
-- Should return 5 buckets

-- 10. Test a function
SELECT * FROM get_featured_shops(5);
-- Should execute without error (may return empty if no featured shops yet)
```

## Common Issues and Solutions

### Issue 1: "Extension does not exist"

**Error**: `ERROR:  extension "postgis" does not exist`

**Solution**:
- PostGIS may not be available on your Supabase tier
- Contact Supabase support or use a different tier
- Alternatively, comment out PostGIS-related sections if you don't need geolocation

### Issue 2: "Permission denied"

**Error**: `ERROR:  permission denied for schema auth`

**Solution**:
- Run migration as postgres user (superuser)
- Via Supabase dashboard SQL editor (runs as postgres)

### Issue 3: "Relation already exists"

**Error**: `ERROR:  relation "users" already exists`

**Solution**:
- You're running on a database that already has some tables
- Either:
  1. Drop existing tables first (DANGER: will lose data)
  2. Run on a fresh database
  3. Manually merge schemas (advanced)

### Issue 4: Storage policies fail

**Error**: `ERROR:  relation "storage.objects" does not exist`

**Solution**:
- Storage schema isn't initialized
- Initialize storage first:
  ```sql
  -- This is typically done automatically by Supabase
  -- Contact support if storage isn't available
  ```

### Issue 5: RLS policies prevent access

**Problem**: Can't access data even when logged in

**Solution**:
```sql
-- Temporarily disable RLS for testing (NOT for production)
ALTER TABLE tablename DISABLE ROW LEVEL SECURITY;

-- Check if user has correct role
SELECT id, email, role FROM users WHERE email = 'your@email.com';

-- Re-enable RLS after testing
ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;
```

### Issue 6: Functions fail with "search_path"

**Error**: `ERROR:  function cannot execute on a read-only transaction`

**Solution**:
- Ensure functions have `SECURITY DEFINER` and `SET search_path = public`
- Re-create function with correct settings

## Rollback Plan

If migration fails and you need to rollback:

### Option 1: Restore from Backup

```bash
# If you created a backup before migration
supabase db restore --file backup.sql
```

### Option 2: Drop All Objects

```sql
-- DANGER: This will delete everything
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Option 3: Start Fresh

- Create a new Supabase project
- Migrate your data from old project

## Performance Tuning

After migration, optimize performance:

```sql
-- 1. Analyze tables for better query planning
ANALYZE;

-- 2. Check for missing indexes
-- (The migration includes comprehensive indexes, but you may need more based on your queries)

-- 3. Configure connection pooling
-- Settings → Database → Connection Pooling

-- 4. Enable statement timeout
ALTER DATABASE postgres SET statement_timeout = '60s';

-- 5. Monitor slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Maintenance

Regular maintenance tasks:

```sql
-- 1. Vacuum tables (weekly)
VACUUM ANALYZE;

-- 2. Rebuild indexes (monthly)
REINDEX DATABASE postgres;

-- 3. Update statistics
ANALYZE;

-- 4. Clean up old analytics data (if needed)
DELETE FROM analytics_events WHERE created_at < now() - INTERVAL '90 days';
DELETE FROM viewanalytics WHERE created_at < now() - INTERVAL '90 days';

-- 5. Archive old audit logs
-- Move to separate archive table or export to file storage
```

## Next Steps

After successful migration:

1. ✅ **Update TypeScript Types**:
   ```bash
   # Generate types from your Supabase database
   supabase gen types typescript --local > src/integrations/supabase/types.ts
   # Or for remote:
   supabase gen types typescript --linked > src/integrations/supabase/types.ts
   ```

2. ✅ **Test Core Flows**:
   - User registration (customer and shop owner)
   - Shop creation
   - Product listing
   - Inquiry submission
   - Payment processing
   - Review submission

3. ✅ **Set Up CI/CD**:
   - Add database migrations to your deployment pipeline
   - Set up automated testing
   - Configure staging environment

4. ✅ **Documentation**:
   - Document your API endpoints
   - Create user guides
   - Write admin documentation

5. ✅ **Monitoring**:
   - Set up error tracking (Sentry, etc.)
   - Configure analytics
   - Set up uptime monitoring

## Support

If you encounter issues:

1. **Check Supabase Status**: https://status.supabase.com
2. **Supabase Docs**: https://supabase.com/docs
3. **Supabase Discord**: https://discord.supabase.com
4. **Review Analysis**: See `DATABASE_ISSUES_ANALYSIS.md` for known issues

## Migration Script Sections

The `MASTER_MIGRATION.sql` is organized into 23 sections:

1. **Extensions** - PostgreSQL extensions (PostGIS, pg_trgm, etc.)
2. **ENUM Types** - 24 custom types for type safety
3. **Core Tables** - Users, shops, profiles
4. **Product Tables** - Products and catalog
5. **Inquiry Tables** - Inquiry system
6. **Order Tables** - Orders and transactions
7. **Payment System** - UPI payment workflow
8. **Offers** - Promotions and discounts
9. **Reviews** - Product and shop reviews
10. **Featured Items** - Promotional items
11. **Notifications** - User notifications
12. **Analytics** - Tracking and analytics
13. **Support** - Tickets and help desk
14. **User Engagement** - Favorites, searches
15. **Referral System** - Referral codes and rewards
16. **Admin Tools** - Audit logs, settings
17. **Indexes** - Performance indexes (100+)
18. **Functions** - Helper functions
19. **Triggers** - Automation triggers
20. **RLS Policies** - Security policies (250+)
21. **Storage** - File storage buckets
22. **Seed Data** - Initial data
23. **Completion** - Verification and cleanup

Each section can be run independently if needed, but must follow dependency order.

## Success Checklist

- [ ] Migration script executed without errors
- [ ] All 60+ tables created
- [ ] All 24 ENUM types created
- [ ] All 100+ indexes created
- [ ] RLS enabled on all tables
- [ ] Storage buckets created
- [ ] Seed data inserted
- [ ] Realtime configured
- [ ] Authentication set up
- [ ] Admin user created
- [ ] RLS policies tested
- [ ] Functions working
- [ ] TypeScript types generated
- [ ] Core flows tested

---

**Migration Version**: 1.0.0
**Created**: 2025-10-24
**Database**: LocalConnect Customer App
**Tables**: 60+
**Total Lines**: 3000+

Good luck with your migration! 🚀
