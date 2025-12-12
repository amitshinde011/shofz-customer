export type StructuredMessageType = 'QUOTE' | 'PAYMENT_REQUEST' | 'LOCATION_SHARE' | 'TEXT';

export interface QuoteData {
  quoted_price: number;
  estimated_delivery_days?: number;
  response_message?: string;
}

export interface PaymentRequestData {
  amount: number;
  expires_at: string;
  payment_request_id: string;
  description?: string;
}

export interface LocationShareData {
  lat: number;
  lng: number;
  address?: string;
  formattedAddress?: string;
}

export interface ParsedMessage {
  type: StructuredMessageType;
  data: QuoteData | PaymentRequestData | LocationShareData | string;
  raw: string;
}

export const parseMessage = (messageText: string): ParsedMessage => {
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(messageText);
    
    // Check if it's a structured message with type and data
    if (parsed.type && parsed.data) {
      return {
        type: parsed.type,
        data: parsed.data,
        raw: messageText
      };
    }
  } catch (e) {
    // Not JSON, treat as regular text
  }
  
  // Return as regular text message
  return {
    type: 'TEXT',
    data: messageText,
    raw: messageText
  };
};

export const isQuoteMessage = (parsed: ParsedMessage): parsed is ParsedMessage & { data: QuoteData } => {
  return parsed.type === 'QUOTE';
};

export const isPaymentRequestMessage = (parsed: ParsedMessage): parsed is ParsedMessage & { data: PaymentRequestData } => {
  return parsed.type === 'PAYMENT_REQUEST';
};

export const isLocationShareMessage = (parsed: ParsedMessage): parsed is ParsedMessage & { data: LocationShareData } => {
  return parsed.type === 'LOCATION_SHARE';
};
