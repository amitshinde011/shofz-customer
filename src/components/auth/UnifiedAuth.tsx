import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Lock, Loader2, User, MapPin, Search, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UnifiedAuthProps {
  onBack: () => void;
  onAuthSuccess: (isNewUser: boolean, user?: any, requiresEmailConfirmation?: boolean) => void;
  onAuthenticate: (email: string, password: string, name?: string) => Promise<{ 
    success: boolean; 
    isNewUser?: boolean;
    user?: any;
    error?: string;
    requiresEmailConfirmation?: boolean;
  }>;
  referralBanner?: React.ReactNode;
}

export function UnifiedAuth({ onBack, onAuthSuccess, onAuthenticate, referralBanner }: UnifiedAuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNameField, setShowNameField] = useState(false);
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
    const result = await onAuthenticate(email, password, name || email.split('@')[0]);
    setLoading(false);

    if (result.success) {
      toast({
        title: result.requiresEmailConfirmation 
          ? "Check your email" 
          : (result.isNewUser ? "Welcome!" : "Welcome back!"),
        description: result.requiresEmailConfirmation
          ? "We've sent you a confirmation link"
          : (result.isNewUser ? "Your account has been created" : "You've successfully signed in"),
      });
      onAuthSuccess(result.isNewUser || false, result.user, result.requiresEmailConfirmation);
    } else {
      toast({
        title: "Authentication failed",
        description: result.error || "Please check your credentials and try again",
        variant: "destructive",
      });
    }
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

            <Button
              onClick={handleContinue}
              disabled={loading}
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
