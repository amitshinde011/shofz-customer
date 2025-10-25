# Fix: Shops Display Consistency

## Changes Made

### ✅ Home Page Featured Shops Now Match Shops Page

**File:** [src/pages/Home.tsx](src/pages/Home.tsx)

#### Added Imports:
```typescript
import { useUserLocation } from "@/contexts/LocationContext";
import { calculateShopStatus } from "@/lib/businessHours";
import { calculateDistance, formatDistance } from "@/lib/distanceCalculation";
```

#### Changed Shop Rendering:

**Before:**
- Manual shop cards with hardcoded data
- No working hours calculation
- No distance calculation
- Static "Open now" status
- Missing view counts

**After:**
- Uses `<ShopCard>` component (same as Shops page)
- Calculates working hours with `calculateShopStatus()`
- Calculates distance with user location
- Shows actual open/closed status
- Shows view counts automatically

#### Shop Data Now Includes:

```typescript
{
  isOpen: shopStatus.isOpen,              // ✅ Real-time open/closed
  nextStatusChange: shopStatus.nextStatusChange, // ✅ "Opens at 9:00 AM" or "Closes at 5:00 PM"
  distance: formatDistance(distanceKm),   // ✅ "2.3 km away"
  // ... all other fields match Shops page
}
```

---

## Working Hours Display

### How It Works:

1. **Business Hours from Database:**
   - Stored in `shops.business_hours` as JSON
   - Format:
   ```json
   {
     "monday": { "isOpen": true, "open": "09:00", "close": "17:00" },
     "tuesday": { "isOpen": true, "open": "09:00", "close": "17:00" },
     ...
   }
   ```

2. **Calculation (`calculateShopStatus`):**
   - Gets current day and time
   - Checks if shop should be open now
   - Calculates next status change
   - Returns: `{ isOpen: true, nextStatusChange: "Closes at 5:00 PM" }`

3. **Display in ShopCard:**
   - Grid variant: Shows badge "Open Now" (green) or "Closed" (gray)
   - Shows next status: "Opens at 9:00 AM" or "Closes at 5:00 PM"

---

## Distance Calculation

### How It Works:

1. **User Location:**
   - From `useUserLocation()` hook
   - Uses GPS/geolocation API
   - Format: `{ lat: 40.7128, lng: -74.0060 }`

2. **Shop Location:**
   - From `shop.location` in database
   - PostGIS geography point
   - Format: `{ lat: 40.7580, lng: -73.9855 }`

3. **Distance Calculation:**
   - Uses Haversine formula
   - Returns distance in kilometers
   - Formatted as "2.3 km" or "500 m"

---

## Shops Display Everywhere

### ✅ Consistent Shop Display On:

1. **Home Page** (`/`)
   - Featured shops section
   - Uses ShopCard component
   - Shows: distance, hours, status, view counts

2. **Shops Page** (`/shops`)
   - All shops grid/list
   - Uses ShopCard component
   - Shows: distance, hours, status, view counts

3. **Shop Detail Page** (`/shops/:id`)
   - Full shop information
   - Shows: business hours, status, view counts
   - Uses `calculateShopStatus()` for hours display

---

## What Displays on Shop Cards

### Grid Variant (Used on Home & Shops pages):

```
┌─────────────────────────┐
│   Shop Image            │
├─────────────────────────┤
│ Shop Name          ⭐4.5 │
│ [Electronics]           │
│ 20 reviews  👁️ 45 views│
│ 📍 2.3 km away         │
│ 🕐 Opens at 9:00 AM    │ ← Working hours status
│ [Open Now] badge       │ ← Green if open, gray if closed
│ [Call] [View Shop]     │
└─────────────────────────┘
```

### List Variant (Used on Shops page):

```
┌──────┬────────────────────┐
│ Logo │ Shop Name ✓        │
│      │ ⭐ 4.5 (20) 👁️ 45  │
│      │ 📍 2.3 km          │
│      │ 🕐 Opens at 9:00   │ ← Working hours status
│      │ [Open Now] badge   │
└──────┴────────────────────┘
```

---

## Testing Checklist

### ✅ Home Page
- [ ] Featured shops show correct open/closed badge
- [ ] Shows "Opens at..." or "Closes at..." time
- [ ] Shows distance from your location
- [ ] Shows view counts (👁️ X views)

### ✅ Shops Page
- [ ] All shops show correct open/closed badge
- [ ] Working hours match shop detail page
- [ ] Distance calculation works
- [ ] View counts display

### ✅ Shop Detail Page
- [ ] "Today's hours" shows correct times
- [ ] Status badge matches current time
- [ ] Business hours dropdown shows all days
- [ ] View count displays in header

---

## If Working Hours Don't Show Correctly

### Check 1: Business Hours Data in Database
```sql
-- Check if shop has business hours
SELECT id, name, business_hours
FROM shops
WHERE id = 'YOUR_SHOP_ID';
```

**Expected:** JSON with all 7 days

### Check 2: Console Logs
```javascript
// Should see in browser console:
calculateShopStatus() // called for each shop
// Check if times are correct
```

### Check 3: Time Zone
- Working hours use local browser time
- Make sure shop hours are in correct time zone
- `new Date().getHours()` should match your current time

---

## Files Modified

1. ✅ [src/pages/Home.tsx](src/pages/Home.tsx)
   - Added location and business hours imports
   - Calculate shop status for each shop
   - Calculate distance for each shop
   - Use ShopCard component

2. ✅ Existing files already working:
   - `src/pages/Shops.tsx` - Already uses calculateShopStatus
   - `src/components/ShopCard.tsx` - Already has view counts
   - `src/lib/businessHours.ts` - Working hours logic
   - `src/lib/distanceCalculation.ts` - Distance logic

---

## Summary

**Changes:**
- ✅ Home page shops now match Shops page exactly
- ✅ Working hours calculated correctly everywhere
- ✅ Distance shown from user location
- ✅ Open/closed status is real-time
- ✅ View counts display automatically

**Rebuild and test:**
```bash
npm run dev
```

Then visit:
1. Home page → Featured Shops section
2. Shops page → Grid view
3. Any shop detail page

All should show consistent working hours, status, and view counts! 🎉
