import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { MapPin, Navigation2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Shop } from "@/services/shopService";
import { Coordinates } from "@/lib/distanceCalculation";
import { checkDeliveryAvailability } from "@/lib/deliveryCalculations";
import { loadGoogleMaps } from "@/lib/googleMaps";

interface DeliveryCoverageCheckerProps {
  shop: Shop;
  customerLocation?: Coordinates;
  onLocationUpdate?: (location: Coordinates, address: string) => void;
}

export function DeliveryCoverageChecker({ 
  shop, 
  customerLocation,
  onLocationUpdate 
}: DeliveryCoverageCheckerProps) {
  const [address, setAddress] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<ReturnType<typeof checkDeliveryAvailability> | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  // Auto-check if customer location is available
  useEffect(() => {
    if (customerLocation && shop.location) {
      const result = checkDeliveryAvailability(
        { lat: shop.location.lat, lng: shop.location.lng },
        customerLocation,
        shop.delivery_coverage_km || 5,
        shop.delivery_charge_per_km,
        shop.free_delivery_above
      );
      setCheckResult(result);
    }
  }, [customerLocation, shop]);

  const handleUseMyLocation = () => {
    if (customerLocation) {
      setUseCurrentLocation(true);
      // Already auto-checked by useEffect
    } else {
      // Request location permission
      if (navigator.geolocation) {
        setIsChecking(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            
            if (shop.location) {
              const result = checkDeliveryAvailability(
                { lat: shop.location.lat, lng: shop.location.lng },
                location,
                shop.delivery_coverage_km || 5,
                shop.delivery_charge_per_km,
                shop.free_delivery_above
              );
              setCheckResult(result);
              setUseCurrentLocation(true);
              
              if (onLocationUpdate) {
                onLocationUpdate(location, "Your current location");
              }
            }
            setIsChecking(false);
          },
          (error) => {
            console.error("Error getting location:", error);
            setIsChecking(false);
          }
        );
      }
    }
  };

  const handleAddressCheck = async () => {
    if (!address.trim()) return;
    
    setIsChecking(true);
    
    try {
      // Use Google Geocoding API to convert address to coordinates
      const google = await loadGoogleMaps();
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          };
          
          if (shop.location) {
            const result = checkDeliveryAvailability(
              { lat: shop.location.lat, lng: shop.location.lng },
              location,
              shop.delivery_coverage_km || 5,
              shop.delivery_charge_per_km,
              shop.free_delivery_above
            );
            setCheckResult(result);
            
            if (onLocationUpdate) {
              onLocationUpdate(location, address);
            }
          }
        }
        setIsChecking(false);
      });
    } catch (error) {
      console.error("Error geocoding address:", error);
      setIsChecking(false);
    }
  };

  // Calculate progress percentage (0-100)
  const progressPercentage = checkResult 
    ? Math.min(100, (checkResult.distanceKm / checkResult.deliveryCoverageKm) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground">Check Delivery Availability</Label>
        
        {/* Use Current Location Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleUseMyLocation}
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting location...
            </>
          ) : (
            <>
              <Navigation2 className="w-4 h-4 mr-2" />
              Use My Current Location
            </>
          )}
        </Button>

        {/* Manual Address Input */}
        {!useCurrentLocation && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Enter your delivery address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddressCheck()}
                />
              </div>
              <Button
                type="button"
                onClick={handleAddressCheck}
                disabled={!address.trim() || isChecking}
              >
                <MapPin className="w-4 h-4 mr-1" />
                Check
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Results Display */}
      {checkResult && (
        <div className="space-y-3">
          {/* Availability Alert */}
          <Alert variant={checkResult.isAvailable ? "default" : "destructive"}>
            {checkResult.isAvailable ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle className="text-sm font-semibold">
              {checkResult.isAvailable 
                ? "✅ Delivery Available" 
                : "❌ Outside Delivery Area"
              }
            </AlertTitle>
            <AlertDescription className="text-xs">
              {checkResult.message}
            </AlertDescription>
          </Alert>

          {/* Distance Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Distance: {checkResult.formattedDistance}</span>
              <span>Max: {checkResult.deliveryCoverageKm} km</span>
            </div>
            <Progress 
              value={progressPercentage} 
              className={checkResult.isAvailable ? "bg-muted" : "bg-destructive/20"}
            />
          </div>

          {/* Delivery Charge Display */}
          {checkResult.isAvailable && checkResult.deliveryCharge !== undefined && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Delivery Charge:</span>
                <span className="text-base font-bold text-primary">
                  {checkResult.isFreeDelivery ? (
                    <span className="text-success">FREE 🎉</span>
                  ) : (
                    `₹${checkResult.deliveryCharge}`
                  )}
                </span>
              </div>
              {checkResult.isFreeDelivery && (
                <p className="text-xs text-muted-foreground mt-1">
                  You qualify for free delivery!
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
