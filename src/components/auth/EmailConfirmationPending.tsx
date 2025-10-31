import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmailConfirmationPendingProps {
  email: string;
}

export function EmailConfirmationPending({ email }: EmailConfirmationPendingProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="border-border shadow-sm">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-10 h-10 text-primary" />
                </div>
                
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Check Your Email
                </h2>
                
                <p className="text-muted-foreground mb-2">
                  We've sent a confirmation link to
                </p>
                
                <p className="text-foreground font-semibold mb-6">
                  {email}
                </p>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    📧 Click the link in the email to activate your account
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ⏱️ The link expires in 24 hours
                  </p>
                  <p className="text-sm text-muted-foreground">
                    📂 Check your spam folder if you don't see it
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center text-xs text-muted-foreground mt-6"
          >
            Already confirmed? Close this page and sign in
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
