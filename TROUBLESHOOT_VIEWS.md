# Troubleshooting: Views Not Showing

## Quick Diagnosis Steps

### Step 1: Check Browser Console
1. Open your app in browser
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Navigate to any product/shop/offer page
5. Look for logs starting with `[useEntityViewCounts]`

**What you should see:**
```
[useEntityViewCounts] Fetching view count for: product abc-123-def
[useEntityViewCounts] RPC result for product: {view_count: 5, last_viewed_at: ...}
```

**Common Issues:**

❌ **If you see:** `RPC function not found, using fallback query`
- RPC function migration didn't apply correctly
- But fallback should still work - check next log

❌ **If you see:** `Fallback query error` or `Error fetching view counts`
- RLS policy might be blocking reads
- Run queries from [DEBUG_VIEWS.sql](DEBUG_VIEWS.sql) section 6

❌ **If you see:** `No entityId provided`
- Component isn't passing the ID correctly
- Check if product/shop/offer actually has an ID

❌ **If you see:** `Fallback result - count: 0`
- viewanalytics table is empty (no views tracked yet)
- Or entity_id doesn't match

### Step 2: Check Network Tab
1. Stay in Developer Tools
2. Go to Network tab
3. Refresh the page
4. Filter by "get_entity_view_count" or "viewanalytics"

**What to check:**
- Are requests being made?
- What's the status code? (200 = OK, 404 = not found, 403 = forbidden)
- Click on request → Preview tab → see the response

### Step 3: Run Database Queries

Open Supabase Dashboard → SQL Editor and run queries from **[DEBUG_VIEWS.sql](DEBUG_VIEWS.sql)**

**Key queries to run:**

#### Query 1: Is viewanalytics table empty?
```sql
SELECT COUNT(*) FROM viewanalytics;
```
- If 0: No views have been tracked yet
- Solution: Visit a product/shop/offer detail page to track a view

#### Query 2: Check column names
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'viewanalytics';
```
- Look for either `created_at` or `viewed_at` column
- Our RPC function uses `created_at`
- If column is different, we need to fix the function

#### Query 3: Test RPC function
```sql
-- First get a product ID
SELECT id FROM products LIMIT 1;

-- Then test function (replace with actual ID)
SELECT * FROM get_entity_view_count('product', 'YOUR_PRODUCT_ID_HERE');
```
- Should return `{view_count: 0, last_viewed_at: null}` or actual count
- If ERROR: Function wasn't created properly

#### Query 4: Check RLS policies
```sql
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'viewanalytics';
```
- Should allow SELECT for authenticated users
- Should allow INSERT for authenticated and anon users

### Step 4: Test View Tracking

1. Open browser console (F12)
2. Navigate to a product detail page
3. Check console for: `Successfully tracked product view for: [id]`
4. Run in Supabase SQL Editor:
```sql
SELECT * FROM viewanalytics ORDER BY created_at DESC LIMIT 5;
```
5. Should see your view record

**If view wasn't tracked:**
- Check console for "View tracking error"
- RLS policy might be blocking INSERT

## Common Fixes

### Fix 1: RPC Function Uses Wrong Column Name

If your viewanalytics table has `viewed_at` instead of `created_at`:

```sql
CREATE OR REPLACE FUNCTION public.get_entity_view_count(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  view_count BIGINT,
  last_viewed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as view_count,
    MAX(COALESCE(viewed_at, created_at)) as last_viewed_at
  FROM public.viewanalytics
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id;
END;
$$;
```

### Fix 2: Add RLS Policy for Reading

```sql
-- Allow authenticated users to read view counts
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read viewanalytics"
  ON public.viewanalytics
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous users to read view counts (for public pages)
CREATE POLICY IF NOT EXISTS "Allow anonymous users to read viewanalytics"
  ON public.viewanalytics
  FOR SELECT
  TO anon
  USING (true);
```

### Fix 3: Add RLS Policy for Writing

```sql
-- Allow all users to insert view records
CREATE POLICY IF NOT EXISTS "Allow all users to insert views"
  ON public.viewanalytics
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);
```

### Fix 4: Manually Track a Test View

Run this in SQL Editor to create a test view:
```sql
-- Get a real product ID first
SELECT id FROM products LIMIT 1;

-- Insert test view (replace with actual product ID)
INSERT INTO viewanalytics (entity_type, entity_id, viewer_type)
VALUES ('product', 'YOUR_PRODUCT_ID', 'guest');

-- Check if it worked
SELECT * FROM viewanalytics WHERE entity_type = 'product';

-- Test count function
SELECT * FROM get_entity_view_count('product', 'YOUR_PRODUCT_ID');
```

## Quick Test After Fixes

1. Clear browser cache (Ctrl+Shift+R)
2. Navigate to a product page
3. Check browser console for logs
4. Go back to products list
5. Look for eye icon (👁️) with number

## Still Not Working?

Run all queries from [DEBUG_VIEWS.sql](DEBUG_VIEWS.sql) and share:
1. Console logs from browser
2. Network tab responses
3. Query results from Supabase

The issue is usually one of:
- ❌ viewanalytics table is empty (nothing to count)
- ❌ RLS policy blocking reads/writes
- ❌ RPC function using wrong column name
- ❌ entity_id mismatch (viewing item with ID that doesn't match database)
