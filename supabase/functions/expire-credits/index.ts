import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopWithExpiredCredits {
  id: string;
  owner_id: string;
  name: string;
  total_credits: number;
  reserved_credits: number;
  credits_expire_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log(`[CREDIT-EXPIRATION] ${new Date().toISOString()} - Starting credit expiration process`);

    // Find all shops with expired credits
    const { data: expiredShops, error: fetchError } = await supabaseClient
      .from('shop_credits')
      .select(`
        id,
        shop_id,
        total_credits,
        reserved_credits,
        credits_expire_at,
        shops!inner(id, owner_id, name)
      `)
      .not('credits_expire_at', 'is', null)
      .lt('credits_expire_at', new Date().toISOString())
      .gt('total_credits', 0);

    if (fetchError) {
      console.error('[CREDIT-EXPIRATION] Error fetching expired credits:', fetchError);
      throw fetchError;
    }

    console.log(`[CREDIT-EXPIRATION] Found ${expiredShops?.length || 0} shops with expired credits`);

    let processed = 0;
    let errors = 0;
    let itemsDeactivated = 0;

    for (const shop of expiredShops || []) {
      try {
        const shopData = Array.isArray(shop.shops) ? shop.shops[0] : shop.shops;
        const shopId = shop.shop_id;
        const ownerId = shopData.owner_id;
        const shopName = shopData.name;
        const expiredCredits = shop.total_credits;

        console.log(`[CREDIT-EXPIRATION] Processing shop ${shopName} (${shopId}) - ${expiredCredits} credits expired`);

        // Zero out credits
        const { error: updateError } = await supabaseClient
          .from('shop_credits')
          .update({
            total_credits: 0,
            reserved_credits: 0,
            updated_at: new Date().toISOString()
          })
          .eq('shop_id', shopId);

        if (updateError) {
          console.error(`[CREDIT-EXPIRATION] Error updating credits for shop ${shopId}:`, updateError);
          errors++;
          continue;
        }

        // Create expiration transaction record
        const { error: transactionError } = await supabaseClient
          .from('credit_transactions')
          .insert({
            shop_id: shopId,
            transaction_type: 'expiration',
            amount: -expiredCredits,
            balance_after: 0,
            description: `Credits expired on ${new Date(shop.credits_expire_at).toLocaleDateString()}`,
            created_by: ownerId
          });

        if (transactionError) {
          console.error(`[CREDIT-EXPIRATION] Error creating transaction for shop ${shopId}:`, transactionError);
        }

        // Deactivate all active featured items for this shop
        const { data: featuredItems, error: fetchFeaturedError } = await supabaseClient
          .from('featured_items')
          .select('id, entity_type, entity_id')
          .eq('shop_id', shopId)
          .eq('status', 'active');

        if (fetchFeaturedError) {
          console.error(`[CREDIT-EXPIRATION] Error fetching featured items for shop ${shopId}:`, fetchFeaturedError);
        } else if (featuredItems && featuredItems.length > 0) {
          console.log(`[CREDIT-EXPIRATION] Deactivating ${featuredItems.length} featured items for shop ${shopId}`);

          // Deactivate featured items
          const { error: deactivateError } = await supabaseClient
            .from('featured_items')
            .update({ status: 'completed' })
            .eq('shop_id', shopId)
            .eq('status', 'active');

          if (deactivateError) {
            console.error(`[CREDIT-EXPIRATION] Error deactivating featured items:`, deactivateError);
          }

          // Update offers and products to remove featured status
          for (const item of featuredItems) {
            if (item.entity_type === 'offer') {
              await supabaseClient
                .from('offers')
                .update({ is_featured: false, featured_until: null })
                .eq('id', item.entity_id);
            } else if (item.entity_type === 'product') {
              await supabaseClient
                .from('products')
                .update({ is_featured: false, featured_until: null })
                .eq('id', item.entity_id);
            }
          }

          itemsDeactivated += featuredItems.length;
        }

        // Send notification to shop owner
        const { error: notificationError } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: ownerId,
            type: 'credit_expiration',
            title: 'Credits Expired',
            message: `Your ${expiredCredits} credits have expired. Purchase more credits to continue featuring items.`,
            is_read: false
          });

        if (notificationError) {
          console.error(`[CREDIT-EXPIRATION] Error creating notification for shop ${shopId}:`, notificationError);
        }

        processed++;
      } catch (error) {
        console.error(`[CREDIT-EXPIRATION] Error processing shop:`, error);
        errors++;
      }
    }

    console.log(`[CREDIT-EXPIRATION] ${new Date().toISOString()} - Completed: Processed ${processed}, Errors ${errors}, Items deactivated ${itemsDeactivated}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        errors,
        itemsDeactivated,
        message: `Credit expiration completed: ${processed} shops processed, ${itemsDeactivated} items deactivated`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[CREDIT-EXPIRATION] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
