-- Function to update shop rating and review count
CREATE OR REPLACE FUNCTION update_shop_rating_and_reviews(p_shop_id UUID)
RETURNS VOID AS $$
DECLARE
  v_avg_rating NUMERIC;
  v_total_reviews INTEGER;
BEGIN
  -- Calculate average rating and count from approved reviews only
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
    COUNT(*)
  INTO v_avg_rating, v_total_reviews
  FROM shop_reviews
  WHERE shop_id = p_shop_id 
    AND review_status = 'approved';
  
  -- Update the shops table
  UPDATE shops
  SET 
    rating = v_avg_rating,
    total_reviews = v_total_reviews,
    updated_at = now()
  WHERE id = p_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function to call update on shop_reviews changes
CREATE OR REPLACE FUNCTION trigger_update_shop_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_shop_rating_and_reviews(NEW.shop_id);
    RETURN NEW;
  -- Handle DELETE
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_shop_rating_and_reviews(OLD.shop_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS update_shop_stats_trigger ON shop_reviews;
CREATE TRIGGER update_shop_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON shop_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_shop_stats();