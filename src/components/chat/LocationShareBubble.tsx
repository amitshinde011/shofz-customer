import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkDeliveryAvailability } from "@/lib/deliveryCalculations";

interface Shop {
  delivery_available?: boolean;
  delivery_coverage_km?: number;
  location?: { lat: number; lng: number } | null;
}

interface LocationShareBubbleProps {
  lat: number;
  lng: number;
  address?: string;
  formattedAddress?: string;
  isCurrentUser: boolean;
  shop?: Shop | null;
}

export function LocationShareBubble({
  lat,
  lng,
  address,
  formattedAddress,
  isCurrentUser,
  shop
}: LocationShareBubbleProps) {
  // Calculate delivery availability if shop data is available
  const deliveryInfo = shop?.delivery_available && shop?.location
    ? checkDeliveryAvailability(
        shop.location,
        { lat, lng },
        shop.delivery_coverage_km || 5
      )
    : null;

  const displayAddress = formattedAddress || address;

  const openInMaps = () => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${
      isCurrentUser 
        ? 'bg-primary/10 border-primary/30' 
        : 'bg-accent/50 border-border'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-blue-500/10 rounded-full">
          <MapPin className="w-4 h-4 text-blue-500" />
        </div>
        <span className="font-semibold text-sm">Location Shared</span>
      </div>
      
      {/* Address */}
      {displayAddress && (
        <div className="mb-3 p-3 bg-background/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Delivery Address</div>
          <div className="text-sm font-medium leading-relaxed">{displayAddress}</div>
        </div>
      )}
      
      {/* Coordinates */}
      <div className="text-xs text-muted-foreground mb-3 font-mono">
        📍 {lat.toFixed(6)}, {lng.toFixed(6)}
      </div>
      
      {/* Delivery Status - Only show for shop viewing customer's location */}
      {!isCurrentUser && deliveryInfo && (
        <div className={`p-2.5 rounded-lg text-sm mb-3 ${
          deliveryInfo.isAvailable 
            ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
            : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
        }`}>
          {deliveryInfo.isAvailable ? (
            <span className="flex items-center gap-1.5">
              <span>✅</span>
              <span>Delivery available ({deliveryInfo.formattedDistance} away)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Outside delivery area ({deliveryInfo.formattedDistance}, max {deliveryInfo.deliveryCoverageKm}km)</span>
            </span>
          )}
        </div>
      )}

      {/* For customer viewing their own shared location - show distance */}
      {isCurrentUser && deliveryInfo && (
        <div className="text-xs text-muted-foreground mb-3">
          📏 {deliveryInfo.formattedDistance} from shop
        </div>
      )}
      
      {/* Open in Maps Button */}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={openInMaps}
      >
        <ExternalLink className="w-3.5 h-3.5 mr-2" />
        Open in Maps
      </Button>
    </div>
  );
}
