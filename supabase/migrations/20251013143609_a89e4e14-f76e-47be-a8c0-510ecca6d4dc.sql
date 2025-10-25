-- Fix create_payment_request function to match actual table schema
CREATE OR REPLACE FUNCTION public.create_payment_request(
    p_inquiry_response_id UUID,
    p_amount NUMERIC,
    p_description TEXT DEFAULT NULL,
    p_payment_terms TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_payment_request_id UUID;
    v_inquiry_id UUID;
    v_shop_id UUID;
    v_customer_id UUID;
BEGIN
    -- Get inquiry details from inquiry_response
    SELECT ir.inquiry_id, ir.shop_id, i.customer_id
    INTO v_inquiry_id, v_shop_id, v_customer_id
    FROM inquiry_responses ir
    JOIN inquiries i ON ir.inquiry_id = i.id
    WHERE ir.id = p_inquiry_response_id;
    
    -- Verify the inquiry response exists
    IF v_inquiry_id IS NULL THEN
        RAISE EXCEPTION 'Inquiry response not found';
    END IF;
    
    -- Verify the user owns the shop
    IF NOT EXISTS (
        SELECT 1 FROM shops 
        WHERE id = v_shop_id AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not own this shop';
    END IF;
    
    -- Create payment request (using only columns that exist in the table)
    INSERT INTO payment_requests (
        inquiry_id,
        shop_id,
        customer_id,
        amount,
        request_status,
        expires_at
    ) VALUES (
        v_inquiry_id,
        v_shop_id,
        v_customer_id,
        p_amount,
        'created',
        now() + INTERVAL '24 hours'
    ) RETURNING id INTO v_payment_request_id;
    
    -- Update inquiry response payment status
    UPDATE inquiry_responses 
    SET payment_status = 'requested',
        payment_request_expires_at = now() + INTERVAL '24 hours'
    WHERE id = p_inquiry_response_id;
    
    RETURN v_payment_request_id;
END;
$$;