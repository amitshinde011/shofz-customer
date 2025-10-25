import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Gift, CheckCircle, XCircle, Loader2, Star, Store } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReferralCodeEntryProps {
  onCodeValidated: (data: any) => void;
  onSkip: () => void;
}

interface ValidationResult {
  isValid: boolean;
  shopName?: string;
  shopLogo?: string;
  shopRating?: number;
  shopId?: string;
  referralCode?: string;
}

export function ReferralCodeEntry({ onCodeValidated, onSkip }: ReferralCodeEntryProps) {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateCode = async (inputCode: string) => {
    if (!inputCode || inputCode.length < 6) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);

    try {
      const { data, error } = await supabase
        .from('referral_codes' as any)
        .select(`
          referral_code,
          shop_id,
          shops(name, logo_url, rating)
        `)
        .eq('referral_code', inputCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (data && !error) {
        const shop = (data as any).shops;
        const referralData = data as any;
        setValidationResult({
          isValid: true,
          shopName: shop?.name,
          shopLogo: shop?.logo_url,
          shopRating: shop?.rating,
          shopId: referralData.shop_id,
          referralCode: referralData.referral_code
        });
      } else {
        setValidationResult({ isValid: false });
      }
    } catch (error) {
      console.error('[ReferralCode] Validation error:', error);
      setValidationResult({ isValid: false });
    }

    setIsValidating(false);
  };

  useEffect(() => {
    const debounced = setTimeout(() => {
      if (code) validateCode(code);
    }, 500);

    return () => clearTimeout(debounced);
  }, [code]);

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <Card className="border-border shadow-sm">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Have a Referral Code?</h3>
                <p className="text-sm text-muted-foreground">
                  Enter a code from a local shop to support them!
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  placeholder="Enter referral code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono h-12"
                  maxLength={20}
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
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={validationResult.shopLogo} />
                            <AvatarFallback className="bg-primary/10">
                              <Store className="w-6 h-6 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-success">
                              {validationResult.shopName}
                            </p>
                            {validationResult.shopRating && (
                              <div className="flex items-center mt-1">
                                <Star className="w-3 h-3 text-warning fill-warning" />
                                <span className="text-xs text-success ml-1">
                                  {validationResult.shopRating.toFixed(1)} rating
                                </span>
                              </div>
                            )}
                          </div>
                          <CheckCircle className="w-5 h-5 text-success" />
                        </div>
                        <p className="text-xs text-success/80">
                          This shop will receive 10 credits when you join!
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
                      <CardContent className="p-4">
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
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex space-x-3"
        >
          <Button 
            variant="outline" 
            onClick={onSkip}
            className="flex-1 h-12 text-base font-semibold rounded-xl"
          >
            Skip
          </Button>
          <Button 
            onClick={() => onCodeValidated(validationResult)}
            disabled={!validationResult?.isValid}
            className="flex-1 h-12 text-base font-semibold bg-primary hover:bg-primary-dark text-primary-foreground rounded-xl"
          >
            Continue
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-6"
        >
          <p className="text-xs text-muted-foreground">
            You can only use one referral code per account
          </p>
        </motion.div>
      </div>
    </div>
  );
}
