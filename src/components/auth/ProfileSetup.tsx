import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileSetupProps {
  onComplete: () => void;
  userData?: {
    email: string;
  };
}

export function ProfileSetup({ onComplete, userData }: ProfileSetupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleComplete = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Success Icon */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <CheckCircle className="h-20 w-20 text-success mx-auto" />
            </motion.div>
          </div>

          {/* Welcome Message */}
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-foreground">
              Welcome, {user?.name || 'there'}!
            </h2>
            <p className="text-lg text-muted-foreground">
              Please check your email to verify your account
            </p>
            <p className="text-sm text-muted-foreground">
              Your account has been created successfully
            </p>
            <p className="text-sm text-muted-foreground">
              You're all set to start discovering local shops and products
            </p>
          </div>

          {/* Complete Button */}
          <Button
            onClick={handleComplete}
            disabled={isLoading}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary-dark text-primary-foreground rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Getting ready...
              </>
            ) : (
              "Start Shopping"
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}