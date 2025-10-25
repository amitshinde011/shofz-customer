# Fix: RPC Function Returns Array Instead of Object

## Problem Identified

The console logs show:
```javascript
[useEntityViewCounts] RPC result for offer: [{view_count: 33, last_viewed_at: '...'}]
```

Notice the **array brackets `[{...}]`** - the RPC function returns an array, but the code expected a single object `{view_count: 33}`.

## Root Cause

PostgreSQL `RETURNS TABLE` functions always return an array of rows, even if there's only one row.

Our function:
```sql
RETURNS TABLE (
  view_count BIGINT,
  last_viewed_at TIMESTAMP WITH TIME ZONE
)
```

Returns: `[{view_count: 33, last_viewed_at: '...'}]` ← **Array!**

But code expected: `{view_count: 33, last_viewed_at: '...'}` ← **Object!**

So `data?.view_count` was `undefined` because `data` was an array, not an object.

## Fix Applied

Updated `useEntityViewCounts.ts` to handle array response:

```typescript
// RPC function returns an array, get first element
const result = Array.isArray(data) ? data[0] : data;

return {
  view_count: result?.view_count || 0,
  last_viewed_at: result?.last_viewed_at,
};
```

## What to Do Now

### 1. Rebuild the App
```bash
npm run build:dev
# or
npm run dev
```

### 2. Test in Browser
1. Clear cache (Ctrl+Shift+R)
2. Open console (F12)
3. Look for these new logs:

**Before (old logs):**
```javascript
[useEntityViewCounts] RPC result for offer: [{view_count: 33, ...}]
```

**After (new logs):**
```javascript
[useEntityViewCounts] RPC result for offer: [{view_count: 33, ...}]
[useEntityViewCounts] Parsed result - view_count: 33
[OfferCard] Offer xxx - viewCounts data: {view_count: 33, ...}
```

### 3. Check UI
- **Before:** No view counts displayed (even though data fetched)
- **After:** 👁️ 33 displayed on cards!

## Verification

After rebuild, you should see in console:
```javascript
[useEntityViewCounts] Parsed result - view_count: 33
[OfferCard] Offer xxx - viewCounts data: {view_count: 33} Type: object Has view_count: 33
```

And on UI:
- Product cards: 👁️ 33
- Shop cards: 👁️ 45
- Offer cards: 👁️ 89

## Why This Happened

Supabase RPC with `RETURNS TABLE` always returns array format:
- `RETURNS TABLE` → Array of rows `[{...}, {...}]`
- `RETURNS SETOF record` → Array of rows `[{...}, {...}]`
- `RETURNS record` → Single object `{...}` (but less common)

Our function returns a single row, but in array format because of `RETURNS TABLE`.

## Alternative: Change Function Return Type

If you want to change the SQL function instead:

```sql
CREATE OR REPLACE FUNCTION public.get_entity_view_count(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS json  -- Returns single JSON object instead of TABLE
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'view_count', COUNT(*)::BIGINT,
    'last_viewed_at', MAX(created_at)
  )
  INTO result
  FROM public.viewanalytics
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id;

  RETURN result;
END;
$$;
```

But the fix in the hook is simpler and works with the existing function! ✅
