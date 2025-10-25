import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle, X, Upload, Loader2, Share2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadPaymentScreenshot } from "@/services/paymentService";

interface UpiPaymentDetailsProps {
  shop: any;
  amount: string;
  screenshot: { url: string; fileName: string } | null;
  setScreenshot: (screenshot: { url: string; fileName: string } | null) => void;
}

export function UpiPaymentDetails({ shop, amount, screenshot, setScreenshot }: UpiPaymentDetailsProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleScreenshotUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const url = await uploadPaymentScreenshot(file);
      if (url) {
        setScreenshot({
          url,
          fileName: file.name,
        });
        toast({
          title: "Screenshot uploaded",
          description: "Payment screenshot uploaded successfully",
        });
      }
    } catch (error: any) {
      console.error('[UpiPaymentDetails] Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload screenshot",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} copied!`,
      description: "Copied to clipboard",
    });
  };

  const shareQRCode = async () => {
    if (!shop.payment_qr_code_url) return;
    
    try {
      const response = await fetch(shop.payment_qr_code_url);
      const blob = await response.blob();
      const file = new File([blob], 'payment-qr.png', { type: 'image/png' });
      
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Pay ${shop.name}`,
          text: `Payment of ₹${amount}`,
          files: [file]
        });
        toast({
          title: "QR code shared",
          description: "QR code shared successfully",
        });
      } else {
        downloadQRCode();
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast({
        title: "Share failed",
        description: "Try downloading the QR code instead",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = () => {
    if (!shop.payment_qr_code_url) return;
    
    const link = document.createElement('a');
    link.href = shop.payment_qr_code_url;
    link.download = `${shop.name.replace(/\s+/g, '-')}-payment-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "QR code downloaded",
      description: "You can now open it in your payment app",
    });
  };

  return (
    <div className="space-y-4">
      {/* UPI ID */}
      {shop.payment_upi_id && (
        <div className="bg-muted rounded-lg p-3">
          <Label className="text-xs text-muted-foreground">UPI ID</Label>
          <div className="flex items-center justify-between mt-1">
            <code className="text-sm font-mono bg-background px-2 py-1 rounded">
              {shop.payment_upi_id}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(shop.payment_upi_id, 'UPI ID')}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Phone Number */}
      {shop.payment_phone_number && (
        <div className="bg-muted rounded-lg p-3">
          <Label className="text-xs text-muted-foreground">Payment Phone</Label>
          <div className="flex items-center justify-between mt-1">
            <span className="font-medium">{shop.payment_phone_number}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(shop.payment_phone_number, 'Phone number')}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
      
      {/* QR Code */}
      {shop.payment_qr_code_url && (
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Scan QR Code to Pay</Label>
          <div className="bg-background border-2 border-border rounded-lg p-4 flex justify-center">
            <img 
              src={shop.payment_qr_code_url} 
              alt="Payment QR Code"
              className="w-40 h-40"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Scan with any UPI app or share this QR code to your payment app
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={shareQRCode}
              className="flex-1"
            >
              <Share2 className="w-3 h-3 mr-2" />
              Share QR Code
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadQRCode}
              className="flex-1"
            >
              <Download className="w-3 h-3 mr-2" />
              Download
            </Button>
          </div>
        </div>
      )}
      
      {/* Screenshot Upload */}
      <div>
        <Label htmlFor="screenshot-upload">Upload Payment Screenshot *</Label>
        <div className="mt-2">
          {screenshot ? (
            <div className="flex items-center space-x-3 p-3 bg-success/10 border border-success/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
              <span className="text-sm flex-1 truncate">{screenshot.fileName}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setScreenshot(null)}
                disabled={uploading}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <Input
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleScreenshotUpload(file);
                  }}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                {uploading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Take a screenshot of successful payment confirmation
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
