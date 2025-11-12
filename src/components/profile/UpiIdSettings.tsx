import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, Edit, Save, X, AlertCircle, ChevronRight } from "lucide-react";
import { useCustomerReferral } from "@/hooks/useCustomerReferral";
import { customerReferralService } from "@/services/customerReferralService";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistance } from "date-fns";
import { useNavigate } from "react-router-dom";

export function UpiIdSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { referralData, stats, isLoading, updateUpi } = useCustomerReferral(user?.id);
  const [isEditing, setIsEditing] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleEdit = () => {
    setUpiId(referralData?.upi_id || "");
    setValidationError("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setUpiId("");
    setValidationError("");
    setIsEditing(false);
  };

  const handleSave = async () => {
    // Validate UPI ID
    const validation = customerReferralService.validateUpiId(upiId);
    if (!validation.valid) {
      setValidationError(validation.error || "Invalid UPI ID");
      return;
    }

    await updateUpi.mutateAsync(upiId);
    setIsEditing(false);
  };

  const maskUpiId = (id: string) => {
    if (!id) return "";
    const [username, bank] = id.split("@");
    if (username.length <= 4) return id;
    return `${username.slice(0, 2)}${"*".repeat(username.length - 4)}${username.slice(-2)}@${bank}`;
  };

  const hasEarnings = (stats?.pending_earnings || 0) > 0 || (stats?.approved_earnings || 0) > 0;
  const showAlert = !referralData?.upi_id && hasEarnings;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Payment Information
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Required for receiving referral earnings
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {showAlert && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have pending earnings. Please add your UPI ID to receive payments.
            </AlertDescription>
          </Alert>
        )}

        {!isEditing ? (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">UPI ID</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  {referralData?.upi_id ? "Edit" : "Add"}
                </Button>
              </div>
              {referralData?.upi_id ? (
                <>
                  <p className="text-base font-mono text-foreground">
                    {maskUpiId(referralData.upi_id)}
                  </p>
                  {referralData.updated_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last updated: {formatDistance(new Date(referralData.updated_at), new Date(), { addSuffix: true })}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No UPI ID added yet
                </p>
              )}
            </div>

            {/* Earnings Display */}
            {hasEarnings && (
              <div className="bg-emerald-500/5 rounded-lg p-4 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-emerald-600">
                    Earnings Summary
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/referral-history')}
                    className="text-xs h-auto py-1 px-2"
                  >
                    View Details
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Earnings</span>
                    <span className="font-semibold text-foreground">
                      ₹{stats?.total_earnings?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending Verification</span>
                    <span className="font-semibold text-amber-600">
                      ₹{stats?.pending_earnings?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Payout</span>
                    <span className="font-semibold text-emerald-600">
                      ₹{stats?.approved_earnings?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upi-id">
                UPI ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="upi-id"
                type="text"
                placeholder="username@paytm"
                value={upiId}
                onChange={(e) => {
                  setUpiId(e.target.value);
                  setValidationError("");
                }}
                className={validationError ? "border-destructive" : ""}
              />
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter your UPI ID (e.g., 9876543210@paytm, username@ybl)
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Common UPI handles:</strong> @paytm, @ybl, @okaxis, @oksbi, @okicici, @apl, @ibl
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={!upiId || updateUpi.isPending}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Save UPI ID
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateUpi.isPending}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
