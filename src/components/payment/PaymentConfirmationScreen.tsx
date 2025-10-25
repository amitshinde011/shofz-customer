import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface PaymentConfirmationScreenProps {
  shop: any;
  amount: string;
  onClose: () => void;
}

export function PaymentConfirmationScreen({ shop, amount, onClose }: PaymentConfirmationScreenProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto text-center">
        <div className="space-y-4 py-4">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Payment Submitted!</h3>
            <p className="text-muted-foreground">
              Your payment of ₹{amount} to {shop.name} has been recorded.
            </p>
          </div>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm">
              The shop owner will confirm your payment shortly. You'll receive a notification once confirmed.
            </p>
          </div>
          
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
