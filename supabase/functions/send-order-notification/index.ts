import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderNotificationRequest {
  orderId: string;
  status: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { orderId, status }: OrderNotificationRequest = await req.json();

    // Fetch order details with customer info
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        customer:users!customer_id(email, name),
        shop:shops!shop_id(name)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Here you would integrate with Resend to send actual emails
    // For now, we'll just log the notification
    console.log('Order notification:', {
      to: order.customer.email,
      orderNumber: order.order_number,
      status,
      shopName: order.shop.name,
    });

    // TODO: Integrate with Resend
    // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    // await resend.emails.send({
    //   from: `${order.shop.name} <orders@yourdomain.com>`,
    //   to: [order.customer.email],
    //   subject: `Order ${order.order_number} - Status Update`,
    //   html: getEmailTemplate(order, status),
    // });

    return new Response(
      JSON.stringify({ success: true, message: 'Notification logged' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-order-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
