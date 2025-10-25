/**
 * DirectionsPanel Component
 * Shows turn-by-turn directions from user location to shop
 */

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, X, MapPin, Clock } from 'lucide-react';
import { loadGoogleMaps } from '@/lib/googleMaps';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DirectionsPanelProps {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  shopName: string;
  onClose: () => void;
}

export default function DirectionsPanel({ origin, destination, shopName, onClose }: DirectionsPanelProps) {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDirections();
  }, [origin, destination]);

  const loadDirections = async () => {
    try {
      setLoading(true);
      setError(null);

      const google = await loadGoogleMaps();
      const directionsService = new google.maps.DirectionsService();

      directionsService.route(
        {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          travelMode: google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: true,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            setDirections(result);
          } else {
            setError('Could not calculate directions. Please try again.');
          }
          setLoading(false);
        }
      );
    } catch (err) {
      setError('Failed to load directions service.');
      setLoading(false);
    }
  };

  const handleOpenInGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Loading Directions...</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-destructive">Error</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleOpenInGoogleMaps} className="w-full">
          <Navigation className="mr-2 h-4 w-4" />
          Open in Google Maps
        </Button>
      </Card>
    );
  }

  if (!directions) return null;

  const route = directions.routes[0];
  const leg = route.legs[0];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Directions to {shopName}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {leg.distance?.text}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {leg.duration?.text}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[300px] mb-4">
        <div className="space-y-3">
          {leg.steps.map((step, index) => (
            <div key={index} className="flex gap-3 pb-3 border-b last:border-0">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                {index + 1}
              </div>
              <div className="flex-1">
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: step.instructions }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {step.distance?.text} • {step.duration?.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Button onClick={handleOpenInGoogleMaps} className="w-full">
        <Navigation className="mr-2 h-4 w-4" />
        Start Navigation in Google Maps
      </Button>
    </Card>
  );
}
