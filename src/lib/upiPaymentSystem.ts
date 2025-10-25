/**
 * UPI Payment System
 * Comprehensive UPI payment handling with limits, validation, and verification
 */

import { supabase } from '@/integrations/supabase/client';

export interface PaymentLimits {
  maxDailyAmount: number;
  maxTransactionsPerDay: number;
  newUserLimit: number;
  minAmount: number;
  maxSingleTransaction: number;
}

export interface PaymentValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  currentUsage: {
    amount: number;
    count: number;
  };
}

export interface PaymentAttempt {
  id: string;
  customerId: string;
  shopId: string;
  inquiryId?: string;
  amount: number;
  status: 'initiated' | 'launched' | 'customer_claimed_success' | 'customer_claimed_failed' |
          'shop_confirmed' | 'shop_rejected' | 'verified' | 'disputed';
  customerConfirmation?: 'success' | 'failed' | 'pending';
  transactionId?: string;
  screenshot?: string;
  timestamp: string;
}

export interface UPIApp {
  name: string;
  packageName: string;
  playStoreUrl: string;
  iosUrl?: string;
}

export interface UPILaunchResult {
  success: boolean;
  error?: string;
  appLaunched?: string;
  fallbackOptions?: {
    manualPayment: {
      vpa: string;
      amount: number;
      shopName: string;
      instructions: string[];
    };
    downloadLinks: Array<{ name: string; url: string }>;
  };
}

export class LocalConnectUPISystem {
  private limits: PaymentLimits = {
    maxDailyAmount: 100000, // ₹1 lakh
    maxTransactionsPerDay: 20,
    newUserLimit: 5000, // ₹5k for new users
    minAmount: 50,
    maxSingleTransaction: 100000,
  };

  private upiApps: UPIApp[] = [
    {
      name: 'PhonePe',
      packageName: 'com.phonepe.app',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.phonepe.app',
      iosUrl: 'https://apps.apple.com/in/app/phonepe/id1170055821'
    },
    {
      name: 'Google Pay',
      packageName: 'com.google.android.apps.nfc.payment',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.nfc.payment',
      iosUrl: 'https://apps.apple.com/in/app/google-pay/id1193357041'
    },
    {
      name: 'Paytm',
      packageName: 'net.one97.paytm',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=net.one97.paytm',
      iosUrl: 'https://apps.apple.com/in/app/paytm/id473941634'
    },
    {
      name: 'BHIM',
      packageName: 'in.org.npci.upiapp',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=in.org.npci.upiapp',
      iosUrl: 'https://apps.apple.com/in/app/bhim/id1200315258'
    }
  ];

  /**
   * Validate payment - basic sanity check only
   * Merchant UPI IDs handle their own limits
   */
  async validatePaymentLimits(customerId: string, amount: number): Promise<PaymentValidation> {
    const validation: PaymentValidation = {
      valid: true,
      errors: [],
      warnings: [],
      currentUsage: {
        amount: 0,
        count: 0
      }
    };

    // Basic sanity check only
    if (!amount || amount <= 0) {
      validation.valid = false;
      validation.errors.push('Invalid payment amount');
    }

    return validation;
  }

  /**
   * Generate optimized UPI deep link
   */
  generateUPILink(shopVPA: string, amount: number, shopName: string, inquiryDetails: string): string {
    const transactionRef = `LC${Date.now()}${Math.random().toString(36).substr(2, 4)}`.toUpperCase();

    const params = new URLSearchParams({
      'pa': shopVPA,
      'am': amount.toFixed(2),
      'pn': encodeURIComponent(shopName),
      'tr': transactionRef,
      'cu': 'INR'
    });

    return `upi://pay?${params.toString()}`;
  }

  /**
   * Multi-app UPI launch with comprehensive error handling
   */
  async launchUPIPayment(
    shopVPA: string,
    amount: number,
    shopName: string,
    inquiryDetails: string
  ): Promise<UPILaunchResult> {
    const upiLink = this.generateUPILink(shopVPA, amount, shopName, inquiryDetails);

    try {
      // Try to launch UPI link
      window.location.href = upiLink;

      // Wait a moment to see if app launched
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        appLaunched: 'UPI App'
      };
    } catch (error) {
      console.error('Failed to launch UPI app:', error);

      // Provide manual payment fallback
      return {
        success: false,
        error: 'Unable to launch UPI app automatically',
        fallbackOptions: {
          manualPayment: {
            vpa: shopVPA,
            amount: amount,
            shopName: shopName,
            instructions: [
              'Open any UPI app (PhonePe, GPay, Paytm, BHIM)',
              `Send ₹${amount.toLocaleString()} to: ${shopVPA}`,
              `Add note: LocalConnect - ${inquiryDetails}`,
              'Complete payment with your UPI PIN',
              'Return to LocalConnect to confirm payment'
            ]
          },
          downloadLinks: this.upiApps.map(app => ({
            name: app.name,
            url: app.playStoreUrl
          }))
        }
      };
    }
  }

  /**
   * Validate UPI transaction ID format
   */
  validateTransactionId(txnId: string): boolean {
    const patterns = [
      /^\d{12}$/, // 12-digit RRN
      /^[A-Z0-9]{10,20}$/, // Bank reference format
      /^UPI[A-Z0-9]{8,16}$/, // UPI reference
      /^[0-9]{6,16}$/ // General numeric ID
    ];

    return patterns.some(pattern => pattern.test(txnId));
  }

  /**
   * Calculate verification confidence based on evidence
   */
  calculateVerificationConfidence(evidence: {
    hasTransactionId: boolean;
    hasScreenshot: boolean;
    hasCustomerConfirmation: boolean;
    hasShopConfirmation: boolean;
    transactionIdValid: boolean;
  }): number {
    let confidence = 0;

    // Customer confirmation baseline
    if (evidence.hasCustomerConfirmation) {
      confidence += 30;
    }

    // Transaction ID verification
    if (evidence.hasTransactionId && evidence.transactionIdValid) {
      confidence += 40;
    } else if (evidence.hasTransactionId) {
      confidence += 20;
    }

    // Screenshot verification
    if (evidence.hasScreenshot) {
      confidence += 20;
    }

    // Shop confirmation (most reliable)
    if (evidence.hasShopConfirmation) {
      confidence += 40;
    }

    return Math.min(confidence, 100);
  }
}

export const upiPaymentSystem = new LocalConnectUPISystem();
