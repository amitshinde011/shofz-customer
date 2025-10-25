-- Fix data inconsistencies: Resync all products, offers, and shops with featured_items
-- This ensures is_featured and featured_until are accurate

-- Fix all products
UPDATE products p 
SET 
  is_featured = true,
  featured_until = fi.featured_until
FROM featured_items fi
WHERE p.id = fi.entity_id 
  AND fi.entity_type = 'product'
  AND fi.status = 'active'
  AND fi.featured_until > NOW();

-- Clear stale featured status for products
UPDATE products 
SET is_featured = false, featured_until = NULL
WHERE id NOT IN (
  SELECT entity_id FROM featured_items 
  WHERE entity_type = 'product' 
    AND status = 'active' 
    AND featured_until > NOW()
);

-- Fix all offers
UPDATE offers o 
SET 
  is_featured = true,
  featured_until = fi.featured_until
FROM featured_items fi
WHERE o.id = fi.entity_id 
  AND fi.entity_type = 'offer'
  AND fi.status = 'active'
  AND fi.featured_until > NOW();

-- Clear stale featured status for offers
UPDATE offers 
SET is_featured = false, featured_until = NULL
WHERE id NOT IN (
  SELECT entity_id FROM featured_items 
  WHERE entity_type = 'offer' 
    AND status = 'active' 
    AND featured_until > NOW()
);

-- Fix all shops
UPDATE shops s 
SET 
  is_featured = true,
  featured_until = fi.featured_until
FROM featured_items fi
WHERE s.id = fi.entity_id 
  AND fi.entity_type = 'shop'
  AND fi.status = 'active'
  AND fi.featured_until > NOW();

-- Clear stale featured status for shops
UPDATE shops 
SET is_featured = false, featured_until = NULL
WHERE id NOT IN (
  SELECT entity_id FROM featured_items 
  WHERE entity_type = 'shop' 
    AND status = 'active' 
    AND featured_until > NOW()
);

-- Create function to keep entity tables in sync with featured_items
CREATE OR REPLACE FUNCTION sync_featured_status()
RETURNS TRIGGER AS $$
DECLARE
  should_be_featured BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Determine if should be featured (active + not expired)
    should_be_featured := (NEW.status = 'active' AND NEW.featured_until > NOW());
    
    -- Update entity table
    IF NEW.entity_type = 'product' THEN
      UPDATE products SET 
        is_featured = should_be_featured,
        featured_until = CASE WHEN should_be_featured THEN NEW.featured_until ELSE NULL END
      WHERE id = NEW.entity_id;
    ELSIF NEW.entity_type = 'offer' THEN
      UPDATE offers SET 
        is_featured = should_be_featured,
        featured_until = CASE WHEN should_be_featured THEN NEW.featured_until ELSE NULL END
      WHERE id = NEW.entity_id;
    ELSIF NEW.entity_type = 'shop' THEN
      UPDATE shops SET 
        is_featured = should_be_featured,
        featured_until = CASE WHEN should_be_featured THEN NEW.featured_until ELSE NULL END
      WHERE id = NEW.entity_id;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Clear featured status when removed from featured_items
    IF OLD.entity_type = 'product' THEN
      UPDATE products SET is_featured = false, featured_until = NULL WHERE id = OLD.entity_id;
    ELSIF OLD.entity_type = 'offer' THEN
      UPDATE offers SET is_featured = false, featured_until = NULL WHERE id = OLD.entity_id;
    ELSIF OLD.entity_type = 'shop' THEN
      UPDATE shops SET is_featured = false, featured_until = NULL WHERE id = OLD.entity_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically sync featured status
DROP TRIGGER IF EXISTS sync_featured_entities_trigger ON featured_items;
CREATE TRIGGER sync_featured_entities_trigger
AFTER INSERT OR UPDATE OR DELETE ON featured_items
FOR EACH ROW EXECUTE FUNCTION sync_featured_status();