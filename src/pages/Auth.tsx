import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UnifiedAuth } from "@/components/auth/UnifiedAuth";
import { ReferralCodeEntry } from "@/components/auth/ReferralCodeEntry";
import { ProfileSetup } from "@/components/auth/ProfileSetup";
import { useToast } from "@/hooks/use-toast";
import { referralService } from "@/services/referralService";
import { useAuth } from "@/contexts/AuthContext";

export type AuthStep = "auth" | "referral" | "profile-setup";

interface AuthProps {
  onAuthComplete?: () => void;
}

export default function Auth({ onAuthComplete }: AuthProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>("auth");
  const [referralData, setReferralData] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isCheckingReferral, setIsCheckingReferral] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, authenticateWithEmail } = useAuth();

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
    // New user without referral: show referral code entry
    setCurrentStep("referral");
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
        <UnifiedAuth
          onBack={handleSkip}
          onAuthSuccess={handleAuthSuccess}
          onAuthenticate={authenticateWithEmail}
        />
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