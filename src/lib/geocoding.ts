import { loadGoogleMaps } from './googleMaps';

/**
 * Reverse geocode coordinates to a human-readable address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const google = await loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          resolve(results[0].formatted_address);
        } else {
          console.warn('[Geocoding] Failed to reverse geocode:', status);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('[Geocoding] Error:', error);
    return null;
  }
}
