import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, CheckCircle2, XCircle, Info } from "lucide-react";
import { Shop } from "@/services/shopService";
import { Coordinates } from "@/lib/distanceCalculation";
import { checkDeliveryAvailability } from "@/lib/deliveryCalculations";

interface DeliveryDetailsCardProps {
  shop: Shop;
  customerLocation?: Coordinates;
}

export function DeliveryDetailsCard({ shop, customerLocation }: DeliveryDetailsCardProps) {
  // Calculate delivery availability if customer location is available
  const deliveryInfo = customerLocation && shop.location
    ? checkDeliveryAvailability(
        { lat: shop.location.lat, lng: shop.location.lng },
        customerLocation,
        shop.delivery_coverage_km || 5,
        shop.delivery_charge_per_km,
        shop.free_delivery_above
      )
    : null;

  if (!shop.delivery_available) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Pickup Only</h3>
              <p className="text-xs text-muted-foreground">
                This shop currently does not offer delivery services. Visit the shop to collect your order.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Truck className="w-5 h-5 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-foreground">Delivery Available</h3>
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>

            {/* Coverage Radius */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Coverage Area:</span>
                <Badge variant="secondary" className="text-xs">
                  Within {shop.delivery_coverage_km || 5} km
                </Badge>
              </div>

              {/* Availability for customer location */}
              {deliveryInfo && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-background/50">
                  {deliveryInfo.isAvailable ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-success font-medium">
                        Delivers to your location ({deliveryInfo.formattedDistance} away)
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span className="text-destructive">
                        Outside delivery area ({deliveryInfo.formattedDistance} away)
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Pricing Information */}
              {shop.delivery_charge_per_km !== undefined && shop.delivery_charge_per_km > 0 ? (
                <div className="space-y-1 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Delivery Charges:</span>
                    <span>₹{shop.delivery_charge_per_km}/km</span>
                  </div>
                  {deliveryInfo?.deliveryCharge !== undefined && deliveryInfo.isAvailable && (
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <span>Estimated for you:</span>
                      <span>
                        {deliveryInfo.isFreeDelivery ? (
                          <Badge className="bg-success text-success-foreground">FREE</Badge>
                        ) : (
                          `₹${deliveryInfo.deliveryCharge}`
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span>Contact shop for delivery pricing</span>
                </div>
              )}

              {/* Free Delivery Threshold */}
              {shop.free_delivery_above && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-success font-medium">
                    🎉 Free delivery on orders above ₹{shop.free_delivery_above.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Delivery Notes */}
              {shop.delivery_notes && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground italic">
                    <span className="font-medium text-foreground">Note:</span> {shop.delivery_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
