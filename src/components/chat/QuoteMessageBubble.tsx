import { Receipt } from "lucide-react";

interface QuoteMessageBubbleProps {
  quoted_price: number;
  estimated_delivery_days?: number;
  response_message?: string;
  isCurrentUser: boolean;
}

export function QuoteMessageBubble({ 
  quoted_price, 
  estimated_delivery_days, 
  response_message,
  isCurrentUser 
}: QuoteMessageBubbleProps) {
  return (
    <div className={`p-4 rounded-lg border-2 ${
      isCurrentUser 
        ? 'bg-primary/5 border-primary/30' 
        : 'bg-accent/50 border-accent-foreground/20'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <Receipt className="w-4 h-4 text-primary" />
        </div>
        <span className="font-semibold text-sm">Quote Received</span>
      </div>
      
      {/* Price - Most Prominent */}
      <div className="mb-3 p-3 bg-background/50 rounded-lg">
        <div className="text-xs text-muted-foreground mb-1">Quoted Price</div>
        <div className="text-2xl font-bold text-primary">
          ₹{quoted_price.toLocaleString('en-IN')}
        </div>
      </div>
      
      {/* Delivery Time */}
      {estimated_delivery_days && (
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-muted-foreground">Estimated Delivery:</span>
          <span className="font-medium">{estimated_delivery_days} days</span>
        </div>
      )}
      
      {/* Additional Message */}
      {response_message && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground mb-1">Message:</div>
          <p className="text-sm leading-relaxed">{response_message}</p>
        </div>
      )}
    </div>
  );
}
