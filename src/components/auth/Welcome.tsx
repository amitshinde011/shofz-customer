import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Search, Store, X } from "lucide-react";
import { Link } from "react-router-dom";

interface WelcomeProps {
  onGetStarted: () => void;
  onSkip?: () => void;
}

export function Welcome({ onGetStarted, onSkip }: WelcomeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex flex-col justify-center px-6 py-8">
      {/* Skip/Close Button */}
      {onSkip && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute top-4 right-4 z-10"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onSkip}
            className="rounded-full h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>
        </motion.div>
      )}

      <div className="max-w-md mx-auto w-full text-center">
        {/* Logo and Branding */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12"
        >
          <div className="flex items-center justify-center mx-auto mb-6">
            <img
              src="/shofz-logo.png"
              alt="Shofz Logo"
              className="w-24 h-24"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2 font-inter">
            Shofz
          </h1>
          <p className="text-lg text-primary font-medium">Customer</p>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mb-12"
        >
          <h2 className="text-2xl font-semibold text-foreground mb-4 font-inter">
            Discover Local Shops & Products
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-8">
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
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <span className="text-foreground font-medium">Find nearby shops & services</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center space-x-3 text-left"
            >
              <div className="bg-secondary/10 p-2 rounded-lg">
                <Search className="w-5 h-5 text-secondary" />
              </div>
              <span className="text-foreground font-medium">Search products & compare prices</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center space-x-3 text-left"
            >
              <div className="bg-warning/10 p-2 rounded-lg">
                <Store className="w-5 h-5 text-warning" />
              </div>
              <span className="text-foreground font-medium">Get exclusive local deals</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Get Started Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          className="space-y-3"
        >
          <Button
            onClick={onGetStarted}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary-dark text-primary-foreground rounded-xl group"
          >
            Sign In / Sign Up
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>

          {onSkip && (
            <Button
              onClick={onSkip}
              variant="outline"
              className="w-full h-12 text-base font-medium rounded-xl"
            >
              Continue Browsing
            </Button>
          )}

          {/* Google Sign In option is available but requires Supabase configuration */}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="text-sm text-muted-foreground mt-8"
        >
          By continuing, you agree to our Terms of Service and{" "}
          <Link to="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </motion.p>
      </div>
    </div>
  );
}