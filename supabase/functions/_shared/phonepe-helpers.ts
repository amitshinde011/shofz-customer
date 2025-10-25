import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

export interface PhonePePaymentRequest {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number;
  redirectUrl: string;
  redirectMode: string;
  callbackUrl: string;
  paymentInstrument: {
    type: string;
  };
}

export interface PhonePeResponse {
  success: boolean;
  code: string;
  message: string;
  data?: {
    merchantId: string;
    merchantTransactionId: string;
    transactionId: string;
    amount: number;
    state: string;
    responseCode: string;
    paymentInstrument?: {
      type: string;
      cardType?: string;
      pgTransactionId?: string;
      bankTransactionId?: string;
      pgAuthorizationCode?: string;
      arn?: string;
      bankId?: string;
      utr?: string;
    };
  };
}

/**
 * Generate SHA256 + Base64 signature for PhonePe API
 */
export async function generateSignature(
  payload: string,
  endpoint: string,
  saltKey: string,
  saltIndex: string
): Promise<string> {
  const message = `${payload}${endpoint}${saltKey}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hashHex}###${saltIndex}`;
}

/**
 * Verify webhook signature from PhonePe
 */
export async function verifySignature(
  response: string,
  xVerify: string,
  saltKey: string,
  saltIndex: string
): Promise<boolean> {
  const expectedSignature = await generateSignature(response, "", saltKey, saltIndex);
  return expectedSignature === xVerify;
}

/**
 * Generate unique merchant transaction ID
 */
export function createMerchantTransactionId(shopId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `LCBIZ_${shopId.substring(0, 8)}_${timestamp}_${random}`;
}

/**
 * Convert rupees to paise (PhonePe requires amount in paise)
 */
export function formatPhonePeAmount(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Parse PhonePe base64 encoded response
 */
export function parsePhonePeResponse(base64Response: string): PhonePeResponse {
  const decoded = atob(base64Response);
  return JSON.parse(decoded);
}

/**
 * Get PhonePe API base URL based on environment
 */
export function getPhonePeBaseUrl(isUAT: boolean): string {
  return isUAT
    ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
    : "https://api.phonepe.com/apis/hermes";
}

/**
 * Map PhonePe payment state to our payment status
 */
export function mapPhonePeStateToStatus(state: string): string {
  switch (state) {
    case "COMPLETED":
      return "success";
    case "FAILED":
      return "failed";
    case "PENDING":
      return "pending";
    default:
      return "initiated";
  }
}
