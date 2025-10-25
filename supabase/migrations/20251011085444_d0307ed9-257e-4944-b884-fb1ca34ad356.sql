-- Create function to generate transaction IDs
CREATE OR REPLACE FUNCTION public.generate_transaction_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    RETURN 'SFZ' || EXTRACT(EPOCH FROM now())::bigint::text || LPAD(FLOOR(RANDOM() * 1000)::text, 3, '0');
END;
$$;

-- Create function to handle payment request creation
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
    v_transaction_id TEXT;
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
    
    -- Generate unique transaction ID
    v_transaction_id := generate_transaction_id();
    
    -- Create payment request
    INSERT INTO payment_requests (
        inquiry_id,
        inquiry_response_id,
        shop_id,
        customer_id,
        amount,
        description,
        payment_terms,
        platform_transaction_id,
        request_status,
        expires_at
    ) VALUES (
        v_inquiry_id,
        p_inquiry_response_id,
        v_shop_id,
        v_customer_id,
        p_amount,
        p_description,
        p_payment_terms,
        v_transaction_id,
        'created',
        now() + INTERVAL '24 hours'
    ) RETURNING id INTO v_payment_request_id;
    
    -- Update inquiry response
    UPDATE inquiry_responses 
    SET 
        payment_requested = true,
        final_price = p_amount,
        payment_request_timestamp = now(),
        payment_request_expires_at = now() + INTERVAL '24 hours',
        payment_status = 'requested'
    WHERE id = p_inquiry_response_id;
    
    -- Create analytics record
    INSERT INTO payment_analytics (payment_request_id, event_type)
    VALUES (v_payment_request_id, 'request_created');
    
    RETURN v_payment_request_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_payment_request(UUID, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_transaction_id() TO authenticated;