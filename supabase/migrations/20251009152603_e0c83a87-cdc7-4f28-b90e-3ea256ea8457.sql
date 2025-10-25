-- Drop the old award_credits function without p_user_id parameter
DROP FUNCTION IF EXISTS public.award_credits(uuid, integer, uuid, uuid);

-- The new version with p_user_id will remain