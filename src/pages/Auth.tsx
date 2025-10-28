import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { UnifiedAuth } from "@/components/auth/UnifiedAuth";
import { ReferralCodeEntry } from "@/components/auth/ReferralCodeEntry";
import { ProfileSetup } from "@/components/auth/ProfileSetup";
import { useToast } from "@/hooks/use-toast";
import { referralService } from "@/services/referralService";
import { useAuth } from "@/contexts/AuthContext";
import { Gift } from "lucide-react";

export type AuthStep = "auth" | "referral" | "profile-setup";

interface AuthProps {
  onAuthComplete?: () => void;
}

export default function Auth({ onAuthComplete }: AuthProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>("auth");
  const [referralData, setReferralData] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isCheckingReferral, setIsCheckingReferral] = useState(false);
  const [urlReferralCode, setUrlReferralCode] = useState<string | null>(null);
  const [isValidatingUrlReferral, setIsValidatingUrlReferral] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, authenticateWithEmail } = useAuth();
  const [searchParams] = useSearchParams();

  // Extract and validate referral code from URL on mount
  useEffect(() => {
    const extractAndValidateReferral = async () => {
      const urlCode = searchParams.get('ref') || searchParams.get('referral');
      
      if (!urlCode) return;
      
      console.log('[Auth] Referral code detected in URL:', urlCode);
      setIsValidatingUrlReferral(true);
      
      const validation = await referralService.validateReferralCode(urlCode);
      
      if (validation.valid) {
        console.log('[Auth] URL referral code is valid:', validation);
        
        setReferralData({
          referralCode: urlCode.toUpperCase(),
          shopName: validation.shopName,
          shopLogo: validation.shopLogo,
          shopRating: validation.shopRating,
        });
        
        setUrlReferralCode(urlCode.toUpperCase());
        
        toast({
          title: "Referral code applied! 🎉",
          description: `You'll support ${validation.shopName || 'this shop'} when you sign up.`,
          duration: 5000,
        });
      } else {
        console.log('[Auth] Invalid referral code in URL:', urlCode);
        
        toast({
          title: "Invalid referral code",
          description: "The referral code in the URL is not valid.",
          variant: "destructive",
        });
      }
      
      setIsValidatingUrlReferral(false);
    };
    
    extractAndValidateReferral();
  }, [searchParams, toast]);

  const handleAuthComplete = async () => {
    // Process referral if provided
    if (referralData && user?.id) {
      console.log('[Auth] Processing referral after signup:', referralData);
      const result = await referralService.processCustomerReferral(
        user.id,
        referralData.referralCode
      );

      if (result.success) {
        toast({
          title: "Thanks for using a referral code!",
          description: `${referralData.shopName || 'The shop'} has been credited.`,
        });
      } else {
        console.error('[Auth] Failed to process referral:', result.error);
      }
    }

    if (onAuthComplete) {
      onAuthComplete();
    } else {
      // Redirect to the page they were trying to access, or home
      const from = (location.state as any)?.from || '/';
      navigate(from, { replace: true });
    }
  };

  const handleAuthSuccess = (newUser: boolean) => {
    setIsNewUser(newUser);
    if (newUser) {
      // New user: show profile setup
      setCurrentStep("profile-setup");
    } else {
      // Existing user: complete auth directly
      handleAuthComplete();
    }
  };

  const handleProfileSetupComplete = async () => {
    setIsCheckingReferral(true);
    
    // Check if user already used a referral code
    if (user?.id) {
      const hasUsedReferral = await referralService.hasUsedReferral(user.id);
      if (hasUsedReferral) {
        // Skip referral step, go straight to completion
        console.log('[Auth] User already used referral, skipping referral step');
        setIsCheckingReferral(false);
        handleAuthComplete();
        return;
      }
    }
    
    setIsCheckingReferral(false);
    
    // If referral from URL exists, skip manual entry and complete
    if (referralData && urlReferralCode) {
      console.log('[Auth] Using referral from URL, skipping manual entry');
      handleAuthComplete();
    } else {
      // No URL referral: show manual referral code entry
      setCurrentStep("referral");
    }
  };

  const handleSkip = () => {
    // Navigate back to home or previous page
    const from = (location.state as any)?.from;
    if (from && from !== '/auth') {
      const protectedRoutes = ['/inquiries', '/favorites', '/profile', '/inquiry'];
      const isProtectedRoute = protectedRoutes.some(route => from.startsWith(route));
      navigate(isProtectedRoute ? '/' : from, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  switch (currentStep) {
    case "auth":
      return (
        <div className="relative">
          {referralData && urlReferralCode && (
            <div className="absolute top-0 left-0 right-0 z-10 mx-4 mt-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Referral Active: {referralData.shopName}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Complete signup to support this shop
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <UnifiedAuth
            onBack={handleSkip}
            onAuthSuccess={handleAuthSuccess}
            onAuthenticate={authenticateWithEmail}
          />
        </div>
      );

    case "profile-setup":
      return (
        <ProfileSetup
          onComplete={handleProfileSetupComplete}
        />
      );
    
    case "referral":
      return (
        <ReferralCodeEntry
          onCodeValidated={(data) => {
            setReferralData(data);
            handleAuthComplete();
          }}
          onSkip={handleAuthComplete}
        />
      );
    
    default:
      return (
        <UnifiedAuth
          onBack={handleSkip}
          onAuthSuccess={handleAuthSuccess}
          onAuthenticate={authenticateWithEmail}
        />
      );
  }
}