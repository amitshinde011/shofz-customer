import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentValidationViewProps {
  inquiry: any;
  shop: any;
  amount: number;
  onProceed: () => void;
  onClose: () => void;
}

export function PaymentValidationView({ inquiry, shop, amount, onProceed, onClose }: PaymentValidationViewProps) {
  const [validation, setValidation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accountAge, setAccountAge] = useState<number>(0);

  useEffect(() => {
    validatePayment();
  }, []);

  const validatePayment = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get daily usage
      const { data: usage } = await supabase.rpc('get_daily_payment_usage', {
        user_id: user.id
      });

      // Get account age
      const { data: ageData } = await supabase.rpc('get_user_account_age_hours', {
        user_id: user.id
      });

      const age = ageData || 0;
      setAccountAge(age);

      const DAILY_LIMIT = 50000;
      const DAILY_TX_LIMIT = 10;
      const NEW_USER_LIMIT = 5000;
      const NEW_USER_HOURS = 72;

      const totalUsed = parseFloat(String(usage?.[0]?.total_amount || 0));
      const txCount = parseInt(String(usage?.[0]?.transaction_count || 0), 10);
      const isNewUser = age < NEW_USER_HOURS;

      const validation = {
        allowed: true,
        remaining_amount: DAILY_LIMIT - totalUsed,
        remaining_transactions: DAILY_TX_LIMIT - txCount,
        total_used: totalUsed,
        transaction_count: txCount,
        is_new_user: isNewUser,
        new_user_limit: NEW_USER_LIMIT,
        warnings: [] as string[]
      };

      // Check limits
      if (isNewUser && amount > NEW_USER_LIMIT) {
        validation.allowed = false;
        validation.warnings.push(`New users (< 72 hours) are limited to ₹${NEW_USER_LIMIT.toLocaleString()} per transaction`);
      }

      if (totalUsed + amount > DAILY_LIMIT) {
        validation.allowed = false;
        validation.warnings.push(`Daily limit of ₹${DAILY_LIMIT.toLocaleString()} would be exceeded`);
      }

      if (txCount >= DAILY_TX_LIMIT) {
        validation.allowed = false;
        validation.warnings.push(`Daily transaction limit of ${DAILY_TX_LIMIT} reached`);
      }

      // Warnings (not blocking)
      if (totalUsed + amount > DAILY_LIMIT * 0.8) {
        validation.warnings.push(`Approaching daily limit`);
      }

      if (txCount >= DAILY_TX_LIMIT * 0.8) {
        validation.warnings.push(`Approaching transaction limit`);
      }

      setValidation(validation);
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate payment');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!validation) return null;

  const dailyUsagePercent = (validation.total_used / 50000) * 100;
  const txUsagePercent = (validation.transaction_count / 10) * 100;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Validation</DialogTitle>
          <DialogDescription>Checking your payment limits</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Display */}
          <div className="bg-primary/5 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Payment Amount</p>
            <p className="text-3xl font-bold text-primary">₹{amount.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-1">to {shop.name}</p>
          </div>

          {/* Daily Limits */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Daily Amount Used</span>
                <span className="font-medium">₹{validation.total_used.toLocaleString()} / ₹50,000</span>
              </div>
              <Progress value={dailyUsagePercent} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Transactions Today</span>
                <span className="font-medium">{validation.transaction_count} / 10</span>
              </div>
              <Progress value={txUsagePercent} className="h-2" />
            </div>
          </div>

          {/* New User Status */}
          {validation.is_new_user && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                New user limit: ₹{validation.new_user_limit.toLocaleString()} per transaction
                <br />
                <span className="text-xs text-muted-foreground">
                  Account age: {Math.round(accountAge)} hours
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="space-y-2">
              {validation.warnings.map((warning: string, idx: number) => (
                <Alert key={idx} variant={validation.allowed ? "default" : "destructive"}>
                  {validation.allowed ? <AlertCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Success Message */}
          {validation.allowed && validation.warnings.length === 0 && (
            <Alert className="border-success">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Payment validation successful! You can proceed.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={onProceed} 
              disabled={!validation.allowed}
              className="flex-1"
            >
              {validation.allowed ? 'Proceed to Payment' : 'Cannot Proceed'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
