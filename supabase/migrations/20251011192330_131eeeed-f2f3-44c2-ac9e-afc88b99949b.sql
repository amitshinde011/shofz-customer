-- Update the can_customer_review_shop function to allow reviews for completed inquiries
-- even if there's no formal inquiry_response record

CREATE OR REPLACE FUNCTION can_customer_review_shop(
    p_customer_id UUID,
    p_shop_id UUID,
    p_inquiry_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    has_interaction BOOLEAN;
    already_reviewed BOOLEAN;
BEGIN
    -- Check if customer has had interaction with shop through this inquiry
    -- Either through inquiry_response OR completed/accepted inquiry status
    SELECT EXISTS(
        SELECT 1 FROM inquiries i
        WHERE i.id = p_inquiry_id 
        AND i.customer_id = p_customer_id 
        AND i.shop_id = p_shop_id
        AND (
            -- Has a response from the shop
            EXISTS(
                SELECT 1 FROM inquiry_responses ir 
                WHERE ir.inquiry_id = i.id AND ir.shop_id = p_shop_id
            )
            OR
            -- Or inquiry is completed/accepted (implies interaction)
            i.status IN ('completed', 'accepted')
        )
    ) INTO has_interaction;
    
    -- Check if already reviewed for this inquiry
    SELECT EXISTS(
        SELECT 1 FROM shop_reviews
        WHERE customer_id = p_customer_id 
        AND shop_id = p_shop_id 
        AND inquiry_id = p_inquiry_id
    ) INTO already_reviewed;
    
    RETURN has_interaction AND NOT already_reviewed;
END;
$$;