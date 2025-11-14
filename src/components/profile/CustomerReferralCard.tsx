import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Share2, TrendingUp, Store, CheckCircle, Clock, QrCode } from "lucide-react";
import { useCustomerReferral } from "@/hooks/useCustomerReferral";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ReferralQRCodeModal } from "./ReferralQRCodeModal";

export function CustomerReferralCard() {
  const { user } = useAuth();
  const { referralData, stats, isLoading, generateCode } = useCustomerReferral(user?.id);
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const hasAttemptedGeneration = useRef(false);

  const handleGenerateCode = () => {
    generateCode.mutate();
  };

  // Generate code on mount if needed (with race condition protection)
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
      handleGenerateCode();
    }
  }, [user?.id, referralData?.referral_code, generateCode.isPending, isLoading]);

  const handleCopyCode = async () => {
    if (!referralData?.referral_code) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(referralData.referral_code);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsCopying(false), 2000);
    }
  };

  const handleShareCode = async () => {
    if (!referralData?.referral_code) return;

    const shareData = {
      title: "Join LocalConnect",
      text: `Join LocalConnect with my referral code ${referralData.referral_code} and help local businesses grow!`,
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `${shareData.text}\n${shareData.url}`
        );
        toast({
          title: "Link Copied",
          description: "Share link copied to clipboard",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Refer & Earn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Refer & Earn
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Refer businesses and earn money for each verified shop
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Referral Code Display */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
            Your Referral Code
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-background rounded-md px-4 py-3 border border-border">
              <p className="text-3xl sm:text-4xl font-mono font-bold text-foreground tracking-wider">
                {referralData?.referral_code || "GENERATING..."}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyCode}
              disabled={!referralData?.referral_code || isCopying}
              className="shrink-0 h-12 w-12"
            >
              {isCopying ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleShareCode}
            disabled={!referralData?.referral_code}
            className="flex-1"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Code
          </Button>
          <Button
            onClick={() => setShowQRModal(true)}
            disabled={!referralData?.referral_code}
            variant="outline"
            className="flex-1"
          >
            <QrCode className="w-4 h-4 mr-2" />
            QR Code
          </Button>
        </div>

        {/* Earnings Summary */}
        <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-emerald-600">Your Earnings</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total Earnings</span>
              <span className="text-2xl font-bold text-emerald-600">
                ₹{stats?.total_earnings?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Pending Verification</span>
              <span className="font-semibold text-foreground">
                ₹{stats?.pending_earnings?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Next Payout</span>
              <span className="font-semibold text-foreground">
                ₹{stats?.approved_earnings?.toFixed(2) || "0.00"}
              </span>
            </div>
          </div>
        </div>

        {/* Referral Statistics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Store className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {stats?.total_shops_referred || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total Referred
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {stats?.verified_shops || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {stats?.pending_verification || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pending
            </p>
          </div>
        </div>
      </CardContent>

      {/* QR Code Modal */}
      <ReferralQRCodeModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        referralCode={referralData?.referral_code || ""}
      />
    </Card>
  );
}
