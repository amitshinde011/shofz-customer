# Setup View Counts - Simple Direct Approach

## Overview
This is a **simple, direct approach** that reads view counts directly from the `viewanalytics` table (which already exists).

**No stats tables needed!** Just indexes and one RPC function for performance.

## Apply Migrations (2 files)

Go to **Supabase Dashboard → SQL Editor** and run these in order:

### 1. Add Indexes to viewanalytics
📄 File: `supabase/migrations/20251006000000_add_viewanalytics_indexes.sql`

This adds indexes to make view count queries fast.

### 2. Create View Count Function
📄 File: `supabase/migrations/20251006000001_add_view_count_function.sql`

This creates an optimized function to get view counts.

## How It Works

```
User Views Page
    ↓
useViewTracking('product', id) → INSERT into viewanalytics
    ↓
useEntityViewCounts('product', id) → COUNT from viewanalytics (with indexes)
    ↓
Display view count in UI
```

### Simple Data Flow:
1. **Write:** Views inserted into `viewanalytics` table
2. **Read:** View counts calculated with `COUNT(*)` query on `viewanalytics`
3. **Performance:** Composite indexes make COUNT queries fast

## Testing

After applying migrations:

1. **View a product page**
   - Navigate to any product: `/products/[id]`
   - This inserts a row into viewanalytics

2. **Check if it was tracked**
   ```sql
   SELECT * FROM viewanalytics
   WHERE entity_type = 'product'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **Check view counts**
   ```sql
   SELECT * FROM get_entity_view_count('product', 'YOUR_PRODUCT_ID');
   ```

4. **View the product card**
   - Go back to products list
   - Should see eye icon (👁️) with view count

## Troubleshooting

### Views not showing?

**Check 1: Is viewanalytics getting data?**
```sql
SELECT COUNT(*) FROM viewanalytics;
```
If 0, views aren't being tracked. Check browser console for errors.

**Check 2: Does the RPC function work?**
```sql
-- Get any product ID
SELECT id FROM products LIMIT 1;

-- Test the function
SELECT * FROM get_entity_view_count('product', 'PASTE_PRODUCT_ID_HERE');
```

**Check 3: Check RLS policies**
```sql
-- Check if you can read viewanalytics
SELECT * FROM viewanalytics LIMIT 5;
```

If you see errors, RLS policy might be blocking. Check policies in Supabase Dashboard.

**Check 4: Browser console**
- Open DevTools (F12)
- Look for errors when loading product/shop pages
- Check Network tab for failed requests

## Performance Notes

- ✅ Composite indexes make COUNT queries fast
- ✅ RPC function is optimized and cached
- ✅ React Query caches results for 30 seconds
- ✅ Auto-refetches every 60 seconds for fresh data
- ✅ No complex triggers or materialized views needed

## Fallback Behavior

The code has automatic fallback:
1. **Tries:** RPC function `get_entity_view_count()` (fastest)
2. **Falls back to:** Direct COUNT query on viewanalytics
3. **Always returns:** Safe default of 0 if any error

This means **it will work even if you only apply migration 1** (the indexes).
Migration 2 (the function) is for better performance.

## Files Changed

✅ `useEntityViewCounts.ts` - Now queries viewanalytics directly
✅ `useViewTracking.ts` - Already inserts into viewanalytics (no changes needed)
✅ All display components - Already updated to use `view_count`

**That's it!** Much simpler than the stats table approach. 🎉
