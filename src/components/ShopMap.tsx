/**
 * ShopMap Component - Google Maps Integration
 * Interactive map showing shops with custom markers and info windows
 */

import React, { useEffect, useRef, useState } from 'react';
import { Shop } from '@/services/shopService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, Phone, MapPin, Star, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loadGoogleMaps } from '@/lib/googleMaps';
import { trackDirections, trackCall, trackShopView } from '@/lib/analytics';

interface ShopMapProps {
  shops: Shop[];
  userLocation?: { lat: number; lng: number } | null;
}

// Category color mapping for different shop types
const getCategoryColor = (categories: string[] | string | undefined): string => {
  if (!categories) return '#6b7280'; // Default gray
  
  const categoryArray = Array.isArray(categories) ? categories : [categories];
  const primaryCategory = categoryArray[0]?.toLowerCase() || '';
  
  const colorMap: { [key: string]: string } = {
    'electronics': '#3b82f6',     // Blue
    'grocery': '#10b981',         // Green
    'groceries': '#10b981',       // Green
    'restaurant': '#f59e0b',      // Orange
    'food': '#f59e0b',           // Orange
    'pharmacy': '#ef4444',        // Red
    'medical': '#ef4444',         // Red
    'fashion': '#8b5cf6',         // Purple
    'clothing': '#8b5cf6',        // Purple
    'books': '#06b6d4',          // Cyan
    'education': '#06b6d4',       // Cyan
    'automotive': '#64748b',      // Slate
    'hardware': '#78716c',        // Stone
    'beauty': '#ec4899',         // Pink
    'sports': '#84cc16',         // Lime
    'home': '#f97316',           // Orange-600
    'furniture': '#f97316',       // Orange-600
  };
  
  return colorMap[primaryCategory] || '#6b7280';
};

