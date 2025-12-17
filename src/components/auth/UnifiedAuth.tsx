import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Mail, Lock, Loader2, User, MapPin, Search, Store, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Google icon component
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

interface UnifiedAuthProps {
  onBack: () => void;
  onAuthSuccess: (isNewUser: boolean, user?: any, requiresEmailConfirmation?: boolean) => void;
  onAuthenticate: (email: string, password: string, name?: string, rememberMe?: boolean) => Promise<{ 
    success: boolean; 
    isNewUser?: boolean;
    user?: any;
    error?: string;
    requiresEmailConfirmation?: boolean;
  }>;
  onGoogleSignIn?: () => Promise<{ success: boolean; error?: string }>;
  referralBanner?: React.ReactNode;
  emailConfirmationPending?: boolean;
  pendingEmail?: string | null;
}

export function UnifiedAuth({ onBack, onAuthSuccess, onAuthenticate, onGoogleSignIn, referralBanner, emailConfirmationPending, pendingEmail }: UnifiedAuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showNameField, setShowNameField] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // Default to checked
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleContinue = async () => {
    if (!email || !password) {
      toast({
        title: "Missing credentials",
        description: "Please enter your email and password",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!validatePassword(password)) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const result = await onAuthenticate(email, password, name || email.split('@')[0], rememberMe);
    setLoading(false);

    if (result.success) {
      // Don't navigate away if email confirmation required
      if (result.requiresEmailConfirmation) {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link. Click it, then sign in below.",
          duration: 8000,
        });
        // Stay on this screen
        return;
      }
      
      // Normal flow for sign-in or completed sign-up
      toast({
        title: result.isNewUser ? "Welcome!" : "Welcome back!",
        description: result.isNewUser ? "Your account has been created" : "You've successfully signed in",
      });
      onAuthSuccess(result.isNewUser || false, result.user, false);
    } else {
      toast({
        title: "Authentication failed",
        description: result.error || "Please check your credentials and try again",
        variant: "destructive",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    if (!onGoogleSignIn) return;
    
    setGoogleLoading(true);
    const result = await onGoogleSignIn();
    
    if (!result.success) {
      setGoogleLoading(false);
      toast({
        title: "Google sign-in failed",
        description: result.error || "Could not sign in with Google",
        variant: "destructive",
      });
    }
    // Note: Don't set googleLoading to false on success - user will be redirected
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex flex-col justify-center px-6 py-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="absolute top-4 left-4"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        {/* Logo and Branding */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-6 flex flex-col items-center"
        >
          <div className="flex items-center justify-center mx-auto mb-6">
            <img
              src="/shofz-logo.png"
              alt="Shofz Logo"
              className="w-16 h-16"
            />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2 font-inter">
            Shofz
          </h1>
        </motion.div>
        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          {referralBanner}

          {/* Email Confirmation Inline Banner */}
          {emailConfirmationPending && pendingEmail && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4"
            >
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Check your email
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                    We've sent a confirmation link to <strong>{pendingEmail}</strong>
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    📧 Click the link to activate, then sign in below
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <h2 className="text-xl font-semibold text-foreground mb-4 font-inter text-center">
            Discover Local Shops, Products & Deals
          </h2>
          <p className="text-sm text-muted-foreground text-base leading-relaxed mb-8  text-center">
            Find the best local businesses, products, and deals in your neighborhood. 
            Shop local, support community!
          </p>

          {/* Feature Highlights */}
          <div className="space-y-4 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center space-x-3 text-left"
            >
              <div className="bg-primary/10 p-2 rounded-lg">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground font-medium">Find nearby shops & services</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center space-x-3 text-left"
            >
              <div className="bg-secondary/10 p-2 rounded-lg">
                <Search className="w-4 h-4 text-secondary" />
              </div>
              <span className="text-sm text-foreground font-medium">Search products & compare prices</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center space-x-3 text-left"
            >
              <div className="bg-warning/10 p-2 rounded-lg">
                <Store className="w-4 h-4 text-warning" />
              </div>
              <span className="text-sm text-foreground font-medium">Get exclusive local deals</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Auth Form Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-foreground mb-2">Sign In or Create Account</h2>
          <p className="text-muted-foreground mb-6">Enter your email to continue</p>

          <div className="space-y-4">
            {showNameField && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-12"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                  className="pl-10 h-12"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <button
                  type="button"
                  onClick={() => window.location.href = '/forgot-password'}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                  className="pl-10 h-12"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={loading}
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-medium text-foreground cursor-pointer select-none flex items-center gap-2"
              >
                Keep session active
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Periodically refreshes your session in the background.
                        All sessions are permanent - you only need to sign in once.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
            </div>

            <Button
              onClick={handleContinue}
              disabled={loading || googleLoading}
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/80 text-primary-foreground rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Please wait...
                </>
              ) : (
                "Continue"
              )}
            </Button>

            {/* Separator */}
            {onGoogleSignIn && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gradient-to-br from-primary/5 to-secondary/5 px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading || googleLoading}
                  className="w-full h-12 text-base font-medium rounded-xl"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <GoogleIcon />
                      Continue with Google
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
