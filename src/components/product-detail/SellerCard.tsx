import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Star, Store, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from '@/hooks/useLocation';

interface SellerCardProps {
  shop: {
    id: string;
    name: string;
    address?: string;
    phone_number?: string;
    rating?: number;
    is_verified?: boolean;
  };
  productId: string;
}

export const SellerCard = ({ shop, productId }: SellerCardProps) => {
  const navigate = useNavigate();
  const { location: userLocation } = useLocation();

  const handleViewShop = () => {
    navigate(`/shops/${shop.id}`, { state: { from: `/products/${productId}` } });
  };

  const handleCall = () => {
    if (shop.phone_number) {
      window.location.href = `tel:${shop.phone_number}`;
    }
  };

  const handleDirections = () => {
    if (shop.address) {
      const destination = encodeURIComponent(shop.address);
      const origin = userLocation
        ? `${userLocation.lat},${userLocation.lng}`
        : '';
      const url = origin
        ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
        : `https://www.google.com/maps/search/?api=1&query=${destination}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Sold by</span>
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {shop.name}
              </h3>
              {shop.is_verified && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  ✓ Verified
                </Badge>
              )}
            </div>
          </div>
          {(shop.rating && shop.rating > 0) && (
            <div className="flex items-center gap-1 shrink-0">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{shop.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {shop.address && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground line-clamp-1">
              {shop.address}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewShop}
            className="flex-1"
          >
            View Shop
          </Button>
          {shop.address && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDirections}
            >
              <Navigation className="h-4 w-4" />
            </Button>
          )}
          {shop.phone_number && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCall}
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