export default function ShopMap({ shops, userLocation }: ShopMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  console.log('ShopMap render:', { 
    shopsCount: shops.length, 
    userLocation, 
    loading,
    hasMapRef: !!mapRef.current,
    hasMapInstance: !!mapInstanceRef.current
  });

  useEffect(() => {
    console.log('ShopMap mounted, initializing map...');
    
    // Retry initialization if ref is not ready
    const initWithRetry = async (attempts = 0) => {
      if ((!mapRef.current || !mapRef.current.isConnected) && attempts < 10) {
        console.log(`Map ref not ready, retrying... (attempt ${attempts + 1})`);
        setTimeout(() => initWithRetry(attempts + 1), 100);
        return;
      }
      initializeMap();
    };
    
    initWithRetry();
    
    return () => {
      console.log('ShopMap unmounting, cleaning up markers');
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    console.log('Shops or location changed:', { 
      shopsCount: shops.length, 
      hasMapInstance: !!mapInstanceRef.current 
    });
    if (mapInstanceRef.current) {
      updateMarkers();
    }
  }, [shops, userLocation]);

  const initializeMap = async () => {
    console.log('initializeMap called, mapRef.current:', !!mapRef.current);
    if (!mapRef.current) {
      console.error('mapRef.current is null, cannot initialize map');
      return;
    }

    try {
      console.log('Loading Google Maps API...');
      await loadGoogleMaps();
      console.log('Google Maps API loaded successfully');
      
      const center = userLocation || { lat: 18.6298, lng: 73.7997 }; // Default to Pimpri Chinchwad
      console.log('Map center:', center);

      // Clean map styles - hide default POI markers and business listings
      const mapStyles = [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "poi.business",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "poi.medical",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "poi.place_of_worship",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "poi.school",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "poi.sports_complex",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "transit",
          elementType: "labels.icon",
          stylers: [{ visibility: "off" }]
        },
        // Keep important landmarks and government buildings
        {
          featureType: "poi.government",
          stylers: [{ visibility: "on" }]
        },
        {
          featureType: "poi.park",
          stylers: [{ visibility: "on" }]
        },
        // Keep road labels for navigation
        {
          featureType: "road",
          elementType: "labels",
          stylers: [{ visibility: "on" }]
        },
        // Keep area/locality labels
        {
          featureType: "administrative.locality",
          elementType: "labels",
          stylers: [{ visibility: "on" }]
        },
        {
          featureType: "administrative.neighborhood",
          elementType: "labels",
          stylers: [{ visibility: "on" }]
        }
      ];

      console.log('Creating Google Maps instance...');
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        styles: mapStyles, // Apply clean styling
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: true,
        gestureHandling: 'greedy',
      });
      console.log('Google Maps instance created');

      mapInstanceRef.current = map;

      console.log('Calling updateMarkers...');
      updateMarkers();
      console.log('Setting loading to false');
      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize map:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setLoading(false);
    }
  };

  const updateMarkers = () => {
    console.log('updateMarkers called');
    if (!mapInstanceRef.current) {
      console.warn('mapInstanceRef.current is null, cannot update markers');
      return;
    }

    console.log('Clearing existing markers, count:', markersRef.current.length);
    // Clear existing shop markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create bounds to fit all markers
    const bounds = new google.maps.LatLngBounds();

    // Update user location marker
    if (userLocation) {
      console.log('Adding user location marker at:', userLocation);
      
      // Remove old user marker if it exists
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }
      
      // Create new user location marker with prominent styling
      userMarkerRef.current = new google.maps.Marker({
        map: mapInstanceRef.current,
        position: { lat: userLocation.lat, lng: userLocation.lng },
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#3b82f6',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 4,
        },
        zIndex: 1000, // Ensure it's on top
      });
      
      bounds.extend(new google.maps.LatLng(userLocation.lat, userLocation.lng));
    }

    console.log('Processing shops, count:', shops.length);
    // Add shop markers with pin icons
    shops.forEach((shop, index) => {
      console.log(`Processing shop ${index + 1}/${shops.length}:`, { 
        name: shop.name, 
        hasLocation: !!shop.location,
        location: shop.location,
        categories: shop.categories
      });
      
      if (!shop.location) {
        console.warn(`Shop ${shop.name} has no location, skipping`);
        return;
      }

      const position = { lat: shop.location.lat, lng: shop.location.lng };
      console.log(`Shop ${shop.name} position:`, position);

      bounds.extend(new google.maps.LatLng(position.lat, position.lng));

      // Get category-based color
      const categoryColor = getCategoryColor(shop.categories);
      
      const marker = new google.maps.Marker({
        map: mapInstanceRef.current,
        position,
        title: shop.name,
        icon: {
          // Custom pin SVG path
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" +
                "m0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5" +
                " 2.5z",
          fillColor: categoryColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 1.5,
          anchor: new google.maps.Point(12, 22) // Pin point at the bottom
        },
        zIndex: shop.is_verified ? 100 : 50, // Verified shops appear on top
      });
      console.log(`Created marker for shop ${shop.name} with color ${categoryColor}`);

      // Enhanced info window with better styling
      const categoryText = Array.isArray(shop.categories) 
        ? shop.categories.slice(0, 2).join(', ') 
        : shop.categories || 'General';

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 220px; font-family: Inter, sans-serif;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <h3 style="font-weight: 600; font-size: 16px; margin: 0; color: #1f2937;">${shop.name}</h3>
              ${shop.is_verified ? '<span style="color: #10b981; font-size: 14px;">✓ Verified</span>' : ''}
            </div>
            
            ${shop.rating && shop.rating > 0 ? `
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <span style="color: #f59e0b; font-size: 14px;">★</span>
                <span style="font-size: 14px; color: #374151;">${shop.rating.toFixed(1)}</span>
                ${shop.total_reviews && shop.total_reviews > 0 ? `
                  <span style="font-size: 12px; color: #6b7280;">(${shop.total_reviews} ${shop.total_reviews === 1 ? 'review' : 'reviews'})</span>
                ` : ''}
              </div>
            ` : ''}
            
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">
              📍 ${categoryText}
            </div>
            
            ${shop.address ? `
              <p style="font-size: 12px; color: #6b7280; margin: 4px 0; line-height: 1.4;">
                ${shop.address}
              </p>
            ` : ''}
            
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <div style="font-size: 11px; color: #9ca3af;">
                Click marker for more options
              </div>
            </div>
          </div>
        `,
      });

      marker.addListener('click', () => {
        console.log('Marker clicked:', shop.name);
        setSelectedShop(shop);
        mapInstanceRef.current?.panTo(position);
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    console.log('Total markers created:', markersRef.current.length);

    // Fit map to show all markers
    if (shops.length > 0 || userLocation) {
      console.log('Fitting bounds to show all markers');
      mapInstanceRef.current.fitBounds(bounds);
      
      // Ensure minimum zoom level for better visibility
      const listener = google.maps.event.addListenerOnce(mapInstanceRef.current, 'bounds_changed', () => {
        if (mapInstanceRef.current && mapInstanceRef.current.getZoom()! > 15) {
          mapInstanceRef.current.setZoom(15);
        }
      });
    } else {
      console.log('No shops or user location, skipping fitBounds');
    }
  };

  const handleViewShop = (shop: Shop) => {
    trackShopView(shop.id, shop.name);
    navigate(`/shops/${shop.id}`);
  };

  const handleGetDirections = (shop: Shop) => {
    if (!shop.location) return;
    
    trackDirections(shop.name);
    
    const destination = `${shop.location.lat},${shop.location.lng}`;
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
    
    const url = `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ''}&destination=${destination}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleCall = (shop: Shop) => {
    if (!shop.phone_number) return;
    trackCall(shop.name);
    window.location.href = `tel:${shop.phone_number}`;
  };

  return (
    <div className="relative w-full h-[calc(100vh-280px)] min-h-[400px]">
      <div ref={mapRef} className="absolute inset-0 rounded-lg overflow-hidden" />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      
      {selectedShop && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Card className="p-4 shadow-lg border-0 bg-white/95 backdrop-blur-sm">
            <div className="flex gap-3">
              {selectedShop.logo_url && (
                <img
                  src={selectedShop.logo_url}
                  alt={selectedShop.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{selectedShop.name}</h3>
                      {selectedShop.is_verified && (
                        <span className="text-green-600 text-sm">✓</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{selectedShop.rating}</span>
                      <span className="text-xs text-muted-foreground">
                        ({selectedShop.total_reviews})
                      </span>
                    </div>
                    {selectedShop.categories && (
                      <div className="mt-1">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {Array.isArray(selectedShop.categories) 
                            ? selectedShop.categories[0] 
                            : selectedShop.categories}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedShop(null)}
                    className="flex-shrink-0 h-6 w-6"
                  >
                    ×
                  </Button>
                </div>
                
                {selectedShop.address && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {selectedShop.address}
                  </p>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleViewShop(selectedShop)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGetDirections(selectedShop)}
                    className="flex-1"
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    Direct
                  </Button>
                  {selectedShop.phone_number && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCall(selectedShop)}
                    >
                      <Phone className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
