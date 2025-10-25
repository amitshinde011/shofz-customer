/**
 * Distance Calculation Utilities
 * Uses Haversine formula to calculate distances between coordinates
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Format distance for display
 * Returns "850 m" for distances < 1km
 * Returns "1.2 km" for distances >= 1km
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Calculate and format distance between two coordinates
 */
export function getFormattedDistance(
  coord1: Coordinates,
  coord2: Coordinates
): string {
  const distance = calculateDistance(coord1, coord2);
  return formatDistance(distance);
}

/**
 * Calculate estimated travel time
 * Assumes average speed of 30 km/h for city travel
 */
export function estimateTravelTime(distanceKm: number): string {
  const averageSpeedKmh = 30;
  const hours = distanceKm / averageSpeedKmh;
  const minutes = Math.ceil(hours * 60);
  
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}

/**
 * Get accurate distance and duration using Google Distance Matrix API
 * Falls back to Haversine calculation if Google Maps is unavailable
 */
export async function getAccurateDistance(
  origin: Coordinates,
  destination: Coordinates
): Promise<{ distance: string; duration: string; distanceValue: number }> {
  try {
    // Check if Google Maps is available
    if (typeof google !== 'undefined' && google.maps) {
      const service = new google.maps.DistanceMatrixService();
      
      return new Promise((resolve, reject) => {
        service.getDistanceMatrix(
          {
            origins: [{ lat: origin.lat, lng: origin.lng }],
            destinations: [{ lat: destination.lat, lng: destination.lng }],
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (response, status) => {
            if (status === 'OK' && response?.rows[0]?.elements[0]?.status === 'OK') {
              const element = response.rows[0].elements[0];
              resolve({
                distance: element.distance.text,
                duration: element.duration.text,
                distanceValue: element.distance.value / 1000, // Convert meters to km
              });
            } else {
              // Fallback to Haversine
              const dist = calculateDistance(origin, destination);
              resolve({
                distance: formatDistance(dist),
                duration: estimateTravelTime(dist),
                distanceValue: dist,
              });
            }
          }
        );
      });
    } else {
      // Fallback to Haversine calculation
      const dist = calculateDistance(origin, destination);
      return {
        distance: formatDistance(dist),
        duration: estimateTravelTime(dist),
        distanceValue: dist,
      };
    }
  } catch (error) {
    console.error('Error calculating accurate distance:', error);
    // Fallback to Haversine calculation
    const dist = calculateDistance(origin, destination);
    return {
      distance: formatDistance(dist),
      duration: estimateTravelTime(dist),
      distanceValue: dist,
    };
  }
}
