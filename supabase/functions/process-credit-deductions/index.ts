import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeaturedItem {
  id: string;
  shop_id: string;
  entity_id: string;
  entity_type: string;
  daily_cost: number;
  credits_consumed: number;
  total_credits_allocated: number;
  status: string;
  featured_until: string;
  last_deduction_at: string | null;
  version?: number;
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
          persistSession: false,
        },
      }
    );

    console.log('[CREDIT-DEDUCTION] Starting credit deduction process...');
    console.log('[CREDIT-DEDUCTION] Timestamp:', new Date().toISOString());

    // Get all active featured items that need deduction
    const { data: featuredItems, error: fetchError } = await supabaseClient
      .from('featured_items')
      .select('*')
      .eq('status', 'active')
      .lt('featured_until', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()) // Not expired yet
      .or(`last_deduction_at.is.null,last_deduction_at.lt.${new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()}`);

    if (fetchError) {
      console.error('[CREDIT-DEDUCTION] Error fetching featured items:', fetchError);
      throw fetchError;
    }

    console.log(`[CREDIT-DEDUCTION] Found ${featuredItems?.length || 0} featured items to process`);

    const results = {
      processed: 0,
      deactivated: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const item of (featuredItems as FeaturedItem[]) || []) {
      try {
        console.log(`Processing featured item ${item.id} for shop ${item.shop_id}`);

      // Check if item has expired
      if (new Date(item.featured_until) <= new Date()) {
        console.log(`Item ${item.id} has expired, deactivating...`);
        await deactivateFeaturedItem(supabaseClient, item);
        results.deactivated++;
        continue;
      }

        // Get shop credits and check expiration
        const { data: shopCredits, error: creditsError } = await supabaseClient
          .from('shop_credits')
          .select('total_credits, reserved_credits, credits_expire_at')
          .eq('shop_id', item.shop_id)
          .single();

        if (creditsError) {
          console.error(`[CREDIT-DEDUCTION] Error fetching credits for shop ${item.shop_id}:`, creditsError);
          results.errors++;
          continue;
        }

        // Check if credits have expired
        if (shopCredits?.credits_expire_at && new Date(shopCredits.credits_expire_at) < new Date()) {
          console.log(`[CREDIT-DEDUCTION] Credits expired for shop ${item.shop_id}, deactivating item ${item.id}`);
          
          // Send notification
          const { data: shopData } = await supabaseClient
            .from('shops')
            .select('owner_id, name')
            .eq('id', item.shop_id)
            .single();

          if (shopData) {
            await supabaseClient
              .from('notifications')
              .insert({
                user_id: shopData.owner_id,
                type: 'credit_expiration',
                title: 'Credits Expired',
                message: `Your featured item has been deactivated due to expired credits.`,
                is_read: false
              });
          }

          await deactivateFeaturedItem(supabaseClient, item);
          results.deactivated++;
          continue;
        }

        const availableCredits = (shopCredits?.total_credits || 0) - (shopCredits?.reserved_credits || 0);

        // Check if enough credits available
        if (availableCredits < item.daily_cost) {
          console.log(`Insufficient credits for item ${item.id}, deactivating...`);
          await deactivateFeaturedItem(supabaseClient, item);
          results.deactivated++;
          
          // Create notification for shop owner
          const { data: shop } = await supabaseClient
            .from('shops')
            .select('owner_id, name')
            .eq('id', item.shop_id)
            .single();

          if (shop) {
            await supabaseClient.rpc('create_notification', {
              p_user_id: shop.owner_id,
              p_type: 'credit_alert',
              p_title: 'Featured Item Deactivated',
              p_message: `Your featured ${item.entity_type} was deactivated due to insufficient credits.`,
              p_related_id: item.entity_id,
            });
          }
          
          continue;
        }

        // Move credits from reserved to consumed (NO deduction from total_credits)
        const newCreditsConsumed = item.credits_consumed + item.daily_cost;
        const newReservedCredits = Math.max(0, (shopCredits?.reserved_credits || 0) - item.daily_cost);
        const currentTotalCredits = shopCredits?.total_credits || 0;

        // Update shop credits - only move from reserved to consumed
        const { error: updateCreditsError } = await supabaseClient
          .from('shop_credits')
          .update({
            reserved_credits: newReservedCredits,  // Reduce reserved credits
            updated_at: new Date().toISOString(),
          })
          .eq('shop_id', item.shop_id);

        if (updateCreditsError) {
          console.error(`Error updating credits for shop ${item.shop_id}:`, updateCreditsError);
          results.errors++;
          continue;
        }

        // Get shop owner for created_by field
        const { data: shop } = await supabaseClient
          .from('shops')
          .select('owner_id')
          .eq('id', item.shop_id)
          .single();

        // Create credit transaction record (for audit trail - amount is 0 since already paid upfront)
        const newAvailableCredits = currentTotalCredits - newReservedCredits;
        const { error: transactionError } = await supabaseClient
          .from('credit_transactions')
          .insert({
            shop_id: item.shop_id,
            transaction_type: 'deduction',
            amount: 0,  // No actual deduction - just moving reserved to consumed
            balance_after: newAvailableCredits,
            reference_type: 'featured_item',
            reference_id: item.id,
            description: `Daily consumption tracking for featured ${item.entity_type} (${item.credits_consumed + item.daily_cost}/${item.total_credits_allocated} consumed)`,
            created_by: shop?.owner_id || null,
          });

        if (transactionError) {
          console.error(`Error creating transaction for item ${item.id}:`, transactionError);
        }

        // Create deduction record for audit trail
        const { error: deductionError } = await supabaseClient
          .from('featured_item_deductions')
          .insert({
            featured_item_id: item.id,
            deduction_date: new Date().toISOString().split('T')[0],
            credits_deducted: item.daily_cost,
            balance_after: newAvailableCredits,
          });

        if (deductionError) {
          console.error(`Error creating deduction record for item ${item.id}:`, deductionError);
        }

        // Update featured item with optimistic locking
        const { error: updateItemError } = await supabaseClient
          .from('featured_items')
          .update({
            credits_consumed: newCreditsConsumed,
            last_deduction_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: (item.version || 1) + 1,
          })
          .eq('id', item.id)
          .eq('version', item.version || 1)
          .eq('status', 'active');  // Prevent updating cancelled items

        if (updateItemError) {
          if (updateItemError.code === 'PGRST116') {
            // Concurrent update detected - another process already updated this item
            console.log(`[CREDIT-DEDUCTION] Concurrent update detected for item ${item.id}, skipping...`);
            continue;
          }
          console.error(`Error updating featured item ${item.id}:`, updateItemError);
          results.errors++;
          continue;
        }

        results.processed++;
        results.details.push({
          item_id: item.id,
          shop_id: item.shop_id,
          credits_moved_from_reserved: item.daily_cost,
          credits_consumed: newCreditsConsumed,
          remaining_reserved: newReservedCredits,
        });

        console.log(`Successfully processed item ${item.id}`);
      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error);
        results.errors++;
      }
    }

    console.log('Credit deduction process completed:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in process-credit-deductions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function deactivateFeaturedItem(supabaseClient: any, item: FeaturedItem) {
  console.log(`Deactivating featured item ${item.id}`);

  // Calculate unused credits
  const unusedCredits = item.total_credits_allocated - item.credits_consumed;

  // Update featured item status
  await supabaseClient
    .from('featured_items')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', item.id);

  // Release reserved credits
  if (unusedCredits > 0) {
    const { data: currentCredits } = await supabaseClient
      .from('shop_credits')
      .select('reserved_credits')
      .eq('shop_id', item.shop_id)
      .single();

    if (currentCredits) {
      await supabaseClient
        .from('shop_credits')
        .update({
          reserved_credits: Math.max(0, currentCredits.reserved_credits - unusedCredits),
          updated_at: new Date().toISOString(),
        })
        .eq('shop_id', item.shop_id);
    }
  }

  // Update the entity (offer or product) to remove featured status
  if (item.entity_type === 'offer') {
    await supabaseClient
      .from('offers')
      .update({
        is_featured: false,
        featured_until: null,
      })
      .eq('id', item.entity_id);
  } else if (item.entity_type === 'product') {
    await supabaseClient
      .from('products')
      .update({
        is_featured: false,
        featured_until: null,
      })
      .eq('id', item.entity_id);
  } else if (item.entity_type === 'shop') {
    await supabaseClient
      .from('shops')
      .update({
        is_featured: false,
        featured_until: null,
      })
      .eq('id', item.entity_id);
  }

  console.log(`Featured item ${item.id} deactivated, ${unusedCredits} credits released`);
}
