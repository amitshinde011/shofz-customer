import { supabase } from '@/integrations/supabase/client';

export interface PaymentTransactionData {
  inquiry_id: string;
  shop_id: string;
  payment_method: string;
  payment_amount: number;
  payment_screenshot_url?: string;
  payment_notes?: string;
}

/**
 * Create a payment transaction record
 */
export async function createPaymentTransaction(
  data: PaymentTransactionData
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Note: Using 'as any' temporarily until the types are regenerated
    const { data: transaction, error } = await (supabase as any)
      .from('shop_payment_transactions')
      .insert([{
        inquiry_id: data.inquiry_id,
        shop_id: data.shop_id,
        customer_id: user.id,
        payment_method: data.payment_method,
        payment_amount: data.payment_amount,
        payment_screenshot_url: data.payment_screenshot_url,
        payment_status: 'pending',
        payment_notes: data.payment_notes,
        customer_payment_timestamp: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('[PaymentService] Failed to create transaction:', error);
      return { success: false, error: error.message };
    }

    // Send notification to shop owner about payment
    await sendPaymentNotification(data.shop_id, transaction.id);

    return { success: true, data: transaction };
  } catch (error: any) {
    console.error('[PaymentService] Exception creating transaction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get shop payment details
 */
export async function getShopPaymentDetails(shopId: string) {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select(`
        payment_upi_id,
        payment_phone_number,
        payment_qr_code_url,
        accepts_online_payments,
        preferred_payment_methods,
        payment_instructions
      `)
      .eq('id', shopId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[PaymentService] Failed to get payment details:', error);
    return null;
  }
}

/**
 * Upload payment screenshot to storage
 */
export async function uploadPaymentScreenshot(file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `payment_${Date.now()}.${fileExt}`;
    const filePath = `payment-screenshots/${fileName}`;

    // Note: Ensure 'customer-uploads' bucket exists in Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('customer-uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('customer-uploads')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error: any) {
    console.error('[PaymentService] Failed to upload screenshot:', error);
    throw new Error(error.message || 'Failed to upload payment screenshot');
  }
}

/**
 * Send payment notification to shop owner
 */
async function sendPaymentNotification(shopId: string, transactionId: string) {
  try {
    // Get shop owner
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id, name')
      .eq('id', shopId)
      .single();

    if (!shop) return;

    // Create notification (using 'as any' temporarily)
    await (supabase as any)
      .from('notifications')
      .insert([{
        user_id: shop.owner_id,
        type: 'payment',
        title: 'New Payment Received',
        message: `A customer has submitted a payment. Please review and confirm.`,
        related_id: transactionId,
      }]);
  } catch (error) {
    console.error('[PaymentService] Failed to send notification:', error);
  }
}

/**
 * Get customer payment transactions
 */
export async function getCustomerPaymentTransactions(customerId: string) {
  try {
    // Note: Using 'as any' temporarily until types are regenerated
    const { data, error } = await (supabase as any)
      .from('shop_payment_transactions')
      .select(`
        *,
        shops(name, logo_url),
        inquiries(product_name)
      `)
      .eq('customer_id', customerId)
      .order('customer_payment_timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[PaymentService] Failed to get transactions:', error);
    return [];
  }
}
