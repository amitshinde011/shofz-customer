/**
 * Delivery Calculation Utilities
 * Handles delivery availability checks, cost calculations, and messaging
 */

import { Coordinates, calculateDistance, formatDistance } from './distanceCalculation';

export interface DeliveryAvailability {
  isAvailable: boolean;
  distanceKm: number;
  formattedDistance: string;
  deliveryCoverageKm: number;
  deliveryCharge?: number;
  isFreeDelivery?: boolean;
  message: string;
}

/**
 * Check if customer location is within delivery radius
 * and calculate delivery availability details
 */
export function checkDeliveryAvailability(
  shopLocation: Coordinates,
  customerLocation: Coordinates,
  deliveryCoverageKm: number = 5,
  deliveryChargePerKm?: number,
  freeDeliveryAbove?: number,
  orderTotal?: number
): DeliveryAvailability {
  const distanceKm = calculateDistance(shopLocation, customerLocation);
  const formattedDistance = formatDistance(distanceKm);
  const isAvailable = distanceKm <= deliveryCoverageKm;

  let deliveryCharge: number | undefined;
  let isFreeDelivery = false;

  if (isAvailable && deliveryChargePerKm !== undefined) {
    // Calculate base delivery charge
    deliveryCharge = Math.round(distanceKm * deliveryChargePerKm);

    // Check if order qualifies for free delivery
    if (freeDeliveryAbove !== undefined && orderTotal !== undefined) {
      isFreeDelivery = orderTotal >= freeDeliveryAbove;
      if (isFreeDelivery) {
        deliveryCharge = 0;
      }
    }
  }

  const message = formatDeliveryMessage(isAvailable, distanceKm, deliveryCoverageKm);

  return {
    isAvailable,
    distanceKm,
    formattedDistance,
    deliveryCoverageKm,
    deliveryCharge,
    isFreeDelivery,
    message,
  };
}

/**
 * Calculate delivery charge based on distance and pricing configuration
 */
export function calculateDeliveryCharge(
  distanceKm: number,
  chargePerKm?: number,
  freeDeliveryThreshold?: number,
  orderTotal?: number
): number {
  if (!chargePerKm) {
    return 0;
  }

  // Check if order qualifies for free delivery
  if (freeDeliveryThreshold !== undefined && orderTotal !== undefined) {
    if (orderTotal >= freeDeliveryThreshold) {
      return 0;
    }
  }

  return Math.round(distanceKm * chargePerKm);
}

/**
 * Format delivery availability message for UI display
 */
export function formatDeliveryMessage(
  isAvailable: boolean,
  distanceKm: number,
  maxRadiusKm: number
): string {
  const formattedDistance = formatDistance(distanceKm);

  if (isAvailable) {
    return `Delivery available to your location (${formattedDistance} away)`;
  } else {
    const formattedMax = formatDistance(maxRadiusKm);
    return `Outside delivery area (${formattedDistance} away, max ${formattedMax})`;
  }
}

/**
 * Determine if order qualifies for free delivery
 */
export function isFreeDeliveryEligible(
  orderTotal: number,
  freeDeliveryThreshold?: number
): boolean {
  if (freeDeliveryThreshold === undefined) {
    return false;
  }
  return orderTotal >= freeDeliveryThreshold;
}

/**
 * Check if delivery radius covers customer location (simple boolean check)
 */
export function isWithinDeliveryRadius(
  shopLocation: Coordinates,
  customerLocation: Coordinates,
  radiusKm: number
): boolean {
  const distance = calculateDistance(shopLocation, customerLocation);
  return distance <= radiusKm;
}
