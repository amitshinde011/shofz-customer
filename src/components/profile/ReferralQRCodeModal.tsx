import { useState } from "react";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Share2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReferralQRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode: string;
}

export function ReferralQRCodeModal({
  open,
  onOpenChange,
  referralCode,
}: ReferralQRCodeModalProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const businessAppUrl = `https://business.shofz.com/auth?ref=${referralCode}`;

  const handleDownloadQR = async () => {
    setIsDownloading(true);
    try {
      const svg = document.getElementById("qr-code-svg");
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = 300;
        canvas.height = 300;
        
        // White background
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 300, 300);
          ctx.drawImage(img, 0, 0, 300, 300);
        }

        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `referral-qr-${referralCode}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          
          toast({
            title: "Downloaded!",
            description: "QR code saved to your device",
          });
        });
      };

      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    } catch (error) {
      console.error("Error downloading QR:", error);
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareQR = async () => {
    setIsSharing(true);
    try {
      const svg = document.getElementById("qr-code-svg");
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = async () => {
        canvas.width = 300;
        canvas.height = 300;
        
        // White background
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 300, 300);
          ctx.drawImage(img, 0, 0, 300, 300);
        }

        canvas.toBlob(async (blob) => {
          if (!blob) return;

          const file = new File([blob], `referral-qr-${referralCode}.png`, {
            type: "image/png",
          });

          if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "My Referral QR Code",
              text: `Scan to join with referral code: ${referralCode}`,
              files: [file],
            });
          } else {
            // Fallback: copy link
            await navigator.clipboard.writeText(businessAppUrl);
            toast({
              title: "Link Copied",
              description: "Referral link copied to clipboard",
            });
          }
        });
      };

      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    } catch (error) {
      console.error("Error sharing QR:", error);
      toast({
        title: "Error",
        description: "Failed to share QR code",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Your Referral QR Code</DialogTitle>
          <DialogDescription>
            Business owners can scan this code to sign up with your referral
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code Display */}
          <div className="bg-white p-6 rounded-lg flex items-center justify-center border border-border">
            <QRCode
              id="qr-code-svg"
              value={businessAppUrl}
              size={256}
              level="H"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          {/* Referral Code Display */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Referral Code</p>
            <p className="text-2xl font-mono font-bold text-foreground">
              {referralCode}
            </p>
          </div>

          {/* Business App Link */}
          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">
              Business Onboarding Link
            </p>
            <p className="text-sm font-mono break-all text-foreground">
              {businessAppUrl}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadQR}
              disabled={isDownloading}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download QR"}
            </Button>
            <Button
              onClick={handleShareQR}
              disabled={isSharing}
              variant="outline"
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {isSharing ? "Sharing..." : "Share QR"}
            </Button>
          </div>

          {/* Instructions */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              Share this QR code with business owners. They can scan it during
              registration to automatically apply your referral code and help
              you earn rewards!
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
