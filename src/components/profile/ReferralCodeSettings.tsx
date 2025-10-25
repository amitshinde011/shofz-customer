import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, Gift, Store, Star, Loader2, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { referralService } from "@/services/referralService";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export function ReferralCodeSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasUsedReferral, setHasUsedReferral] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    checkExistingReferral();
  }, [user?.id]);

  const checkExistingReferral = async () => {
    if (!user?.id) {
      console.log('[ReferralCodeSettings] No user ID found');
      return;
    }
    
    console.log('[ReferralCodeSettings] Checking referral for user:', user.id);
    setIsChecking(true);
    const hasReferral = await referralService.hasUsedReferral(user.id);
    console.log('[ReferralCodeSettings] Has used referral:', hasReferral);
    setHasUsedReferral(hasReferral);
    setIsChecking(false);
  };

  const validateCode = async (inputCode: string) => {
    if (!inputCode || inputCode.length < 6) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    const result = await referralService.validateReferralCode(inputCode);
    
    if (result.valid) {
      setValidationResult({
        isValid: true,
        shopName: result.shopName,
        shopLogo: result.shopLogo,
        shopRating: result.shopRating
      });
    } else {
      setValidationResult({ isValid: false });
    }
    
    setIsValidating(false);
  };

  const handleSubmit = async () => {
    if (!user?.id || !code || !validationResult?.isValid) return;

    setIsSubmitting(true);
    const result = await referralService.processCustomerReferral(user.id, code);
    
    if (result.success) {
      toast({
        title: "Success!",
        description: "Referral code applied successfully. The shop has been credited.",
      });
      setHasUsedReferral(true);
      setCode("");
      setValidationResult(null);
    } else {
      toast({
        title: "Failed",
        description: result.error || "Failed to apply referral code",
        variant: "destructive",
      });
    }
    
    setIsSubmitting(false);
  };

  useEffect(() => {
    const debounced = setTimeout(() => {
      if (code && !hasUsedReferral) validateCode(code);
    }, 500);

    return () => clearTimeout(debounced);
  }, [code, hasUsedReferral]);

  if (isChecking) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            <span>Checking referral status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasUsedReferral) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <Gift className="w-5 h-5 mr-2 text-primary" />
            Referral Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-success p-4 bg-success/5 rounded-lg border border-success/20">
            <CheckCircle className="w-5 h-5 mr-2 shrink-0" />
            <span className="text-sm">You've already used a referral code</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Gift className="w-5 h-5 mr-2 text-primary" />
          Support a Local Shop
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Have a referral code from a shop? Enter it to give them credit!
        </p>

        <div className="space-y-3">
          <Input
            placeholder="Enter referral code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="text-center text-lg font-mono"
            maxLength={20}
            disabled={isSubmitting}
          />

          {isValidating && (
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Validating code...
            </div>
          )}

          {validationResult?.isValid && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-success/5 border-success/20">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={validationResult.shopLogo} />
                      <AvatarFallback className="bg-primary/10">
                        <Store className="w-5 h-5 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-success text-sm">
                        {validationResult.shopName}
                      </p>
                      {validationResult.shopRating && (
                        <div className="flex items-center mt-0.5">
                          <Star className="w-3 h-3 text-warning fill-warning" />
                          <span className="text-xs text-success ml-1">
                            {validationResult.shopRating.toFixed(1)} rating
                          </span>
                        </div>
                      )}
                    </div>
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-xs text-success/80 mt-2">
                    This shop will receive 10 credits!
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {validationResult?.isValid === false && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-3">
                  <div className="flex items-center">
                    <XCircle className="w-4 h-4 text-destructive mr-2" />
                    <span className="text-sm text-destructive">
                      Invalid or expired referral code
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!validationResult?.isValid || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              "Apply Referral Code"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
