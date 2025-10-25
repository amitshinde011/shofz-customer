import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditCard, X, Clock } from "lucide-react";
import { usePaymentRequest } from "@/hooks/usePaymentRequest";

interface PaymentRequestBannerProps {
  inquiryId: string;
  onViewPayment: () => void;
}

export function PaymentRequestBanner({ inquiryId, onViewPayment }: PaymentRequestBannerProps) {
  const { paymentRequest, markAsViewed } = usePaymentRequest({ inquiryId });
  const [isDismissed, setIsDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Calculate time left - removed as expires_at no longer exists
  // Payment requests don't expire in new schema

  // Don't show if no payment request or already completed
  if (!paymentRequest || 
      ['shop_confirmed', 'verified', 'refunded'].includes(paymentRequest.status) ||
      isDismissed) {
    return null;
  }

  const handleView = () => {
    markAsViewed();
    onViewPayment();
  };

  const handleDismiss = () => {
    markAsViewed();
    setIsDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
      >
        <Card className="border-primary bg-primary/5">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-foreground">
                      Payment Request
                    </h4>
                    {paymentRequest.status === 'initiated' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning text-warning-foreground">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Shop has sent a payment request for{' '}
                    <span className="font-bold text-primary">
                      ₹{paymentRequest.amount.toLocaleString('en-IN')}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-2">
                <Button
                  onClick={() => {
                    handleView();
                    window.location.hash = '#payment';
                  }}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  Go to Payment
                </Button>
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}