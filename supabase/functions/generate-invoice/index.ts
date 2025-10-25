import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRequest {
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

    const { orderId }: InvoiceRequest = await req.json();

    // Fetch order with all details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        customer:users!customer_id(name, email, phone_number, address),
        shop:shops!shop_id(name, email, phone_number, address)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Generate HTML invoice
    const invoiceHtml = generateInvoiceHtml(order);

    // TODO: Convert HTML to PDF using a service like:
    // - PDFShift
    // - html-pdf-node
    // - Puppeteer (requires more setup)
    
    // For now, return a mock response
    // In production, you would:
    // 1. Convert HTML to PDF
    // 2. Upload PDF to Supabase Storage
    // 3. Return the public URL

    return new Response(
      JSON.stringify({
        success: true,
        invoiceUrl: '#', // Would be actual PDF URL
        fileName: `invoice-${order.order_number}.pdf`,
        html: invoiceHtml,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function generateInvoiceHtml(order: any): string {
  const items = order.items || [];
  const subtotal = items.reduce((sum: number, item: any) => 
    sum + (item.price * item.quantity), 0
  );
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice - ${order.order_number}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .info-block { width: 45%; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .totals { text-align: right; margin-top: 20px; }
        .totals table { width: 300px; margin-left: auto; }
        .total-row { font-weight: bold; font-size: 1.2em; }
        .footer { margin-top: 50px; text-align: center; color: #666; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${order.shop.name}</h1>
        <p>${order.shop.address}</p>
        <p>Email: ${order.shop.email} | Phone: ${order.shop.phone_number}</p>
      </div>

      <div class="info-section">
        <div class="info-block">
          <h3>Bill To:</h3>
          <p><strong>${order.customer.name}</strong></p>
          <p>${order.customer.address || 'N/A'}</p>
          <p>Email: ${order.customer.email}</p>
          <p>Phone: ${order.customer.phone_number}</p>
        </div>
        <div class="info-block">
          <h3>Invoice Details:</h3>
          <p><strong>Invoice #:</strong> ${order.order_number}</p>
          <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${order.status}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>₹${item.price.toFixed(2)}</td>
              <td>₹${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td>₹${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Tax (18% GST):</td>
            <td>₹${tax.toFixed(2)}</td>
          </tr>
          <tr class="total-row">
            <td>Total:</td>
            <td>₹${total.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>This is a computer-generated invoice and does not require a signature.</p>
      </div>
    </body>
    </html>
  `;
}
