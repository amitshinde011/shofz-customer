import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import {
  generateSignature,
  formatPhonePeAmount,
  getPhonePeBaseUrl,
} from "../_shared/phonepe-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { payment_transaction_id, reason } = await req.json();

    if (!payment_transaction_id) {
      throw new Error("payment_transaction_id is required");
    }

    // Fetch transaction
    const { data: transaction, error: txnError } = await supabaseClient
      .from("payment_transactions")
      .select("*, shops!inner(owner_id)")
      .eq("id", payment_transaction_id)
      .single();

    if (txnError || !transaction) {
      throw new Error("Transaction not found");
    }

    // Verify ownership or admin
    if (transaction.shops.owner_id !== user.id) {
      // Check if user is admin
      const { data: isAdmin } = await supabaseClient.rpc("is_admin");
      if (!isAdmin) {
        throw new Error("Unauthorized");
      }
    }

    // Check if transaction is eligible for refund
    if (transaction.status !== "success") {
      throw new Error("Only successful payments can be refunded");
    }

    if (transaction.status === "refunded") {
      throw new Error("Transaction already refunded");
    }

    // PhonePe credentials
    const merchantId = Deno.env.get("PHONEPE_MERCHANT_ID") || "";
    const saltKey = Deno.env.get("PHONEPE_SALT_KEY") || "";
    const saltIndex = Deno.env.get("PHONEPE_SALT_INDEX") || "1";
    const isUAT = Deno.env.get("PHONEPE_UAT_MODE") === "true";

    // Generate unique refund transaction ID
    const refundTransactionId = `REFUND_${transaction.gateway_order_id}_${Date.now()}`;

    // Build refund request
    const refundRequest = {
      merchantId,
      merchantTransactionId: transaction.gateway_order_id,
      originalTransactionId: transaction.gateway_transaction_id,
      amount: formatPhonePeAmount(Number(transaction.final_amount)),
      callbackUrl: Deno.env.get("PHONEPE_WEBHOOK_URL") || "",
    };

    const payloadString = JSON.stringify(refundRequest);
    const base64Payload = btoa(payloadString);

    // Generate X-VERIFY signature
    const xVerify = await generateSignature(
      base64Payload,
      "/pg/v1/refund",
      saltKey,
      saltIndex
    );

    // Call PhonePe refund API
    const phonePeUrl = `${getPhonePeBaseUrl(isUAT)}/pg/v1/refund`;
    const phonePeResponse = await fetch(phonePeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
      },
      body: JSON.stringify({
        request: base64Payload,
      }),
    });

    const phonePeData = await phonePeResponse.json();

    console.log(
      JSON.stringify({
        level: "info",
        function: "initiate-refund",
        transaction_id: transaction.id,
        refund_transaction_id: refundTransactionId,
        refund_response: phonePeData,
        timestamp: new Date().toISOString(),
      })
    );

    if (!phonePeData.success) {
      throw new Error(phonePeData.message || "Refund initiation failed");
    }

    // Update transaction status
    await supabaseClient
      .from("payment_transactions")
      .update({
        status: "refunded",
        gateway_response: {
          ...transaction.gateway_response,
          refund: phonePeData,
        },
      })
      .eq("id", transaction.id);

    // Reverse credit allocation
    const { data: shopCredits } = await supabaseClient
      .from("shop_credits")
      .select("total_credits")
      .eq("shop_id", transaction.shop_id)
      .single();

    if (shopCredits) {
      const newBalance = shopCredits.total_credits - transaction.credits_awarded;

      await supabaseClient
        .from("shop_credits")
        .update({
          total_credits: Math.max(0, newBalance),
          updated_at: new Date().toISOString(),
        })
        .eq("shop_id", transaction.shop_id);

      // Create negative credit transaction
      await supabaseClient.from("credit_transactions").insert({
        shop_id: transaction.shop_id,
        transaction_type: "refund",
        amount: -transaction.credits_awarded,
        balance_after: Math.max(0, newBalance),
        reference_type: "payment_transaction",
        reference_id: transaction.id,
        payment_transaction_id: transaction.id,
        description: `Refund for transaction ${transaction.gateway_order_id}. Reason: ${reason || "Refund requested"}`,
        created_by: user.id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Refund processed successfully",
        transaction_id: transaction.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(
      JSON.stringify({
        level: "error",
        function: "initiate-refund",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
