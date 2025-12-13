/**
 * Centralized offer utility functions for consistent display across the app
 */

export interface OfferForDisplay {
  offer_type?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
}

/**
 * Returns the formatted discount text for an offer
 * Handles all offer types and discount types consistently
 */
export function getOfferDiscountText(offer: OfferForDisplay): string {
  // First check offer_type for special types
  switch (offer.offer_type) {
    case 'bogo':
      return 'BOGO';
    case 'free_shipping':
      return 'FREE SHIPPING';
    case 'bundle':
      return 'BUNDLE DEAL';
    case 'festival':
      return 'SPECIAL OFFER';
    case 'custom':
      return 'OFFER';
    case 'promotion':
      return 'PROMO';
  }

  // Then check discount_type for value-based discounts
  switch (offer.discount_type) {
    case 'percentage':
      return `${offer.discount_value || 0}% OFF`;
    case 'flat_discount':
    case 'fixed': // backward compatibility
      return `₹${offer.discount_value || 0} OFF`;
    case 'buy_x_get_y':
      return 'BUY X GET Y';
    default:
      return offer.discount_value ? `${offer.discount_value} OFF` : 'OFFER';
  }
}

/**
 * Returns a human-readable label for the offer type
 */
export function getOfferTypeLabel(offerType?: string | null): string {
  const typeMap: Record<string, string> = {
    'percentage': 'Percentage Off',
    'flat_discount': 'Flat Discount',
    'fixed_amount': 'Fixed Amount',
    'fixed': 'Fixed Amount',
    'buy_x_get_y': 'Buy X Get Y',
    'bogo': 'Buy One Get One',
    'free_shipping': 'Free Shipping',
    'bundle': 'Bundle Deal',
    'festival': 'Festival Special',
    'custom': 'Custom Offer',
    'promotion': 'Promotion',
    'discount': 'Discount',
  };
  return typeMap[offerType || ''] || offerType || 'Offer';
}
