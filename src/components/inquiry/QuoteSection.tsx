import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, Package, IndianRupee } from "lucide-react";
import { useInquiryResponse } from "@/hooks/useInquiryResponse";

interface QuoteSectionProps {
  inquiryId: string;
}

export function QuoteSection({ inquiryId }: QuoteSectionProps) {
  const { response, isLoading, isNew } = useInquiryResponse({ inquiryId });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quote</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!response) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quote</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            No quote received yet. The shop will respond to your inquiry soon.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={isNew ? "border-primary" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Quote Details</CardTitle>
            {isNew && (
              <Badge className="bg-primary animate-pulse">
                New!
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quoted Price */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Quoted Price</span>
              <IndianRupee className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary">
              ₹{response.quoted_price.toLocaleString('en-IN')}
            </div>
            {response.final_price && response.final_price !== response.quoted_price && (
              <div className="text-sm text-muted-foreground mt-1">
                Final: ₹{response.final_price.toLocaleString('en-IN')}
              </div>
            )}
          </div>

          {/* Delivery Time */}
          {response.estimated_delivery_days && (
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Estimated Delivery</div>
                <div className="text-sm text-muted-foreground">
                  {response.estimated_delivery_days} {response.estimated_delivery_days === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
          )}

          {/* Response Text */}
          {response.response_text && (
            <>
              <Separator />
              <div>
                <div className="text-sm font-medium mb-2">Shop's Message</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {response.response_text}
                </p>
              </div>
            </>
          )}

          {/* Payment Status */}
          {response.payment_requested && (
            <div className="flex items-center space-x-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">Payment Status: </span>
                <span className="capitalize">{response.payment_status.replace('_', ' ')}</span>
              </div>
            </div>
          )}

          {/* Accept Quote - Navigate to Payment */}
          {response.payment_requested && response.payment_status !== 'completed' && (
            <Button 
              onClick={() => window.location.hash = '#payment'}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
          )}

          {/* Quote Date */}
          <div className="text-xs text-muted-foreground text-center">
            Quote received on {new Date(response.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}