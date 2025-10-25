import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Copy, Check } from "lucide-react";
import { UpiPaymentDetails } from "./UpiPaymentDetails";
import { PaymentMethodOption } from "./PaymentMethodOption";
import { PaymentConfirmationScreen } from "./PaymentConfirmationScreen";
import { createPaymentTransaction } from "@/services/paymentService";
import { useToast } from "@/hooks/use-toast";
import { analyticsService } from "@/services/analyticsService";

interface PaymentModalProps {
  shop: any;
  inquiry: any;
  quotedPrice?: number;
  onClose: () => void;
}

export function PaymentModal({ shop, inquiry, quotedPrice, onClose }: PaymentModalProps) {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'cash' | 'card'>('upi');
  const [paymentAmount, setPaymentAmount] = useState(quotedPrice?.toString() || '');
  const [screenshot, setScreenshot] = useState<{ url: string; fileName: string } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleCopyUpi = async () => {
    if (shop.upi_id) {
      await navigator.clipboard.writeText(shop.upi_id);
      setCopiedUpi(true);
      toast({
        title: "UPI ID copied",
        description: "You can now paste it in your payment app",
      });
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handlePaymentConfirmation = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (selectedMethod === 'upi' && !screenshot) {
      toast({
        title: "Screenshot required",
        description: "Please upload payment screenshot for UPI payments",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const result = await createPaymentTransaction({
        inquiry_id: inquiry.id,
        shop_id: shop.id,
        payment_method: selectedMethod,
        payment_amount: parseFloat(paymentAmount),
        payment_screenshot_url: screenshot?.url,
        payment_notes: `Payment for inquiry: ${inquiry.product_name}`,
      });

      if (result.success) {
        // Track analytics
        await analyticsService.trackEvent('payment_submitted', {
          inquiry_id: inquiry.id,
          shop_id: shop.id,
          payment_method: selectedMethod,
          amount: parseFloat(paymentAmount),
        });

        setShowConfirmation(true);
      } else {
        throw new Error(result.error || 'Payment submission failed');
      }
    } catch (error: any) {
      console.error('[PaymentModal] Payment error:', error);
      toast({
        title: "Payment failed",
        description: error.message || "Failed to submit payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (showConfirmation) {
    return (
      <PaymentConfirmationScreen 
        shop={shop} 
        amount={paymentAmount} 
        onClose={onClose} 
      />
    );
  }

  const shopPaymentMethods = shop.preferred_payment_methods || ['upi', 'cash'];
  const acceptsOnlinePayments = shop.accepts_online_payments !== false;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pay {shop.name}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <div>Complete your payment for: {inquiry.product_name}</div>
            {shop.upi_id && (
              <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2 mt-2">
                <span className="text-sm font-mono flex-1">{shop.upi_id}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyUpi}
                  className="h-8 px-2"
                >
                  {copiedUpi ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Amount */}
          <div>
            <Label htmlFor="payment-amount">Payment Amount</Label>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-lg font-medium">₹</span>
              <Input
                id="payment-amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                className="text-lg"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          {/* Payment Methods */}
          <div>
            <Label className="mb-3 block">Choose Payment Method</Label>
            <div className="space-y-3">
              {acceptsOnlinePayments && shopPaymentMethods.includes('upi') && (
                <PaymentMethodOption
                  id="upi"
                  selected={selectedMethod === 'upi'}
                  onSelect={() => setSelectedMethod('upi')}
                  icon="📱"
                  title="UPI Payment"
                  description="Pay via UPI apps"
                />
              )}
              
              {shopPaymentMethods.includes('cash') && (
                <PaymentMethodOption
                  id="cash"
                  selected={selectedMethod === 'cash'}
                  onSelect={() => setSelectedMethod('cash')}
                  icon="💵"
                  title="Cash on Delivery"
                  description="Pay when you receive"
                />
              )}

              {acceptsOnlinePayments && shopPaymentMethods.includes('card') && (
                <PaymentMethodOption
                  id="card"
                  selected={selectedMethod === 'card'}
                  onSelect={() => setSelectedMethod('card')}
                  icon="💳"
                  title="Card Payment"
                  description="Pay with debit/credit card"
                />
              )}
            </div>
          </div>
          
          {/* Payment Details based on selected method */}
          {selectedMethod === 'upi' && acceptsOnlinePayments && (
            <>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  💡 <strong>Can't open payment app?</strong> Copy the UPI ID above and make the payment manually in your preferred UPI app.
                </p>
              </div>
              <UpiPaymentDetails 
                shop={shop}
                amount={paymentAmount}
                screenshot={screenshot}
                setScreenshot={setScreenshot}
              />
            </>
          )}
          
          {/* Payment Instructions */}
          {shop.payment_instructions && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-sm">{shop.payment_instructions}</p>
            </div>
          )}
          
          <div className="flex space-x-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handlePaymentConfirmation}
              className="flex-1"
              disabled={!paymentAmount || (selectedMethod === 'upi' && !screenshot) || isProcessing}
            >
              {isProcessing ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
