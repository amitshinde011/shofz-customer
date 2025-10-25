import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import {
  verifySignature,
  parsePhonePeResponse,
  mapPhonePeStateToStatus,
} from "../_shared/phonepe-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-verify",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Basic Auth from PhonePe webhook
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      console.error(
        JSON.stringify({
          level: "error",
          function: "payment-webhook",
          error: "Missing or invalid Authorization header",
          timestamp: new Date().toISOString(),
        })
      );
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Decode and verify credentials
    const base64Credentials = authHeader.split(" ")[1];
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(":");
    
    const expectedUsername = Deno.env.get("PHONEPE_WEBHOOK_USERNAME");
    const expectedPassword = Deno.env.get("PHONEPE_WEBHOOK_PASSWORD");
    
    if (username !== expectedUsername || password !== expectedPassword) {
      console.error(
        JSON.stringify({
          level: "error",
          function: "payment-webhook",
          error: "Invalid webhook credentials",
          timestamp: new Date().toISOString(),
        })
      );
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role for webhook
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { response } = await req.json();
    const xVerify = req.headers.get("X-VERIFY");

    if (!response || !xVerify) {
      throw new Error("Missing required webhook data");
    }

    // Verify signature
    const saltKey = Deno.env.get("PHONEPE_SALT_KEY") || "";
    const saltIndex = Deno.env.get("PHONEPE_SALT_INDEX") || "1";

    const isValid = await verifySignature(response, xVerify, saltKey, saltIndex);

    if (!isValid) {
      console.error(
        JSON.stringify({
          level: "error",
          function: "payment-webhook",
          error: "Invalid signature",
          timestamp: new Date().toISOString(),
        })
      );
      throw new Error("Invalid signature");
    }

    // Parse response
    const phonePeData = parsePhonePeResponse(response);

    if (!phonePeData.success || !phonePeData.data) {
      throw new Error("Invalid PhonePe response");
    }

    const merchantTransactionId = phonePeData.data.merchantTransactionId;
    const paymentState = phonePeData.data.state;
    const newStatus = mapPhonePeStateToStatus(paymentState);

    console.log(
      JSON.stringify({
        level: "info",
        function: "payment-webhook",
        merchant_transaction_id: merchantTransactionId,
        payment_state: paymentState,
        new_status: newStatus,
        timestamp: new Date().toISOString(),
      })
    );

    // Fetch transaction
    const { data: transaction, error: txnError } = await supabaseClient
      .from("payment_transactions")
      .select("*")
      .eq("gateway_order_id", merchantTransactionId)
      .single();

    if (txnError || !transaction) {
      throw new Error("Transaction not found");
    }

    // Idempotency check - if already processed, return success
    if (transaction.status === "success" || transaction.status === "failed") {
      console.log(
        JSON.stringify({
          level: "info",
          function: "payment-webhook",
          merchant_transaction_id: merchantTransactionId,
          message: "Transaction already processed",
          current_status: transaction.status,
          timestamp: new Date().toISOString(),
        })
      );
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update transaction
    const updateData: any = {
      status: newStatus,
      gateway_response: phonePeData,
      gateway_transaction_id: phonePeData.data.transactionId,
    };

    if (newStatus === "success") {
      updateData.completed_at = new Date().toISOString();
    }

    await supabaseClient
      .from("payment_transactions")
      .update(updateData)
      .eq("id", transaction.id);

    // Award credits if payment successful
    if (newStatus === "success") {
      await supabaseClient.rpc("award_credits", {
        p_shop_id: transaction.shop_id,
        p_credits: transaction.credits_awarded,
        p_payment_transaction_id: transaction.id,
        p_credit_plan_id: transaction.credit_plan_id,
      });

      // Update coupon usage
      if (transaction.coupon_code) {
        const { data: coupon } = await supabaseClient
          .from("coupons")
          .select("id, current_uses")
          .eq("code", transaction.coupon_code)
          .single();

        if (coupon) {
          await supabaseClient
            .from("coupons")
            .update({ current_uses: (coupon.current_uses || 0) + 1 })
            .eq("id", coupon.id);

          await supabaseClient.from("coupon_usage").insert({
            coupon_id: coupon.id,
            shop_id: transaction.shop_id,
            payment_transaction_id: transaction.id,
            discount_applied: transaction.discount_amount,
          });
        }
      }

      console.log(
        JSON.stringify({
          level: "info",
          function: "payment-webhook",
          shop_id: transaction.shop_id,
          transaction_id: transaction.id,
          credits_awarded: transaction.credits_awarded,
          status: "credits_awarded",
          timestamp: new Date().toISOString(),
        })
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(
      JSON.stringify({
        level: "error",
        function: "payment-webhook",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
    );

    // Always return 200 to PhonePe to prevent retries on validation errors
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
