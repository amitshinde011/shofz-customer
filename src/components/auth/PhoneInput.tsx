import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Phone } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface PhoneInputProps {
  onBack: () => void;
  onNext: (phone: string) => void;
}

export function PhoneInput({ onBack, onNext }: PhoneInputProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  // Note: This component is not currently used in the auth flow
  // const { signInWithOTP } = useAuth();

  const handleContinue = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // This component is not currently used - OTP flow not implemented
    toast({
      title: "Not Available",
      description: "Phone authentication is not currently available. Please use email sign in.",
      variant: "destructive",
    });
    
    setIsLoading(false);
    onBack();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center mb-8"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mr-4 h-10 w-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground font-inter">
          Enter Phone Number
        </h1>
      </motion.div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Phone className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-4 font-inter">
            Verify Your Number
          </h2>
          <p className="text-muted-foreground">
            We'll send you a verification code to confirm your phone number
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-6"
        >
          {/* Phone Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Phone Number</label>
            <div className="flex space-x-2">
              <div className="bg-muted border border-input rounded-lg px-3 py-2 min-w-[70px] flex items-center justify-center">
                <span className="text-sm font-medium text-foreground">+91</span>
              </div>
              <Input
                type="tel"
                placeholder="9876543210"
                value={phoneNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 10) {
                    setPhoneNumber(value);
                  }
                }}
                className="flex-1 h-11 text-base"
                maxLength={10}
              />
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!phoneNumber || phoneNumber.length !== 10 || isLoading}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary-dark text-primary-foreground rounded-xl"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                <span>Sending Code...</span>
              </div>
            ) : (
              "Continue"
            )}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-muted-foreground">
            By continuing, you agree to receive SMS messages for verification
          </p>
        </motion.div>
      </div>
    </div>
  );
}