import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, CheckCircle, Clock, XCircle, Calendar, IndianRupee } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerReferral } from '@/hooks/useCustomerReferral';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function ReferralHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { history, isLoadingHistory } = useCustomerReferral(user?.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'approved':
        return <Badge className="bg-primary/10 text-primary border-primary/20"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Referral History</h1>
          </div>
        </div>
        </div>

        <div className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const totalEarnings = history?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const paidEarnings = history?.filter(item => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const pendingEarnings = history?.filter(item => item.status === 'pending').reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Referral History</h1>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
                <p className="text-2xl font-bold text-foreground">₹{totalEarnings.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Paid Out</p>
                <p className="text-2xl font-bold text-success">₹{paidEarnings.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-bold text-primary">₹{pendingEarnings.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Referred Shops</CardTitle>
            <CardDescription>
              {history?.length || 0} shop{history?.length !== 1 ? 's' : ''} referred
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No referrals yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Share your referral code with businesses to start earning
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Earnings</TableHead>
                      <TableHead>Verified Date</TableHead>
                      <TableHead>Payout Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{item.shop_name || 'Shop'}</p>
                              <p className="text-xs text-muted-foreground">{item.referral_code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <IndianRupee className="w-4 h-4" />
                            <span className="font-medium">{Number(item.amount).toFixed(2)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.shop_verified_at ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {format(new Date(item.shop_verified_at), 'MMM d, yyyy')}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.paid_at ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {format(new Date(item.paid_at), 'MMM d, yyyy')}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Reference Notes */}
        {history && history.some(item => item.payment_reference) && (
          <Card>
            <CardHeader>
              <CardTitle>Payment References</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.filter(item => item.payment_reference).map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{item.shop_name || 'Shop'}</p>
                    <p className="text-xs text-muted-foreground">UTR: {item.payment_reference}</p>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success">Paid</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
