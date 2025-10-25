export interface PaymentApp {
  id: string;
  name: string;
  deepLink: string;
  webLink: string;
  icon: string;
  logo: string;
  color: string;
  available?: boolean;
}

export const PAYMENT_APPS: PaymentApp[] = [
  {
    id: 'googlepay',
    name: 'Google Pay',
    deepLink: 'tez://upi/pay',
    webLink: 'https://pay.google.com/gp/p/ui/pay',
    icon: '💳',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/512px-Google_Pay_Logo.svg.png',
    color: '#4285f4'
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    deepLink: 'phonepe://pay',
    webLink: 'https://phon.pe/ru_',
    icon: '📱',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/PhonePe_Logo.png/512px-PhonePe_Logo.png',
    color: '#5f259f'
  },
  {
    id: 'paytm',
    name: 'Paytm',
    deepLink: 'paytmmp://upi/pay',
    webLink: 'https://m.paytm.in/pay',
    icon: '💰',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/512px-Paytm_Logo_%28standalone%29.svg.png',
    color: '#002970'
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    deepLink: 'bhim://upi/pay',
    webLink: 'https://www.bhimupi.org.in/',
    icon: '🏛️',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/BHIM_SVG_Logo.svg/512px-BHIM_SVG_Logo.svg.png',
    color: '#ff6b35'
  },
  {
    id: 'cred',
    name: 'CRED',
    deepLink: 'cred://upi/pay',
    webLink: 'https://cred.club/',
    icon: '💎',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/CRED_Logo.png/512px-CRED_Logo.png',
    color: '#000000'
  }
];

export const isMobileDevice = () => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Build UPI payment URL for launching payment apps
 * 
 * NOTE: UPI deep links can only pass text parameters (UPI ID, amount, etc.)
 * They CANNOT embed or pass image data (like QR codes).
 * 
 * For QR code payments:
 * - Display the QR code separately in the UI
 * - Use Web Share API or Capacitor Share to share the QR image
 * - Payment apps will either scan the QR or use the deep link parameters
 * 
 * @param app - Payment app configuration
 * @param paymentDetails - Payment transaction details
 * @returns UPI payment deep link URL
 */
export const buildPaymentUrl = (app: PaymentApp, paymentDetails: {
  upiId: string;
  shopName: string;
  amount: number;
  currency?: string;
  description?: string;
  transactionId?: string;
}) => {
  console.log('🔵 [buildPaymentUrl] Starting UPI URL generation');
  console.log('🔵 [buildPaymentUrl] Raw input:', {
    app: app.name,
    upiId: paymentDetails.upiId,
    shopName: paymentDetails.shopName,
    rawAmount: paymentDetails.amount,
    amountType: typeof paymentDetails.amount,
    currency: paymentDetails.currency,
    description: paymentDetails.description,
    transactionId: paymentDetails.transactionId
  });

  // Ensure amount is formatted with 2 decimal places for UPI compliance
  const formattedAmount = paymentDetails.amount.toFixed(2);
  console.log('🔵 [buildPaymentUrl] Formatted amount:', formattedAmount);
  
  // Build UPI parameters manually to avoid encoding @ in UPI ID
  const transactionRef = paymentDetails.transactionId ? paymentDetails.transactionId.substring(0, 35) : '';
  const params = [
    `pa=${paymentDetails.upiId}`, // DO NOT encode @ symbol
    `pn=${encodeURIComponent(paymentDetails.shopName)}`,
    `am=${formattedAmount}`,
    `cu=${paymentDetails.currency || 'INR'}`,
    transactionRef ? `tr=${transactionRef}` : ''
  ].filter(Boolean).join('&');

  console.log('🔵 [buildPaymentUrl] UPI Parameters:', {
    pa: paymentDetails.upiId,
    pn: paymentDetails.shopName,
    'pn (encoded)': encodeURIComponent(paymentDetails.shopName),
    am: formattedAmount,
    cu: paymentDetails.currency || 'INR',
    tr: paymentDetails.transactionId?.substring(0, 35)
  });

  const isMobile = isMobileDevice();
  console.log('🔵 [buildPaymentUrl] Device type:', isMobile ? 'Mobile' : 'Desktop');
  console.log('🔵 [buildPaymentUrl] User Agent:', navigator.userAgent);

  let finalUrl;
  if (isMobile) {
    finalUrl = `${app.deepLink}?${params}`;
    console.log('🔵 [buildPaymentUrl] Mobile deep link:', app.deepLink);
  } else {
    finalUrl = `upi://pay?${params}`;
    console.log('🔵 [buildPaymentUrl] Desktop UPI scheme');
  }

  console.log('🔵 [buildPaymentUrl] Final URL:', finalUrl);
  console.log('🔵 [buildPaymentUrl] Query string only:', params);
  
  return finalUrl;
};

export const checkAppAvailability = async (deepLink: string): Promise<boolean> => {
  // In a real app with Capacitor, you would check if the app is installed
  // For web, we return true for all popular apps
  return true;
};

export const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};
