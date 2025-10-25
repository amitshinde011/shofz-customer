import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import {
  generateSignature,
  createMerchantTransactionId,
  formatPhonePeAmount,
  getPhonePeBaseUrl,
  PhonePePaymentRequest,
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

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { credit_plan_id, coupon_code } = await req.json();

    if (!credit_plan_id) {
      throw new Error("credit_plan_id is required");
    }

    // Get shop ID for the user
    const { data: shopData, error: shopError } = await supabaseClient
      .from("shops")
      .select("id, is_active")
      .eq("owner_id", user.id)
      .single();

    if (shopError || !shopData) {
      throw new Error("Shop not found");
    }

    if (!shopData.is_active) {
      throw new Error("Shop is not active");
    }

    const shopId = shopData.id;

    // Fetch credit plan
    const { data: creditPlan, error: planError } = await supabaseClient
      .from("credit_plans")
      .select("*")
      .eq("id", credit_plan_id)
      .eq("is_active", true)
      .single();

    if (planError || !creditPlan) {
      throw new Error("Invalid credit plan");
    }

    let finalAmount = Number(creditPlan.price_inr);
    let discountAmount = 0;
    let creditsAwarded = creditPlan.credits_amount + (creditPlan.bonus_credits || 0);
    let couponId = null;

    // Apply coupon if provided
    if (coupon_code) {
      const { data: coupon, error: couponError } = await supabaseClient
        .from("coupons")
        .select("*")
        .eq("code", coupon_code)
        .eq("is_active", true)
        .single();

      if (couponError || !coupon) {
        throw new Error("Invalid or expired coupon");
      }

      // Validate coupon dates
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = new Date(coupon.valid_until);

      if (now < validFrom || now > validUntil) {
        throw new Error("Coupon is not valid at this time");
      }

      // Check usage limits
      if (coupon.max_uses_total && coupon.current_uses >= coupon.max_uses_total) {
        throw new Error("Coupon usage limit reached");
      }

      // Check if plan is applicable
      if (
        coupon.applicable_plans &&
        coupon.applicable_plans.length > 0 &&
        !coupon.applicable_plans.includes(credit_plan_id)
      ) {
        throw new Error("Coupon not applicable to this plan");
      }

      // Calculate discount
      if (coupon.coupon_type === "percentage") {
        discountAmount = (finalAmount * Number(coupon.discount_value)) / 100;
        if (coupon.max_discount_amount) {
          discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount));
        }
      } else {
        discountAmount = Number(coupon.discount_value);
      }

      finalAmount = Math.max(1, finalAmount - discountAmount);
      creditsAwarded += coupon.bonus_credits || 0;
      couponId = coupon.id;
    }

    // Create merchant transaction ID
    const merchantTransactionId = createMerchantTransactionId(shopId);

    // Create payment transaction record
    const { data: transaction, error: txnError } = await supabaseClient
      .from("payment_transactions")
      .insert({
        shop_id: shopId,
        credit_plan_id,
        amount: creditPlan.price_inr,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        currency: "INR",
        payment_gateway: "phonepe",
        status: "initiated",
        gateway_order_id: merchantTransactionId,
        credits_awarded: creditsAwarded,
        coupon_code: coupon_code || null,
      })
      .select()
      .single();

    if (txnError || !transaction) {
      throw new Error("Failed to create payment transaction");
    }

    // BYPASS: Skip PhonePe and mark as successful for testing
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update transaction to success
    await adminClient
      .from("payment_transactions")
      .update({
        status: "success",
        payment_method: "test_bypass",
        gateway_transaction_id: merchantTransactionId,
        gateway_response: { test: true, bypass: true },
        completed_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    // Award credits using RPC function
    const { error: creditError } = await adminClient.rpc("award_credits", {
      p_shop_id: shopId,
      p_credits: creditsAwarded,
      p_payment_transaction_id: transaction.id,
      p_credit_plan_id: credit_plan_id,
    });

    if (creditError) {
      console.error("Failed to award credits:", creditError);
      throw new Error("Failed to award credits");
    }

    // Update coupon usage if applicable
    if (couponId) {
      await adminClient.from("coupon_usage").insert({
        coupon_id: couponId,
        shop_id: shopId,
        payment_transaction_id: transaction.id,
        discount_applied: discountAmount,
        credits_bonus: creditsAwarded - creditPlan.credits_amount - (creditPlan.bonus_credits || 0),
      });

      await adminClient
        .from("coupons")
        .update({
          current_uses: (await adminClient.from("coupons").select("current_uses").eq("id", couponId).single()).data?.current_uses + 1,
        })
        .eq("id", couponId);
    }

    console.log(
      JSON.stringify({
        level: "info",
        function: "initiate-payment",
        shop_id: shopId,
        transaction_id: transaction.id,
        merchant_transaction_id: merchantTransactionId,
        amount: finalAmount,
        credits_awarded: creditsAwarded,
        status: "payment_bypassed_success",
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        merchant_transaction_id: merchantTransactionId,
        credits_awarded: creditsAwarded,
        bypass: true,
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
        function: "initiate-payment",
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
