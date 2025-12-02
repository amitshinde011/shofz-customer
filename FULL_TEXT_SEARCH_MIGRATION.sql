-- ============================================
-- Full-Text Search Infrastructure Migration
-- ============================================
-- This migration adds comprehensive full-text search capabilities
-- with search_vector columns, GIN indexes, auto-update triggers,
-- and a unified search function for products, shops, and offers.
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- 4. After successful execution, regenerate Supabase types:
--    npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts

-- ============================================
-- 1. Add search_vector Columns
-- ============================================

-- Add search_vector to products table (if not exists)
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search_vector to offers table (if not exists)
ALTER TABLE offers ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Note: shops table already has search_vector column

-- ============================================
-- 2. Create GIN Indexes for Fast Full-Text Search
-- ============================================

-- Index for products search
CREATE INDEX IF NOT EXISTS idx_products_search_vector 
ON products USING GIN(search_vector);

-- Index for shops search (if not exists)
CREATE INDEX IF NOT EXISTS idx_shops_search_vector 
ON shops USING GIN(search_vector);

-- Index for offers search
CREATE INDEX IF NOT EXISTS idx_offers_search_vector 
ON offers USING GIN(search_vector);

-- ============================================
-- 3. Create Trigger Functions to Auto-Update search_vector
-- ============================================

-- Products search vector update function
CREATE OR REPLACE FUNCTION update_products_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.brand, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.subcategory, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.sku, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(NEW.meta_title, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.meta_description, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Shops search vector update function
CREATE OR REPLACE FUNCTION update_shops_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.slug, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.address, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.delivery_notes, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.categories, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Offers search vector update function
CREATE OR REPLACE FUNCTION update_offers_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.terms_conditions, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.offer_type, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.discount_type, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.applicable_categories, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Create Triggers
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS products_search_vector_update ON products;
DROP TRIGGER IF EXISTS shops_search_vector_update ON shops;
DROP TRIGGER IF EXISTS offers_search_vector_update ON offers;

-- Products trigger
CREATE TRIGGER products_search_vector_update
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_products_search_vector();

-- Shops trigger
CREATE TRIGGER shops_search_vector_update
BEFORE INSERT OR UPDATE ON shops
FOR EACH ROW
EXECUTE FUNCTION update_shops_search_vector();

-- Offers trigger
CREATE TRIGGER offers_search_vector_update
BEFORE INSERT OR UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION update_offers_search_vector();

-- ============================================
-- 5. Populate search_vector for Existing Records
-- ============================================

-- Update existing products
UPDATE products SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(brand, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(subcategory, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(sku, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(meta_title, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(meta_description, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B')
WHERE search_vector IS NULL;

-- Update existing shops
UPDATE shops SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(slug, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(address, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(delivery_notes, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(array_to_string(categories, ' '), '')), 'B')
WHERE search_vector IS NULL;

-- Update existing offers
UPDATE offers SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(terms_conditions, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(offer_type, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(discount_type, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(array_to_string(applicable_categories, ' '), '')), 'B')
WHERE search_vector IS NULL;

-- ============================================
-- 6. Create Unified Search Function
-- ============================================

CREATE OR REPLACE FUNCTION unified_search(
  search_query TEXT,
  user_lat FLOAT DEFAULT NULL,
  user_lng FLOAT DEFAULT NULL,
  radius_km FLOAT DEFAULT 50,
  category_filter TEXT[] DEFAULT NULL,
  price_min FLOAT DEFAULT NULL,
  price_max FLOAT DEFAULT NULL,
  rating_min FLOAT DEFAULT NULL,
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  ts_query tsquery;
BEGIN
  -- Convert search query to tsquery
  ts_query := plainto_tsquery('english', search_query);
  
  -- Build result JSON with products, shops, and offers
  SELECT json_build_object(
    'products', (
      SELECT COALESCE(json_agg(p_result), '[]'::json)
      FROM (
        SELECT 
          p.*,
          s.name as shop_name,
          s.rating as shop_rating,
          s.logo_url as shop_logo_url,
          ts_rank(p.search_vector, ts_query) as relevance
        FROM products p
        LEFT JOIN shops s ON p.shop_id = s.id
        WHERE p.is_active = true
          AND (search_query IS NULL OR search_query = '' OR p.search_vector @@ ts_query)
          AND (category_filter IS NULL OR p.category = ANY(category_filter))
          AND (price_min IS NULL OR p.price >= price_min)
          AND (price_max IS NULL OR p.price <= price_max)
        ORDER BY 
          p.is_featured DESC,
          ts_rank(p.search_vector, ts_query) DESC,
          p.rating DESC
        LIMIT result_limit
        OFFSET result_offset
      ) p_result
    ),
    'shops', (
      SELECT COALESCE(json_agg(s_result), '[]'::json)
      FROM (
        SELECT 
          s.*,
          ts_rank(s.search_vector, ts_query) as relevance,
          CASE 
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL AND s.location IS NOT NULL THEN
              6371 * acos(
                cos(radians(user_lat)) * 
                cos(radians(ST_Y(s.location::geometry))) * 
                cos(radians(ST_X(s.location::geometry)) - radians(user_lng)) + 
                sin(radians(user_lat)) * 
                sin(radians(ST_Y(s.location::geometry)))
              )
            ELSE NULL
          END as distance_km
        FROM shops s
        WHERE s.is_active = true
          AND (search_query IS NULL OR search_query = '' OR s.search_vector @@ ts_query)
          AND (rating_min IS NULL OR s.rating >= rating_min)
          AND (
            user_lat IS NULL OR user_lng IS NULL OR s.location IS NULL OR
            6371 * acos(
              cos(radians(user_lat)) * 
              cos(radians(ST_Y(s.location::geometry))) * 
              cos(radians(ST_X(s.location::geometry)) - radians(user_lng)) + 
              sin(radians(user_lat)) * 
              sin(radians(ST_Y(s.location::geometry)))
            ) <= radius_km
          )
        ORDER BY 
          s.is_featured DESC,
          ts_rank(s.search_vector, ts_query) DESC,
          distance_km ASC NULLS LAST,
          s.rating DESC
        LIMIT result_limit
        OFFSET result_offset
      ) s_result
    ),
    'offers', (
      SELECT COALESCE(json_agg(o_result), '[]'::json)
      FROM (
        SELECT 
          o.*,
          s.name as shop_name,
          s.rating as shop_rating,
          s.logo_url as shop_logo_url,
          ts_rank(o.search_vector, ts_query) as relevance
        FROM offers o
        LEFT JOIN shops s ON o.shop_id = s.id
        WHERE o.is_active = true
          AND (o.valid_until IS NULL OR o.valid_until > NOW())
          AND (search_query IS NULL OR search_query = '' OR o.search_vector @@ ts_query)
        ORDER BY 
          o.is_featured DESC,
          ts_rank(o.search_vector, ts_query) DESC,
          o.valid_until ASC
        LIMIT result_limit
        OFFSET result_offset
      ) o_result
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION unified_search TO authenticated;
GRANT EXECUTE ON FUNCTION unified_search TO anon;

-- ============================================
-- Migration Complete
-- ============================================
-- Full-text search infrastructure is now ready.
-- The unified_search function can be called from the client.
-- 
-- NEXT STEPS:
-- 1. Regenerate Supabase types to include the new function
-- 2. Test the search functionality
-- 3. Monitor query performance using EXPLAIN ANALYZE
