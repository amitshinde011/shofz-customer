-- Change default review status to 'approved' (Google-style auto-approval)
ALTER TABLE shop_reviews 
ALTER COLUMN review_status SET DEFAULT 'approved';

-- Approve all existing pending reviews (one-time migration)
UPDATE shop_reviews 
SET review_status = 'approved' 
WHERE review_status = 'pending';

-- Add comment for documentation
COMMENT ON COLUMN shop_reviews.review_status IS 'Review status: approved (default, auto-published like Google Reviews), rejected (hidden), or pending (manual moderation)';