export const createQuoteMessage = (data: {
  quoted_price: number;
  estimated_delivery_days?: number;
  response_message?: string;
}): string => {
  return JSON.stringify({
    type: 'QUOTE',
    data
  });
};

export const createPaymentRequestMessage = (data: {
  amount: number;
  expires_at: string;
  payment_request_id: string;
  description?: string;
}): string => {
  return JSON.stringify({
    type: 'PAYMENT_REQUEST',
    data
  });
};
