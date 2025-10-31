import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { UnifiedAuth } from "@/components/auth/UnifiedAuth";
import { ReferralCodeEntry } from "@/components/auth/ReferralCodeEntry";
import { ProfileSetup } from "@/components/auth/ProfileSetup";
import { EmailConfirmationPending } from "@/components/auth/EmailConfirmationPending";
import { useToast } from "@/hooks/use-toast";
import { referralService } from "@/services/referralService";
import { useAuth } from "@/contexts/AuthContext";
import { Gift } from "lucide-react";

export type AuthStep = "auth" | "referral" | "profile-setup" | "email-confirmation";

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
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, authenticateWithEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const userRef = useRef(user);
  const authUserIdRef = useRef<string | null>(user?.id ?? null);

  useEffect(() => {
    userRef.current = user;
    authUserIdRef.current = user?.id ?? null;
  }, [user]);

  // Extract and validate referral code from URL on mount
  useEffect(() => {
    const extractAndValidateReferral = async () => {
      const urlCode = searchParams.get('ref') || searchParams.get('referral');
      
      if (!urlCode) return;
      
      console.log('[Auth] Referral code detected in URL:', urlCode);
      setIsValidatingUrlReferral(true);
      
      const normalizedCode = urlCode.toUpperCase();
      const validation = await referralService.validateReferralCode(normalizedCode);
      
      if (validation.valid) {
        console.log('[Auth] URL referral code is valid:', validation);
        
        setReferralData({
          referralCode: normalizedCode,
          shopName: validation.shopName,
          shopLogo: validation.shopLogo,
          shopRating: validation.shopRating,
        });
        
        setUrlReferralCode(normalizedCode);
        
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
      
      // Clean up URL parameters after validation
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('ref');
      newSearchParams.delete('referral');
      const newSearch = newSearchParams.toString();
      navigate({
        pathname: location.pathname,
        search: newSearch,
      }, { replace: true });
      
      setIsValidatingUrlReferral(false);
    };
    
    extractAndValidateReferral();
  }, [searchParams, navigate, location.pathname]);

  const handleAuthComplete = async () => {
    // ✅ FIX 5: Improved wait for user data with better timeout
    let resolvedUserId = userRef.current?.id ?? authUserIdRef.current;
    if (!resolvedUserId) {
      console.log('[Auth] Waiting for user data to be available...');
      
      // Increased wait time from 2s to 4.5s
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        resolvedUserId = userRef.current?.id ?? authUserIdRef.current;
        
        if (resolvedUserId) {
          console.log(`[Auth] User data available after ${attempt * 300}ms`);
          break;
        }
      }
      
      if (!resolvedUserId) {
        console.error('[Auth] User data not available after 4.5 seconds');
        toast({
          title: "Session error",
          description: "Please sign in again to complete setup",
          variant: "destructive",
        });
        navigate('/auth', { replace: true });
        return;
      }
    }

    const currentUserId = resolvedUserId;

    // ✅ FIX 5: Process referral ONLY for new users with timeout protection
    if (referralData && currentUserId && isNewUser) {
      console.log('[Auth] Processing referral for new user:', referralData);
      
      try {
        // Add timeout to prevent hanging
        const referralPromise = referralService.processCustomerReferral(
          currentUserId,
          referralData.referralCode
        );
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Referral processing timeout')), 10000)
        );
        
        const result = await Promise.race([referralPromise, timeoutPromise]) as any;

        if (result.success) {
          toast({
            title: "Referral applied! 🎉",
            description: `${referralData.shopName || 'The shop'} has been credited.`,
          });
        } else {
          console.error('[Auth] Referral processing failed:', result.error);
          // Don't block user from continuing
          toast({
            title: "Referral not applied",
            description: "Don't worry, you can still use the app",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('[Auth] Referral processing exception:', error);
        // Don't block user
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

  const handleAuthSuccess = (newUser: boolean, authUser?: { id?: string; email?: string }, requiresEmailConfirmation?: boolean) => {
    // ✅ FIX 8: Handle email confirmation
    if (requiresEmailConfirmation && authUser?.email) {
      setPendingEmailConfirmation(true);
      setPendingEmail(authUser.email);
      setCurrentStep("email-confirmation");
      return;
    }

    if (authUser?.id) {
      authUserIdRef.current = authUser.id;
    }

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
    const resolvedUserId = userRef.current?.id ?? authUserIdRef.current;
    if (resolvedUserId) {
      const hasUsedReferral = await referralService.hasUsedReferral(resolvedUserId);
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
        <UnifiedAuth
          onBack={handleSkip}
          onAuthSuccess={handleAuthSuccess}
          onAuthenticate={authenticateWithEmail}
          referralBanner={
            urlReferralCode && referralData ? (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-foreground">
                  🎁 Referred by <strong>{referralData.shopName || 'a shop'}</strong>
                </p>
              </div>
            ) : null
          }
        />
      );

    case "email-confirmation":
      return <EmailConfirmationPending email={pendingEmail || ""} />;

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
