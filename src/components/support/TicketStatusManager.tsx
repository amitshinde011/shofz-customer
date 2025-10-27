import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CheckCircle2 } from 'lucide-react';
import { getStatusColor, getStatusLabel } from '@/lib/supportHelpers';
import { useUpdateTicketStatus } from '@/hooks/useSupportTickets';
import type { Database } from '@/integrations/supabase/types';

type SupportTicket = Database['public']['Tables']['support_tickets']['Row'];

interface TicketStatusManagerProps {
  ticket: SupportTicket;
}

export const TicketStatusManager = ({ ticket }: TicketStatusManagerProps) => {
  const updateStatus = useUpdateTicketStatus();

  const handleResolve = () => {
    updateStatus.mutate({ ticketId: ticket.id, status: 'resolved' });
  };

  const canMarkResolved = ticket.status === 'in_progress' || ticket.status === 'open';

  return (
    <div className="border-t bg-muted/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge className={getStatusColor(ticket.status || 'open')}>
            {getStatusLabel(ticket.status || 'open')}
          </Badge>
        </div>

        {canMarkResolved && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Resolved
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark Ticket as Resolved?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark your support ticket as resolved. You can always reopen it
                  by sending a new message if you need further assistance.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResolve}>
                  Yes, Mark as Resolved
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {ticket.status === 'resolved' && (
          <div className="text-sm text-muted-foreground">
            ✓ This ticket is resolved. Send a message to reopen it.
          </div>
        )}
      </div>

      {ticket.resolution_notes && (
        <div className="mt-3 p-3 bg-background rounded-lg">
          <p className="text-sm font-medium mb-1">Resolution Notes:</p>
          <p className="text-sm text-muted-foreground">{ticket.resolution_notes}</p>
        </div>
      )}
    </div>
  );
};
