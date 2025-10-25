import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewRequest {
  orderId: string;
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

    const { orderId }: ReviewRequest = await req.json();

    // Fetch order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        customer:users!customer_id(email, name),
        shop:shops!shop_id(name, id)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Only send review request for delivered orders
    if (order.status !== 'delivered') {
      throw new Error('Can only request review for delivered orders');
    }

    // Log the review request
    console.log('Review request sent:', {
      to: order.customer.email,
      orderNumber: order.order_number,
      shopName: order.shop.name,
    });

    // TODO: Integrate with Resend to send actual email
    // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    // const reviewUrl = `${Deno.env.get('APP_URL')}/shops/${order.shop.id}/review?order=${orderId}`;
    // 
    // await resend.emails.send({
    //   from: `${order.shop.name} <reviews@yourdomain.com>`,
    //   to: [order.customer.email],
    //   subject: `How was your order? Share your feedback`,
    //   html: `
    //     <h2>Hi ${order.customer.name},</h2>
    //     <p>Thank you for your recent purchase from ${order.shop.name}!</p>
    //     <p>We'd love to hear about your experience. Your feedback helps us improve.</p>
    //     <p><a href="${reviewUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Leave a Review</a></p>
    //     <p>Order #: ${order.order_number}</p>
    //     <p>Thank you for choosing us!</p>
    //   `,
    // });

    return new Response(
      JSON.stringify({ success: true, message: 'Review request logged' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error requesting review:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
