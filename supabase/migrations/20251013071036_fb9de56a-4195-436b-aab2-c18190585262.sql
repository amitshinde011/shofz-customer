-- Add is_featured and featured_until columns to shops table
ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;

-- Add index for performance on featured shops queries
CREATE INDEX IF NOT EXISTS idx_shops_featured 
ON shops(is_featured, featured_until) 
WHERE is_featured = true;

-- Ensure feature_shop credit cost exists
INSERT INTO credit_costs (action_type, cost_per_action, daily_cost, duration_days, description, is_active)
VALUES (
  'feature_shop', 
  0,   -- No upfront cost
  10,  -- 10 credits per day
  30,  -- Default duration
  'Feature your shop to boost visibility and reach more customers',
  true
)
ON CONFLICT (action_type) DO UPDATE
SET is_active = true,
    description = EXCLUDED.description;