/**
 * Blended ranking utilities for featured items with distance scoring
 * Items are ranked using a combined score of featured status + proximity
 */

/**
 * Configuration for blended ranking
 */
export interface RankingConfig {
  featuredWeight: number;       // Weight for featured boost (0-1)
  distanceWeight: number;       // Weight for distance score (0-1)
  maxDistanceKm: number;        // Maximum distance for scoring (beyond = score 0)
  nearDistanceCutoffKm: number; // Threshold for near vs far bands
}

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  featuredWeight: 0.55,
  distanceWeight: 0.45,
  maxDistanceKm: 50,
  nearDistanceCutoffKm: 30
};

/**
 * Calculate combined score for ranking
 * - distance_score = 1 - min(distance_km, max_distance) / max_distance  
 * - featured_boost = is_featured ? 1.0 : 0.0
 * - score = w_featured * featured_boost + w_distance * distance_score
 */
export function calculateCombinedScore(
  item: { is_featured?: boolean; distance_km?: number },
  config: RankingConfig = DEFAULT_RANKING_CONFIG
): number {
  const distance = item.distance_km ?? config.maxDistanceKm;
  const distanceScore = 1 - Math.min(distance, config.maxDistanceKm) / config.maxDistanceKm;
  const featuredBoost = item.is_featured ? 1.0 : 0.0;
  
  return config.featuredWeight * featuredBoost + config.distanceWeight * distanceScore;
}

/**
 * Sort items with blended ranking: featured + distance scoring
 * Near items first (sorted by combined score), then far items (sorted by combined score)
 * This ensures near shops (even unfeatured) appear before far shops
 */
export function sortWithBlendedRanking<T extends { is_featured?: boolean; distance_km?: number }>(
  items: T[],
  config: Partial<RankingConfig> = {}
): T[] {
  if (!items || items.length === 0) return items;
  
  const finalConfig = { ...DEFAULT_RANKING_CONFIG, ...config };
  
  // Split into near and far based on cutoff
  const nearItems: T[] = [];
  const farItems: T[] = [];
  
  for (const item of items) {
    const distance = item.distance_km ?? 0;
    if (distance <= finalConfig.nearDistanceCutoffKm) {
      nearItems.push(item);
    } else {
      farItems.push(item);
    }
  }
  
  // Sort function by combined score (descending - higher score first)
  const sortByScore = (a: T, b: T) => 
    calculateCombinedScore(b, finalConfig) - calculateCombinedScore(a, finalConfig);
  
  nearItems.sort(sortByScore);
  farItems.sort(sortByScore);
  
  // Return near items first, then far items
  return [...nearItems, ...farItems];
}

/**
 * Sort shops with blended ranking
 */
export function sortShopsBlended<T extends { is_featured?: boolean; distance_km?: number }>(
  shops: T[], 
  config?: Partial<RankingConfig>
): T[] {
  return sortWithBlendedRanking(shops, config);
}

/**
 * Sort products with blended ranking
 * Products may have distance_km from their parent shop
 */
export function sortProductsBlended<T extends { is_featured?: boolean; distance_km?: number }>(
  products: T[],
  config?: Partial<RankingConfig>
): T[] {
  return sortWithBlendedRanking(products, config);
}

/**
 * Sort offers with blended ranking
 * Offers inherit distance_km from their parent shop
 */
export function sortOffersBlended<T extends { is_featured?: boolean; distance_km?: number }>(
  offers: T[],
  config?: Partial<RankingConfig>
): T[] {
  return sortWithBlendedRanking(offers, config);
}

/**
 * Legacy function for backward compatibility
 * Simple featured-first sorting without distance consideration
 * Use this only for items that don't have distance information
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
 * Enrich items with distance_km from nearby shops data
 * Helper function to add distance to products/offers based on their shop_id
 */
export function enrichWithDistance<T extends { shop_id: string }>(
  items: T[],
  nearbyShops: Array<{ id: string; distance_km?: number }>
): (T & { distance_km?: number })[] {
  const shopDistanceMap = new Map<string, number>();
  for (const shop of nearbyShops) {
    if (shop.distance_km !== undefined) {
      shopDistanceMap.set(shop.id, shop.distance_km);
    }
  }
  
  return items.map(item => ({
    ...item,
    distance_km: shopDistanceMap.get(item.shop_id)
  }));
}
