# Fix: View Counts Not Showing for Anonymous Users

## Problem
You see view counts being fetched in console logs, but they don't display on screen when **not logged in**.

This is because the current RLS policies on `viewanalytics` table only allow **authenticated** users to read, but anonymous users need access too.

## Solution

### Apply This Migration:

**File:** [supabase/migrations/20251006000002_fix_viewanalytics_rls_for_anon.sql](supabase/migrations/20251006000002_fix_viewanalytics_rls_for_anon.sql)

**Run in Supabase Dashboard → SQL Editor:**

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert their own views" ON public.viewanalytics;
DROP POLICY IF EXISTS "Authenticated users can read all views" ON public.viewanalytics;
DROP POLICY IF EXISTS "Anonymous users can insert guest views" ON public.viewanalytics;

-- Allow EVERYONE to read view counts
CREATE POLICY "Anyone can read view analytics"
  ON public.viewanalytics
  FOR SELECT
  USING (true);

-- Allow EVERYONE to insert views
CREATE POLICY "Anyone can insert view analytics"
  ON public.viewanalytics
  FOR INSERT
  WITH CHECK (true);
```

## Why This is Safe

✅ **Reading view counts is public data** - like YouTube view counts
✅ **Tracking views is anonymous** - no sensitive data exposed
✅ **Only INSERT and SELECT** - users can't UPDATE or DELETE existing records
✅ **No personal data** - only entity_type, entity_id, and metadata

## After Applying Migration

1. **Log out** of your app (or use incognito mode)
2. **Visit any product/shop/offer page**
3. **View counts should now display!** 👁️

## Test It

### Before Fix (Current State)
```javascript
// Console shows:
[useEntityViewCounts] Fetching view count for: product abc-123
[useEntityViewCounts] RPC result: {view_count: 5}

// But UI shows: Nothing (because RLS blocks anonymous reads)
```

### After Fix
```javascript
// Console shows:
[useEntityViewCounts] Fetching view count for: product abc-123
[useEntityViewCounts] RPC result: {view_count: 5}

// UI shows: 👁️ 5 (on the product card!)
```

## Verify RLS Policies

After applying migration, verify with this query:

```sql
-- Check current policies
SELECT
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'viewanalytics';
```

**Expected result:**
- Policy: "Anyone can read view analytics" | Roles: {public} | cmd: SELECT
- Policy: "Anyone can insert view analytics" | Roles: {public} | cmd: INSERT

## If Still Not Working

Check console for errors:
```javascript
// If you see this error:
"new row violates row-level security policy"
// → INSERT policy is still blocking, re-run the migration

// If you see this error:
"permission denied for table viewanalytics"
// → SELECT policy is still blocking, re-run the migration
```

Also verify the function grants are applied:
```sql
-- Check function permissions
SELECT
  proname,
  array_to_string(proacl, ', ') as permissions
FROM pg_proc
WHERE proname = 'get_entity_view_count';
```

Should show grants to both `authenticated` and `anon` (anonymous) roles.

## Summary

The issue is **RLS policies blocking anonymous users**. Apply the migration and view counts will work for everyone! 🎉
