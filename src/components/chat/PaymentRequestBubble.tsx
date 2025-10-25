import { CreditCard, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SmartPaymentModal } from "@/components/payment/SmartPaymentModal";

interface PaymentRequestBubbleProps {
  amount: number;
  expires_at: string;
  payment_request_id: string;
  description?: string;
  isCurrentUser: boolean;
  inquiry?: any;
  shop?: any;
}

export function PaymentRequestBubble({ 
  amount, 
  expires_at, 
  payment_request_id,
  description,
  isCurrentUser,
  inquiry,
  shop
}: PaymentRequestBubbleProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const expiresDate = new Date(expires_at);
  const isExpired = expiresDate < new Date();
  
  return (
    <>
    <div className={`p-4 rounded-lg border-2 ${
      isCurrentUser 
        ? 'bg-primary/5 border-primary/30' 
        : isExpired 
          ? 'bg-muted border-muted-foreground/20 opacity-60'
          : 'bg-accent/50 border-accent-foreground/20'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <CreditCard className="w-4 h-4 text-primary" />
        </div>
        <span className="font-semibold text-sm">Payment Request</span>
        {isExpired && (
          <span className="ml-auto text-xs text-destructive font-medium">Expired</span>
        )}
      </div>
      
      {/* Amount */}
      <div className="mb-3 p-3 bg-background/50 rounded-lg">
        <div className="text-xs text-muted-foreground mb-1">Amount Due</div>
        <div className="text-2xl font-bold text-primary">
          ₹{amount.toLocaleString('en-IN')}
        </div>
      </div>
      
      {/* Description */}
      {description && (
        <div className="mb-3 text-sm text-muted-foreground">
          {description}
        </div>
      )}
      
      {/* Expiry Info */}
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>
          {isExpired 
            ? `Expired on ${expiresDate.toLocaleDateString()}`
            : `Valid until ${expiresDate.toLocaleDateString()} ${expiresDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
          }
        </span>
      </div>
      
      {/* Pay Button - Only for customer, only if not expired */}
      {!isCurrentUser && !isExpired && (
        <Button 
          size="sm" 
          className="w-full"
          onClick={() => setShowPaymentModal(true)}
        >
          Pay Now
        </Button>
      )}
    </div>
    
    {/* Payment Modal */}
    {showPaymentModal && inquiry && shop && (
      <SmartPaymentModal
        inquiry={inquiry}
        shop={shop}
        paymentRequest={{ id: payment_request_id, amount }}
        onClose={() => setShowPaymentModal(false)}
      />
    )}
  </>
  );
}
