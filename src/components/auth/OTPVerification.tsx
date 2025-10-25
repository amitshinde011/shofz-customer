import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface OTPVerificationProps {
  onBack: () => void;
  onNext: () => void;
  phoneNumber: string;
}

export function OTPVerification({ onBack, onNext, phoneNumber }: OTPVerificationProps) {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const { toast } = useToast();
  // Note: This component is not currently used in the auth flow
  // const { verifyOTP, signInWithOTP } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) return;

    setIsLoading(true);

    // This component is not currently used - OTP flow not implemented
    toast({
      title: "Not Available",
      description: "Phone verification is not currently available.",
      variant: "destructive",
    });

    setIsLoading(false);
    onBack();
  };

  const handleResend = async () => {
    setIsLoading(true);
    
    // This component is not currently used - OTP flow not implemented
    toast({
      title: "Not Available",
      description: "Phone verification is not currently available.",
      variant: "destructive",
    });
    
    setIsLoading(false);
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
          Verify Phone Number
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
          <div className="bg-success/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-4 font-inter">
            Enter Verification Code
          </h2>
          <p className="text-muted-foreground mb-2">
            We've sent a 6-digit code to
          </p>
          <p className="text-foreground font-medium">{phoneNumber}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-6"
        >
          {/* OTP Input */}
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => setOtp(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
                <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
                <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
                <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
                <InputOTPSlot index={4} className="w-12 h-12 text-lg" />
                <InputOTPSlot index={5} className="w-12 h-12 text-lg" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Resend Timer */}
          <div className="text-center">
            {canResend ? (
              <Button
                variant="link"
                onClick={handleResend}
                className="text-primary hover:text-primary-dark"
              >
                Resend Code
              </Button>
            ) : (
              <p className="text-muted-foreground text-sm">
                Resend code in {timer}s
              </p>
            )}
          </div>

          <Button
            onClick={handleVerify}
            disabled={otp.length !== 6 || isLoading}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary-dark text-primary-foreground rounded-xl"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                <span>Verifying...</span>
              </div>
            ) : (
              "Verify & Continue"
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
            Didn't receive the code? Check your SMS or try again
          </p>
        </motion.div>
      </div>
    </div>
  );
}