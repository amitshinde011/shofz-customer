-- Function to complete payment request (called by customer)
CREATE OR REPLACE FUNCTION public.complete_payment_request(
    p_payment_request_id UUID,
    p_upi_transaction_id TEXT DEFAULT NULL,
    p_payment_app TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_inquiry_response_id UUID;
BEGIN
    -- Update payment request
    UPDATE payment_requests 
    SET request_status = 'completed',
        completed_at = now(),
        upi_transaction_id = p_upi_transaction_id,
        preferred_payment_app = p_payment_app
    WHERE id = p_payment_request_id
    RETURNING inquiry_response_id INTO v_inquiry_response_id;
    
    -- Update inquiry response
    UPDATE inquiry_responses 
    SET payment_status = 'completed'
    WHERE id = v_inquiry_response_id;
    
    -- Log analytics
    INSERT INTO payment_analytics (payment_request_id, event_type, payment_app)
    VALUES (p_payment_request_id, 'payment_completed', p_payment_app);
    
    RETURN true;
END;
$$;

-- Function to cleanup expired payment requests (can be called by cron job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    -- Update expired payment requests
    UPDATE payment_requests 
    SET request_status = 'expired'
    WHERE expires_at < now() 
    AND request_status IN ('created', 'sent', 'viewed', 'initiated');
    
    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    
    -- Update inquiry responses
    UPDATE inquiry_responses 
    SET payment_status = 'expired'
    WHERE payment_request_expires_at < now()
    AND payment_status IN ('requested', 'initiated');
    
    RETURN v_expired_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.complete_payment_request(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_payments() TO authenticated;