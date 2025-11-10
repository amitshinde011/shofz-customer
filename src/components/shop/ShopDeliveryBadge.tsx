import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";

interface ShopDeliveryBadgeProps {
  deliveryAvailable?: boolean;
  deliveryCoverageKm?: number;
  distanceKm?: number;
  variant?: 'compact' | 'detailed';
}

export function ShopDeliveryBadge({
  deliveryAvailable = false,
  deliveryCoverageKm,
  distanceKm,
  variant = 'compact'
}: ShopDeliveryBadgeProps) {
  // Don't show anything if delivery is not available
  if (!deliveryAvailable) {
    return null;
  }

  // Check if customer is within delivery range
  const isInRange = distanceKm !== undefined && 
                    deliveryCoverageKm !== undefined && 
                    distanceKm <= deliveryCoverageKm;

  if (variant === 'compact') {
    return (
      <Badge 
        variant="secondary" 
        className={`text-xs ${isInRange ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}
      >
        <Truck className="w-3 h-3 mr-1" />
        {isInRange ? 'Delivers to you' : 'Delivery'}
      </Badge>
    );
  }

  // Detailed variant
  return (
    <Badge 
      variant="secondary" 
      className={`text-xs ${isInRange ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}
    >
      <Truck className="w-3 h-3 mr-1" />
      {isInRange 
        ? `Delivers to you (${deliveryCoverageKm}km)` 
        : `Delivers within ${deliveryCoverageKm}km`
      }
    </Badge>
  );
}
