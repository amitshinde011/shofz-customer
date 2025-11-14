import { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Gift, Copy, Share2, Download, TrendingUp, Store, 
  CheckCircle, Clock, QrCode, ArrowRight, CreditCard,
  Users, ShieldCheck
} from "lucide-react";
import { useCustomerReferral } from "@/hooks/useCustomerReferral";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ReferralEarningsChart } from "./ReferralEarningsChart";

export function CustomerReferralCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { referralData, stats, recentReferrals, history, isLoading, generateCode } = useCustomerReferral(user?.id);
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const hasAttemptedGeneration = useRef(false);

  useEffect(() => {
    if (
      user?.id && 
      referralData && 
      !referralData.referral_code && 
      !generateCode.isPending &&
      !hasAttemptedGeneration.current &&
      !isLoading
    ) {
      hasAttemptedGeneration.current = true;
      generateCode.mutate();
    }
  }, [user?.id, referralData?.referral_code, generateCode.isPending, isLoading]);

  const handleCopyCode = async () => {
    if (!referralData?.referral_code) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(referralData.referral_code);
      toast({ title: "Copied!", description: "Referral code copied to clipboard" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to copy code", variant: "destructive" });
    } finally {
      setTimeout(() => setIsCopying(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    if (!referralData?.referral_code) return;
    const businessAppUrl = `https://business.shofz.com/auth?ref=${referralData.referral_code}`;
    setIsCopyingLink(true);
    try {
      await navigator.clipboard.writeText(businessAppUrl);
      toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to copy link", variant: "destructive" });
    } finally {
      setTimeout(() => setIsCopyingLink(false), 2000);
    }
  };

  const handleShareCode = async () => {
    if (!referralData?.referral_code) return;
    const businessAppUrl = `https://business.shofz.com/auth?ref=${referralData.referral_code}`;
    const shareData = {
      title: "Join Shofz Business",
      text: `Join Shofz with my referral code ${referralData.referral_code} and grow your business online!`,
      url: businessAppUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        toast({ title: "Link Copied", description: "Share link copied to clipboard" });
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleDownloadQR = async () => {
    try {
      const svg = document.getElementById("referral-qr-code");
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = 300;
        canvas.height = 300;
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 300, 300);
          ctx.drawImage(img, 0, 0, 300, 300);
        }
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `shofz-referral-${referralData?.referral_code}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast({ title: "Downloaded!", description: "QR code saved to your device" });
        });
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to download QR code", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Earnings & Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const businessAppUrl = `https://business.shofz.com/auth?ref=${referralData?.referral_code}`;

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Earnings & Payments
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Refer businesses and earn money for each verified shop
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Two Column Layout: QR + Code | Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
          {/* Left: QR Code + Referral Code */}
          <div className="space-y-4">
            {/* QR Code Display */}
            <div className="bg-white rounded-lg p-4 sm:p-5 md:p-6 flex items-center justify-center border">
              <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56">
                <QRCode
                  id="referral-qr-code"
                  value={businessAppUrl}
                  size={224}
                  level="H"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
            </div>

            {/* Referral Code */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                Your Referral Code
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 border">
                  <p className="text-base sm:text-lg md:text-xl font-mono font-bold tracking-wider text-center">
                    {referralData?.referral_code || "GENERATING..."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                  disabled={!referralData?.referral_code || isCopying}
                  className="h-10 w-10 sm:h-11 sm:w-11 shrink-0"
                >
                  {isCopying ? (
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Referral Link */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                Your Referral Link
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background rounded-md px-3 py-2 border overflow-x-auto">
                  <p className="text-xs md:text-sm font-mono text-muted-foreground truncate">
                    {referralData?.referral_code 
                      ? `https://business.shofz.com/auth?ref=${referralData.referral_code}`
                      : "Generating..."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  disabled={!referralData?.referral_code || isCopyingLink}
                >
                  {isCopyingLink ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleCopyCode}
                disabled={!referralData?.referral_code}
                variant="outline"
                size="sm"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Code
              </Button>
              <Button
                onClick={handleCopyLink}
                disabled={!referralData?.referral_code}
                variant="outline"
                size="sm"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Link
              </Button>
              <Button
                onClick={handleShareCode}
                disabled={!referralData?.referral_code}
                variant="outline"
                size="sm"
              >
                <Share2 className="w-3 h-3 mr-1" />
                Share
              </Button>
              <Button
                onClick={handleDownloadQR}
                disabled={!referralData?.referral_code}
                variant="outline"
                size="sm"
              >
                <Download className="w-3 h-3 mr-1" />
                QR Code
              </Button>
            </div>
          </div>

          {/* Right: Earnings & Stats */}
          <div className="space-y-4">
            {/* Earnings Summary */}
            <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-emerald-600">Your Earnings</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Total Earnings</span>
                  <span className="text-3xl font-bold text-emerald-600">
                    ₹{stats?.total_earnings?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold">
                    ₹{stats?.pending_earnings?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Next Payout</span>
                  <span className="font-semibold text-emerald-600">
                    ₹{stats?.approved_earnings?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-card rounded-lg p-3 border text-center">
                <Store className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{stats?.total_shops_referred || 0}</p>
                <p className="text-xs text-muted-foreground">Referred</p>
              </div>
              <div className="bg-card rounded-lg p-3 border text-center">
                <CheckCircle className="w-4 h-4 mx-auto mb-1 text-green-500" />
                <p className="text-lg font-bold">{stats?.verified_shops || 0}</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
              <div className="bg-card rounded-lg p-3 border text-center">
                <Clock className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                <p className="text-lg font-bold">{stats?.pending_verification || 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Earnings Trend Chart */}
        <ReferralEarningsChart history={history} />

        {/* Recent Referral History Preview */}
        {recentReferrals && recentReferrals.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Store className="w-4 h-4" />
                Recent Referrals
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/referral-history')}
              >
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-2">
              {recentReferrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {referral.shop_logo_url ? (
                      <img
                        src={referral.shop_logo_url}
                        alt={referral.shop_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{referral.shop_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(referral.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">₹{referral.amount.toFixed(2)}</p>
                    {referral.status === 'paid' && (
                      <Badge variant="default" className="text-xs">Paid</Badge>
                    )}
                    {referral.status === 'approved' && (
                      <Badge variant="secondary" className="text-xs">Approved</Badge>
                    )}
                    {referral.status === 'pending' && (
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How to Earn - Accordion */}
        <Accordion type="single" collapsible className="border-t pt-4">
          <AccordionItem value="how-to-earn" className="border-none">
            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                How to Earn with Referrals
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Add UPI
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Go to <strong>Payment Settings</strong> below and add your UPI ID to receive payments
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      Get Your Referral Code
                    </h4>
                    <p className="text-sm text-muted-foreground mb-1">
                      Your unique code: <span className="font-mono font-bold text-foreground">{referralData?.referral_code}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Copy or share using the buttons above
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Share Your Code
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-1">
                      <li>Send code to shop owners via WhatsApp/SMS/call</li>
                      <li>Share referral link on social media</li>
                      <li>Word of mouth marketing</li>
                    </ul>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Shop Signs Up with Your Code
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-1">
                      <li>Shop enters your code during signup</li>
                      <li>Or uses your referral link</li>
                      <li>System automatically connects them to your account</li>
                    </ul>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    5
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Admin Verifies & You Get Paid
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-1">
                      <li>Shofz admin checks shop details</li>
                      <li>Marks shop as "Verified"</li>
                      <li>Money automatically credited to your UPI ID</li>
                    </ul>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
