# LocalConnect Database - Schema Relationships

## Entity Relationship Overview

This document visualizes the relationships between all tables in the LocalConnect database.

---

## Core User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        USERS TABLE                           │
│  - id (PK)                                                   │
│  - email, phone_number, role                                 │
│  - Roles: customer, shop_owner, admin, super_admin          │
└───────────────┬─────────────────┬───────────────────────────┘
                │                 │
      ┌─────────▼──────┐    ┌────▼──────────────┐
      │ customer_      │    │   shop_owner      │
      │ profiles       │    │   creates         │
      │                │    │                   │
      └────────────────┘    └───────┬───────────┘
                                    │
                            ┌───────▼───────────────────────┐
                            │        SHOPS TABLE            │
                            │  - owner_id → users.id        │
                            │  - Geolocation (PostGIS)      │
                            │  - Credits system             │
                            └───────┬───────────────────────┘
                                    │
                ┌───────────────────┼────────────────┐
                │                   │                │
        ┌───────▼──────┐   ┌───────▼──────┐  ┌─────▼─────────┐
        │  PRODUCTS    │   │   OFFERS     │  │ shop_credits  │
        │              │   │              │  │               │
        └──────────────┘   └──────────────┘  └───────────────┘
```

---

## Inquiry & Order Flow

```
CUSTOMER                    SHOP OWNER                     SYSTEM
   │                            │                             │
   │  1. Creates Inquiry        │                             │
   ├────────────────────────────►                             │
   │                            │                             │
   │                            │  2. Sends to Multiple Shops │
   │                            ◄─────────────────────────────┤
   │                            │                             │
   │                            │  3. Shop Responds           │
   │  ◄─────────────────────────┤                             │
   │                            │                             │
   │  4. Chat/Negotiate         │                             │
   ├───────────◄────────────────►                             │
   │                            │                             │
   │  5. Accepts Quote          │                             │
   ├────────────────────────────►                             │
   │                            │                             │
   │                            │  6. Creates Order           │
   │                            ├─────────────────────────────►
   │                            │                             │
   │  7. Makes Payment (UPI)    │                             │
   ├────────────────────────────┼─────────────────────────────►
   │                            │                             │
   │                            │  8. Confirms Payment        │
   │                            ├─────────────────────────────►
   │                            │                             │
   │                            │  9. Order Fulfilled         │
   │  ◄─────────────────────────┤                             │
   │                            │                             │
   │  10. Leaves Review         │                             │
   ├────────────────────────────►                             │
```

### Database Tables Involved:

```
┌────────────┐     ┌─────────────────┐     ┌──────────────┐
│ INQUIRIES  │────►│  INQUIRY_SHOPS  │────►│    SHOPS     │
│            │     │  (junction)     │     │              │
│ - customer │     │  - inquiry_id   │     │              │
│ - shop_id  │     │  - shop_id      │     │              │
│ - product  │     │  - status       │     │              │
└──────┬─────┘     └─────────────────┘     └──────┬───────┘
       │                                           │
       │           ┌─────────────┐                 │
       └──────────►│  MESSAGES   │◄────────────────┘
                   │  (chat)     │
                   └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   ORDERS    │
                   │             │
                   └──────┬──────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
   ┌──────▼────────┐  ┌──▼──────────┐  ┌─▼────────────┐
   │ ORDER_ITEMS   │  │ TRANSACTIONS│  │ PAYMENT_     │
   │               │  │             │  │ REQUESTS     │
   └───────────────┘  └─────────────┘  └──────────────┘
```

---

## Payment Verification Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   PAYMENT_REQUESTS                            │
│  - customer_id → users.id                                    │
│  - shop_id → shops.id                                        │
│  - inquiry_id → inquiries.id                                 │
│  - status: initiated → launched → claimed → verified         │
└────────────┬──────────────┬──────────────┬──────────────────┘
             │              │              │
   ┌─────────▼──────┐  ┌────▼──────┐  ┌───▼──────────────┐
   │ PAYMENT_       │  │ PAYMENT_  │  │ PAYMENT_         │
   │ VERIFICATION_  │  │ FOLLOW_   │  │ DISPUTES         │
   │ EVIDENCE       │  │ UPS       │  │                  │
   └────────────────┘  └───────────┘  └──────────────────┘
```

**Workflow**:
1. Customer initiates payment request
2. System launches UPI app
3. Customer completes payment, uploads screenshot
4. Shop confirms receipt
5. System verifies with evidence
6. Payment marked as verified
7. Order progresses

---

## Credit System

```
┌────────────────────────────────────────────────┐
│              SHOP_CREDITS                      │
│  - shop_id → shops.id                         │
│  - total_credits, available_credits           │
└────────┬───────────────┬───────────────────────┘
         │               │
         │               │
┌────────▼─────┐   ┌─────▼────────────────┐
│ CREDIT_      │   │ CREDIT_TRANSACTIONS  │
│ BATCHES      │   │  - purchase          │
│  (purchases) │   │  - deduction         │
│              │   │  - refund            │
└──────────────┘   └──────────────────────┘
         │
         │
┌────────▼──────────┐
│ FEATURED_ITEMS    │
│  - Uses credits   │
│  - Daily charge   │
└───────────────────┘
```

