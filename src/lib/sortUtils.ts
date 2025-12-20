/**
 * Client-side sorting utilities for featured items
 * Items are fetched by distance first, then re-sorted to put featured items at the top
 * while preserving relative order within featured/unfeatured groups
 */

/**
 * Sort items to put featured items first while preserving original order within groups
 * @param items - Array of items with is_featured property
 * @returns Sorted array with featured items first
 */
export function sortFeaturedFirst<T extends { is_featured?: boolean }>(items: T[]): T[] {
  if (!items || items.length === 0) return items;
  
  // Separate into featured and non-featured, preserving original order
  const featured: T[] = [];
  const nonFeatured: T[] = [];
  
  for (const item of items) {
    if (item.is_featured) {
      featured.push(item);
    } else {
      nonFeatured.push(item);
    }
  }
  
  // Return featured first, then non-featured (each group maintains original order)
  return [...featured, ...nonFeatured];
}

/**
 * Sort shops by featured first, preserving distance order within groups
 */
export function sortShopsFeaturedFirst<T extends { is_featured?: boolean; distance_km?: number }>(shops: T[]): T[] {
  return sortFeaturedFirst(shops);
}

/**
 * Sort products by featured first, preserving original order within groups
 */
export function sortProductsFeaturedFirst<T extends { is_featured?: boolean }>(products: T[]): T[] {
  return sortFeaturedFirst(products);
}

/**
 * Sort offers by featured first, preserving original order within groups
 */
export function sortOffersFeaturedFirst<T extends { is_featured?: boolean }>(offers: T[]): T[] {
  return sortFeaturedFirst(offers);
}
