import { Badge } from '@/components/ui/badge';

interface StockBadgeProps {
  isActive: boolean;
  inventoryTracking: boolean;
  quantity: number | null;
}

export const StockBadge = ({ isActive, inventoryTracking, quantity }: StockBadgeProps) => {
  const getStockDisplay = () => {
    if (!isActive) {
      return { text: 'Unavailable', variant: 'destructive' as const };
    }

    if (!inventoryTracking || quantity === null) {
      // Inventory tracking disabled
      return { text: 'In Stock', variant: 'default' as const };
    }

    if (quantity > 10) {
      return { text: 'In Stock', variant: 'default' as const };
    } else if (quantity > 0) {
      return { text: `Limited Stock (${quantity})`, variant: 'secondary' as const };
    }
    
    return { text: 'Out of Stock', variant: 'destructive' as const };
  };

  const { text, variant } = getStockDisplay();

  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {text}
    </Badge>
  );
};
