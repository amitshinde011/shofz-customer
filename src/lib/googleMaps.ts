/**
 * Google Maps Configuration
 * Manages API key and script loading
 */

// For development, we'll use the API key directly
// In production, this should be fetched from an edge function
const GOOGLE_MAPS_API_KEY = 'AIzaSyAhJ4OgAPQIHu21_kqZpD_1PnS-rkescqQ'; // Replace with actual key

let loadPromise: Promise<typeof google> | null = null;

export async function loadGoogleMaps(): Promise<typeof google> {
  // Return cached promise if already loading/loaded
  if (loadPromise) {
    return loadPromise;
  }

  // Check if already loaded
  if (typeof google !== 'undefined' && google.maps) {
    return Promise.resolve(google);
  }

  // Load Google Maps script
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    (window as any).initGoogleMaps = () => {
      resolve(google);
      delete (window as any).initGoogleMaps;
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
