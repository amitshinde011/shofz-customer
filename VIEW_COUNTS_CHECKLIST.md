# View Counts Display - Complete Checklist ✅

## Where View Counts SHOULD Appear

### 📦 Products

#### ✅ Product Listings
- **Home Page** (`/`)
  - Featured products section
  - Uses: `<ProductCard>`
  - Shows: 👁️ count next to shop name
  - File: [src/pages/Home.tsx:111](src/pages/Home.tsx#L111)

- **Products Page** (`/products`)
  - All products grid/list
  - Uses: `<ProductCard>`
  - Shows: 👁️ count next to shop name
  - File: [src/pages/Products.tsx:409](src/pages/Products.tsx#L409)

- **Shop Detail Page** (`/shops/:id`)
  - Products from this shop section
  - Uses: `<ProductCard>`
  - Shows: 👁️ count next to shop name
  - File: [src/pages/ShopDetail.tsx](src/pages/ShopDetail.tsx)

- **Offer Detail Page** (`/offers/:id`)
  - Products from shop section
  - Uses: `<ProductCard>`
  - Shows: 👁️ count next to shop name
  - File: [src/pages/OfferDetail.tsx](src/pages/OfferDetail.tsx)

#### ✅ Product Detail
- **Product Detail Page** (`/products/:id`)
  - Shows: 👁️ X views (next to categories below title)
  - File: [src/pages/ProductDetail.tsx:165-170](src/pages/ProductDetail.tsx#L165-L170)
  - Code location: Right below product title and categories

---

### 🏪 Shops

#### ✅ Shop Listings
- **Home Page** (`/`)
  - Featured shops section (if exists)
  - Uses: `<ShopCard>`
  - Shows: 👁️ count next to rating (list) or reviews (grid)

- **Shops Page** (`/shops`)
  - All shops grid/list
  - Uses: `<ShopCard>`
  - Shows:
    - List variant: 👁️ count next to rating
    - Grid variant: 👁️ X views next to reviews
  - File: [src/pages/Shops.tsx:330](src/pages/Shops.tsx#L330)

#### ✅ Shop Detail
- **Shop Detail Page** (`/shops/:id`)
  - Shows: 👁️ X views (in stats section below rating)
  - File: [src/pages/ShopDetail.tsx:313-318](src/pages/ShopDetail.tsx#L313-L318)
  - Code location: Stats section with rating and products count

---

### 🎁 Offers

#### ✅ Offer Listings
- **Home Page** (`/`)
  - Featured offers carousel/section
  - Uses: `<OfferCard>`
  - Shows: 👁️ count next to expiry time
  - File: [src/pages/Home.tsx:235](src/pages/Home.tsx#L235)

- **Offers Page** (`/offers`)
  - All offers grid/list
  - Uses: `<OfferCard>`
  - Shows: 👁️ count next to expiry time
  - File: [src/pages/Offers.tsx:287](src/pages/Offers.tsx#L287)

- **Offer Stories Carousel**
  - Full-screen offer viewer
  - Views are TRACKED but NOT displayed (story format)
  - File: [src/components/OfferStoriesViewer.tsx](src/components/OfferStoriesViewer.tsx)

#### ✅ Offer Detail
- **Offer Detail Page** (`/offers/:id`)
  - Shows: 👁️ X views (next to expiry time)
  - File: [src/pages/OfferDetail.tsx:244-249](src/pages/OfferDetail.tsx#L244-L249)
  - Code location: Below description, with expiry time

---

## Visual Location Guide

### ProductCard Layout
```
┌─────────────────────┐
│   Product Image     │
│                     │
├─────────────────────┤
│ Product Name        │
│ Shop Name  👁️ 123   │ ← View count here
│ ₹1,234             │
│ [Inquire]      │
└─────────────────────┘
```

### ShopCard (List) Layout
```
┌──────┬────────────────────┐
│ Logo │ Shop Name ✓        │
│      │ ⭐ 4.5 (20) 👁️ 45  │ ← View count here
│      │ 📍 2.3 km          │
│      │ 🕐 Open now        │
└──────┴────────────────────┘
```

### ShopCard (Grid) Layout
```
┌─────────────────────┐
│   Shop Image        │
├─────────────────────┤
│ Shop Name      ⭐4.5 │
│ Electronics         │
│ 20 reviews 👁️ 45    │ ← View count here
│ 📍 2.3 km          │
│ 🕐 Open now        │
└─────────────────────┘
```

### OfferCard Layout
```
┌─────────────────────┐
│   Offer Image       │
│   [50% OFF]         │
├─────────────────────┤
│ Offer Title         │
│ Description         │
│ 🕐 Valid till ... 👁️ 89 │ ← View count here
│ [Inquire]       │
└─────────────────────┘
```

### Detail Pages
```
ProductDetail:
  Product Name
  [Electronics] [Gadgets] 👁️ 234 views ← Here
  ₹1,234
  ...

ShopDetail:
  [Shop Logo] Shop Name ✓
  ⭐ 4.5 (20) | 👁️ 234 views | 📦 50 products ← Here
  ...

OfferDetail:
  Offer Title
  Description
  🕐 Valid till ... | 👁️ 123 views ← Here
  ...
```

---

## How to Verify

### ✅ Check if View Counts Display

1. **Open the app** in your browser
2. **For Products:**
   - Go to `/products` page
   - Look for 👁️ icon with number on each product card
   - Click any product → Should see "X views" below title

3. **For Shops:**
   - Go to `/shops` page
   - Look for 👁️ icon with number on each shop card
   - Click any shop → Should see "X views" in header stats

4. **For Offers:**
   - Go to `/offers` page
   - Look for 👁️ icon with number on each offer card
   - Click any offer → Should see "X views" below description

### ❌ If NOT Showing

1. **Check console logs** (F12 → Console)
   - Should see: `[useEntityViewCounts] Fetching view count for...`

2. **Check if count is 0**
   - View counts only show if `view_count > 0`
   - No views tracked yet = no display

3. **Track a test view:**
   - Visit a product/shop/offer detail page
   - Go back to list
   - Should now see count of 1

---

## Component Files Modified

### Cards (Display View Counts)
- ✅ [ProductCard.tsx:147-152](src/components/ProductCard.tsx#L147-L152)
- ✅ [ShopCard.tsx:121-133](src/components/ShopCard.tsx#L121-L133) (list variant)
- ✅ [ShopCard.tsx:279-288](src/components/ShopCard.tsx#L279-L288) (grid variant)
- ✅ [OfferCard.tsx:98-103](src/components/OfferCard.tsx#L98-L103) (compact)
- ✅ [OfferCard.tsx:182-187](src/components/OfferCard.tsx#L182-L187) (full)
- ✅ [RevolutionaryProductCard.tsx:205-217](src/components/RevolutionaryProductCard.tsx#L205-L217)

### Pages (Display View Counts)
- ✅ [ProductDetail.tsx:165-170](src/pages/ProductDetail.tsx#L165-L170)
- ✅ [ShopDetail.tsx:313-318](src/pages/ShopDetail.tsx#L313-L318)
- ✅ [OfferDetail.tsx:244-249](src/pages/OfferDetail.tsx#L244-L249)

### Pages (Use Cards - Auto Display)
- ✅ [Home.tsx](src/pages/Home.tsx) - Uses ProductCard, OfferCard
- ✅ [Products.tsx](src/pages/Products.tsx) - Uses ProductCard
- ✅ [Shops.tsx](src/pages/Shops.tsx) - Uses ShopCard
- ✅ [Offers.tsx](src/pages/Offers.tsx) - Uses OfferCard
- ✅ [ShopDetail.tsx](src/pages/ShopDetail.tsx) - Uses ProductCard for shop products
- ✅ [OfferDetail.tsx](src/pages/OfferDetail.tsx) - Uses ProductCard for shop products

---

## Summary

**View counts display on:**
- ✅ ALL product cards (home, products page, shop detail, offer detail)
- ✅ ALL shop cards (home, shops page) - both grid and list variants
- ✅ ALL offer cards (home, offers page)
- ✅ ALL detail pages (product detail, shop detail, offer detail)

**View counts are tracked when:**
- ✅ Opening product detail page
- ✅ Opening shop detail page
- ✅ Opening offer detail page
- ✅ Viewing offer in stories carousel

**View counts only show when:**
- ⚠️ `view_count > 0` (at least 1 view exists)
- ⚠️ Database queries succeed
- ⚠️ RLS policies allow reads

If you don't see view counts, run: **[TEST_VIEWS_SETUP.sql](TEST_VIEWS_SETUP.sql)** to diagnose!