**Credit Flow**:
1. Shop purchases credit pack → `credit_batches` created
2. Balance updated in `shop_credits`
3. Transaction logged in `credit_transactions`
4. Credits deducted daily for featured items
5. Deductions tracked in `featured_item_deductions`

---

## Review System

```
                    ┌─────────────────┐
                    │     ORDERS      │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │                         │
        ┌───────▼────────┐      ┌────────▼─────────┐
        │   REVIEWS      │      │  SHOP_REVIEWS    │
        │  (product)     │      │  (overall shop)  │
        │                │      │                  │
        │ - user_id      │      │ - user_id        │
        │ - product_id   │      │ - shop_id        │
        │ - shop_id      │      │ - ratings        │
        │ - rating       │      │   (detailed)     │
        └────────────────┘      └────────┬─────────┘
                                         │
                                ┌────────▼──────────┐
                                │ SHOP_REVIEW_STATS│
                                │  (materialized)  │
                                │                  │
                                │ - average_rating │
                                │ - distribution   │
                                └──────────────────┘
```

**Review Flow**:
1. Customer places order
2. After delivery, customer can review:
   - Individual products → `reviews`
   - Overall shop experience → `shop_reviews`
3. Reviews pending approval (status: pending)
4. Admin/system approves → status: approved
5. Trigger fires → updates `shop_review_stats`
6. Shop's rating updated in `shops` table

---

## Analytics & Tracking

```
┌───────────────────────────────────────────┐
│         USER INTERACTIONS                  │
└─────────┬──────────┬──────────────────────┘
          │          │
  ┌───────▼────┐  ┌──▼───────────────┐
  │ ANALYTICS_ │  │ VIEWANALYTICS    │
  │ EVENTS     │  │  - entity_type   │
  │            │  │  - entity_id     │
  │ - Generic  │  │  - user/session  │
  │   tracking │  │                  │
  └────────────┘  └────────┬─────────┘
                           │
                  ┌────────▼──────────────┐
                  │ ENTITYVIEWCOUNTS      │
                  │  (aggregated)         │
                  │                       │
                  │ - Period stats        │
                  │ - Total/unique views  │
                  └───────────────────────┘
```

**Tracking Flow**:
1. User views product/shop/offer
2. `increment_view_count()` function called
3. Record added to `viewanalytics`
4. Counter incremented on entity table
5. Periodic job aggregates to `entityviewcounts`
6. Analytics dashboard queries aggregated data

---

## Notification System

```
┌──────────────────────────────────────┐
│         SYSTEM EVENTS                 │
│  - New inquiry                        │
│  - Order status change                │
│  - Payment received                   │
│  - Review posted                      │
└────────────┬─────────────────────────┘
             │
   ┌─────────▼────────────┐
   │   NOTIFICATIONS      │
   │                      │
   │ - user_id           │
   │ - type, message     │
   │ - is_read           │
   │ - delivery_channels │
   └──────────────────────┘
```

**Notification Flow**:
1. Event occurs (inquiry, order, payment)
2. Trigger/application creates notification
3. Notification inserted for relevant users
4. Delivery via:
   - In-app (Realtime subscription)
   - Email (via message template)
   - Push notification
5. User marks as read

---

## Storage Buckets Structure

```
storage.objects
│
├── shop-assets/          (PUBLIC)
│   ├── logos/
│   │   └── {shop_id}_{filename}
│   ├── covers/
│   │   └── {shop_id}_{filename}
│   ├── qr-codes/
│   │   └── {shop_id}_qr.png
│   └── gallery/
│       └── {shop_id}_{filename}
│
├── products/             (PUBLIC)
│   └── {product_id}_{filename}
│
├── avatars/              (PUBLIC)
│   └── {user_id}/{filename}
│
├── payment-evidence/     (PRIVATE)
│   └── {user_id}/{payment_id}_{filename}
│
└── documents/            (PRIVATE)
    └── {shop_id}/
        └── {document_type}_{filename}
```

---

## RLS Policy Structure

Every table has policies following this pattern:

```
TABLE
├── SELECT Policies
│   ├── Users can view own data
│   ├── Public can view active/approved items
│   └── Admins can view all
│
├── INSERT Policies
│   ├── Users can create own records
│   └── Admins can create all
│
├── UPDATE Policies
│   ├── Users can update own data
│   ├── Shop owners can update their items
│   └── Admins can update all
│
└── DELETE Policies
    ├── Users can delete own data
    └── Admins can delete all
```

---

## Complete Table Dependencies (Execution Order)

