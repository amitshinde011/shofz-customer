import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { payment_request_id } = await req.json();

    console.log('Processing payment notification for:', payment_request_id);

    // Fetch payment request details
    const { data: paymentRequest, error: fetchError } = await supabaseClient
      .from('payment_requests')
      .select(`
        *,
        shop:shops(name, logo_url),
        inquiry:inquiries(product_name, description)
      `)
      .eq('id', payment_request_id)
      .single();

    if (fetchError) {
      console.error('Error fetching payment request:', fetchError);
      throw fetchError;
    }

    // Create in-app notification for customer
    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: paymentRequest.customer_id,
        type: 'payment_request',
        title: 'Payment Request Received',
        message: `${paymentRequest.shop.name} has requested payment of ₹${paymentRequest.amount} for ${paymentRequest.inquiry.product_name}`,
        related_id: payment_request_id
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      throw notificationError;
    }

    // Update payment request status to 'sent'
    const { error: updateError } = await supabaseClient
      .from('payment_requests')
      .update({
        request_status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', payment_request_id);

    if (updateError) {
      console.error('Error updating payment request:', updateError);
      throw updateError;
    }

    console.log('Payment notification sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-payment-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
