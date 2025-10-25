import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, MessageSquare, Plus } from "lucide-react";

export default function InquirySuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const shopCount = parseInt(searchParams.get("shop_count") || "1");
  const productName = searchParams.get("product_name") || "the product";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="text-center">
          <CardContent className="p-8">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-success" />
            </motion.div>

            {/* Success Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h1 className="text-2xl font-bold text-foreground mb-3">
                {shopCount > 1 ? 'Inquiries' : 'Inquiry'} Sent Successfully!
              </h1>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Your inquiry for <span className="font-medium text-foreground">"{productName}"</span> has been sent to{' '}
                <span className="font-medium text-foreground">
                  {shopCount > 1 ? `${shopCount} shops` : 'the shop'}
                </span>.
              </p>
            </motion.div>

            {/* Estimated Response Time */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-muted rounded-lg p-4 mb-6"
            >
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Estimated Response Time</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You'll typically receive a response within 2-4 hours during business hours.
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="space-y-3"
            >
              <Button 
                onClick={() => navigate("/inquiries")}
                className="w-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Track Your Inquiries
              </Button>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/inquiry/new")}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Inquiry
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="flex-1"
                >
                  Go Home
                </Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}