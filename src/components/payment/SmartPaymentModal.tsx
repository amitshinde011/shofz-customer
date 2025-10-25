import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface SmartPaymentModalProps {
  inquiry: {
    id: string;
    product_name?: string;
    quoted_price?: string | number;
    budget_max?: string | number;
  };
  shop: {
    id: string;
    name: string;
    payment_upi_id?: string;
    payment_qr_code_url?: string;
  };
  paymentRequest?: {
    id?: string;
    amount?: number | string;
  };
  onClose: () => void;
}

const coerceAmount = (raw?: string | number) => {
  const n = typeof raw === "string" ? Number(raw) : Number(raw ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function SmartPaymentModal({
  inquiry,
  shop,
  paymentRequest,
  onClose,
}: SmartPaymentModalProps) {
  const rawAmount = paymentRequest?.amount ?? inquiry.quoted_price ?? inquiry.budget_max ?? 0;
  const amountNumber = coerceAmount(rawAmount);
  const formattedAmount = amountNumber ? amountNumber.toFixed(2) : "0.00";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Pay {shop.name}</DialogTitle>
          <DialogDescription>{inquiry.product_name}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Amount */}
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">₹{formattedAmount}</div>
          </div>

          {/* QR Code */}
          {shop.payment_qr_code_url && (
            <div className="bg-muted rounded-lg p-6 flex flex-col items-center space-y-3">
              <img 
                src={shop.payment_qr_code_url} 
                alt="Payment QR Code" 
                className="w-48 h-48 object-contain bg-white rounded-lg p-2"
              />
              <p className="text-sm text-muted-foreground text-center">
                Scan with any UPI app to pay
              </p>
            </div>
          )}

          {/* UPI ID */}
          {shop.payment_upi_id && (
            <div className="space-y-2">
              <label className="text-sm font-medium">UPI ID</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-sm">
                  {shop.payment_upi_id}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(shop.payment_upi_id!, "UPI ID")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ImageIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-medium">After completing payment:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Take a screenshot of the payment confirmation</li>
                  <li>Return to the chat</li>
                  <li>Share the screenshot with the shop</li>
                </ol>
              </div>
            </div>
          </div>

          <Button onClick={onClose} className="w-full" variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}