```
1. EXTENSIONS (postgis, pg_trgm, pgcrypto)
   ↓
2. ENUM TYPES (24 types)
   ↓
3. CORE TABLES
   ├── users
   ├── user_roles → users
   ├── customer_profiles → users
   └── customer_payment_preferences → users
   ↓
4. SHOP TABLES
   ├── shops → users
   ├── shop_credits → shops
   ├── shop_verification_documents → shops, users
   └── shop_subscriptions → shops
   ↓
5. PRODUCT TABLES
   └── products → shops
   ↓
6. INQUIRY TABLES
   ├── inquiries → users, shops, products
   ├── inquiry_shops → inquiries, shops
   └── inquiry_responses → inquiries, shops
   ↓
7. MESSAGING
   └── messages → users, inquiries, shops
   ↓
8. ORDER TABLES
   ├── orders → users, shops, inquiries
   ├── order_items → orders, products
   ├── transactions → users, shops, orders
   └── payouts → shops, users
   ↓
9. PAYMENT TABLES
   ├── payment_requests → users, shops, inquiries, orders
   ├── payment_verification_evidence → payment_requests, users
   ├── payment_follow_ups → payment_requests
   ├── payment_disputes → payment_requests, users
   └── payment_transactions → users, shops, orders, payment_requests
   ↓
10. CREDIT TABLES
    ├── credit_plans
    ├── credit_costs
    ├── credit_batches → shops, payment_transactions
    └── credit_transactions → shops, payment_transactions
    ↓
11. PROMOTION TABLES
    ├── offers → shops
    ├── featured_items → shops
    └── featured_item_deductions → featured_items
    ↓
12. REVIEW TABLES
    ├── reviews → users, products, shops, orders
    ├── shop_reviews → users, shops, orders
    └── shop_review_stats → shops
    ↓
13. NOTIFICATION TABLES
    ├── notifications → users
    └── platform_alerts → users
    ↓
14. ANALYTICS TABLES
    ├── analytics_events → users
    ├── viewanalytics → users
    ├── entityviewcounts
    └── activity_feed → users, shops
    ↓
15. SUPPORT TABLES
    ├── support_tickets → users
    ├── support_messages → support_tickets, users
    └── contact_requests → users
    ↓
16. ENGAGEMENT TABLES
    ├── user_favorites → users
    └── user_searches → users
    ↓
17. REFERRAL TABLES
    ├── referral_codes → users
    └── referral_transactions → users, referral_codes
    ↓
18. ADMIN TABLES
    ├── audit_logs → users
    ├── wallet_transactions → users
    ├── platform_settings → users
    └── message_templates → users
    ↓
19. INDEXES (100+)
    ↓
20. FUNCTIONS (10+)
    ↓
21. TRIGGERS (30+)
    ↓
22. RLS POLICIES (250+)
    ↓
23. STORAGE BUCKETS & POLICIES
    ↓
24. SEED DATA
```

---

## Key Relationships

### One-to-Many Relationships

```
users (1) ──────► (N) shops
users (1) ──────► (N) inquiries
users (1) ──────► (N) orders
shops (1) ──────► (N) products
shops (1) ──────► (N) offers
shops (1) ──────► (N) orders
inquiries (1) ───► (N) messages
orders (1) ──────► (N) order_items
orders (1) ──────► (N) reviews
```

### Many-to-Many Relationships

```
inquiries (N) ◄──── inquiry_shops ────► (N) shops
users (N) ────◄──── user_favorites ────► (N) products/shops/offers
```

### Self-Referential Relationships

```
users.referred_by ───► users.id (referral system)
```

---

## Geospatial Queries

Tables with PostGIS geography columns:

```
┌─────────────────────────────────────┐
│ users.location (GEOGRAPHY POINT)   │
│  - Customer location                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ shops.location (GEOGRAPHY POINT)   │
│  - Shop location                    │
└─────────────────────────────────────┘

Function: get_nearby_shops(lat, lng, radius_km)
├── Calculates distance using ST_Distance
├── Filters within radius using ST_DWithin
└── Returns sorted by distance
```

**Example Query**:
```sql
-- Find shops within 10km of user
SELECT * FROM get_nearby_shops(28.6139, 77.2090, 10.0);
-- Returns shops near New Delhi coordinates
```

---

## Full-Text Search

Tables with trigram indexes (pg_trgm):

```
┌────────────────────────────────┐
│ shops.name (GIN index)        │
│  - Fuzzy search on shop names │
└────────────────────────────────┘

┌────────────────────────────────┐
│ products.name (GIN index)     │
│  - Fuzzy search on products   │
└────────────────────────────────┘

┌─────────────────────────────────────┐
│ products.search_terms (GIN index)  │
│  - SEO-optimized search             │
└─────────────────────────────────────┘
```

**Example Query**:
```sql
-- Fuzzy search for shops
SELECT * FROM shops
WHERE name % 'grocer'  -- Finds "grocery", "groceries", etc.
ORDER BY similarity(name, 'grocer') DESC;
```

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Total Tables** | 60+ |
| **User-facing** | 15 |
| **Shop-facing** | 10 |
| **System/Admin** | 10 |
| **Junction** | 5 |
| **Analytics** | 5 |
| **Financial** | 8 |
| **Support** | 3 |
| **Other** | 4+ |

---

**Created**: 2025-10-24
**Purpose**: Visual guide to database relationships
**For**: Developers, Database Admins, Architects
