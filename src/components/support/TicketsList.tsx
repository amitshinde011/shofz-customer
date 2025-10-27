import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Clock } from 'lucide-react';
import { getStatusColor, getCategoryLabel, formatTicketNumber, timeAgo, getStatusLabel } from '@/lib/supportHelpers';
import type { Database } from '@/integrations/supabase/types';

type SupportTicket = Database['public']['Tables']['support_tickets']['Row'];

interface TicketsListProps {
  tickets: SupportTicket[];
  isLoading?: boolean;
  onTicketClick: (ticket: SupportTicket) => void;
}

export const TicketsList = ({ tickets, isLoading = false, onTicketClick }: TicketsListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No support tickets yet</h3>
        <p className="text-sm text-muted-foreground">
          Create a ticket to get help from our support team
        </p>
      </div>
    );
  }

  // Group tickets by status
  const activeTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const closedTickets = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed');

  return (
    <div className="space-y-6">
      {/* Active Tickets */}
      {activeTickets.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Active Tickets</h3>
          <div className="space-y-3">
            {activeTickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="p-4 cursor-pointer hover:border-primary transition-colors"
                onClick={() => onTicketClick(ticket)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatTicketNumber(ticket.ticket_number)}
                      </span>
                      <Badge variant="outline" className={getStatusColor(ticket.status || 'open')}>
                        {getStatusLabel(ticket.status || 'open')}
                      </Badge>
                    </div>
                    <h4 className="font-medium truncate">{ticket.subject}</h4>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {ticket.description}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {getCategoryLabel(ticket.category)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {ticket.created_at && timeAgo(ticket.created_at)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Closed Tickets */}
      {closedTickets.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Resolved Tickets</h3>
          <div className="space-y-3">
            {closedTickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="p-4 cursor-pointer hover:border-primary transition-colors opacity-60 hover:opacity-100"
                onClick={() => onTicketClick(ticket)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatTicketNumber(ticket.ticket_number)}
                      </span>
                      <Badge variant="outline" className={getStatusColor(ticket.status || 'closed')}>
                        {getStatusLabel(ticket.status || 'closed')}
                      </Badge>
                    </div>
                    <h4 className="font-medium truncate">{ticket.subject}</h4>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {getCategoryLabel(ticket.category)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {ticket.created_at && timeAgo(ticket.created_at)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
