import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserLocation } from "@/contexts/LocationContext";

interface DirectionsButtonProps {
  shopLat: number;
  shopLng: number;
  shopName: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function DirectionsButton({
  shopLat,
  shopLng,
  shopName,
  className = "",
  variant = "default",
  size = "default",
}: DirectionsButtonProps) {
  const { toast } = useToast();
  const { location: userLocation } = useUserLocation();

  const handleGetDirections = () => {
    console.log('[DirectionsButton] handleGetDirections clicked', { shopLat, shopLng });

    if (shopLat && shopLng) {
      const destination = `${shopLat},${shopLng}`;
      const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
      const url = `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ''}&destination=${destination}&travelmode=driving`;
      window.open(url, '_blank', 'noopener,noreferrer');

      toast({
        title: "Opening directions",
        description: `Getting directions to ${shopName}`,
      });
    } else {
      toast({
        title: "Location unavailable",
        description: "Shop location coordinates are not available.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={handleGetDirections}
      variant={variant}
      size={size}
      className={className}
    >
      <Navigation className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
      Direct
    </Button>
  );
}
