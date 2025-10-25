import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import {
  generateSignature,
  getPhonePeBaseUrl,
  parsePhonePeResponse,
  mapPhonePeStateToStatus,
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

    const { merchant_transaction_id } = await req.json();

    if (!merchant_transaction_id) {
      throw new Error("merchant_transaction_id is required");
    }

    // Fetch transaction
    const { data: transaction, error: txnError } = await supabaseClient
      .from("payment_transactions")
      .select("*, shops!inner(owner_id)")
      .eq("gateway_order_id", merchant_transaction_id)
      .single();

    if (txnError || !transaction) {
      throw new Error("Transaction not found");
    }

    // Verify ownership
    if (transaction.shops.owner_id !== user.id) {
      throw new Error("Unauthorized access to transaction");
    }

    // If already processed, return cached result
    if (transaction.status === "success" || transaction.status === "failed") {
      return new Response(
        JSON.stringify({
          success: transaction.status === "success",
          status: transaction.status,
          credits_awarded: transaction.credits_awarded,
          transaction_details: transaction,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // PhonePe credentials
    const merchantId = Deno.env.get("PHONEPE_MERCHANT_ID") || "";
    const saltKey = Deno.env.get("PHONEPE_SALT_KEY") || "";
    const saltIndex = Deno.env.get("PHONEPE_SALT_INDEX") || "1";
    const isUAT = Deno.env.get("PHONEPE_UAT_MODE") === "true";

    // Check payment status with PhonePe
    const statusEndpoint = `/pg/v1/status/${merchantId}/${merchant_transaction_id}`;
    const xVerify = await generateSignature(
      "",
      statusEndpoint,
      saltKey,
      saltIndex
    );

    const phonePeUrl = `${getPhonePeBaseUrl(isUAT)}${statusEndpoint}`;
    const phonePeResponse = await fetch(phonePeUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
      },
    });

    const phonePeData = await phonePeResponse.json();

    console.log(
      JSON.stringify({
        level: "info",
        function: "verify-payment",
        merchant_transaction_id,
        phonepe_response: phonePeData,
        timestamp: new Date().toISOString(),
      })
    );

    if (!phonePeData.success) {
      throw new Error(phonePeData.message || "Payment verification failed");
    }

    const paymentState = phonePeData.data?.state || "PENDING";
    const newStatus = mapPhonePeStateToStatus(paymentState);

    // Update transaction
    const updateData: any = {
      status: newStatus,
      gateway_response: phonePeData,
      gateway_transaction_id: phonePeData.data?.transactionId,
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

      // Update coupon usage if applicable
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
          function: "verify-payment",
          shop_id: transaction.shop_id,
          transaction_id: transaction.id,
          credits_awarded: transaction.credits_awarded,
          status: "credits_awarded",
          timestamp: new Date().toISOString(),
        })
      );
    }

    return new Response(
      JSON.stringify({
        success: newStatus === "success",
        status: newStatus,
        credits_awarded: newStatus === "success" ? transaction.credits_awarded : 0,
        transaction_details: {
          ...transaction,
          status: newStatus,
        },
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
        function: "verify-payment",
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
