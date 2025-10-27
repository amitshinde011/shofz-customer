import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChatMessages } from './ChatMessages';
import { MessageInput } from './MessageInput';
import { TicketsList } from './TicketsList';
import { NewTicketForm } from './NewTicketForm';
import { NotificationPermissionBanner } from './NotificationPermissionBanner';
import { TicketStatusManager } from './TicketStatusManager';
import { useCustomerTickets } from '@/hooks/useSupportTickets';
import { useRealtimeSupportChat } from '@/hooks/useRealtimeSupportChat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowLeft, MessageCircle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { formatTicketNumber } from '@/lib/supportHelpers';
import { cn } from '@/lib/utils';

type SupportTicket = Database['public']['Tables']['support_tickets']['Row'];

interface ChatInterfaceProps {
  fullPage?: boolean;
  initialTicketId?: string;
}

export const ChatInterface = ({ fullPage = false, initialTicketId }: ChatInterfaceProps) => {
  const [mode, setMode] = useState<'new' | 'tickets' | 'chat'>(
    initialTicketId ? 'chat' : 'tickets'
  );
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const { data: tickets, isLoading: ticketsLoading } = useCustomerTickets();
  const { 
    messages, 
    isLoading: messagesLoading, 
    isSending, 
    sendMessage,
    typingUsers,
    startTyping,
    stopTyping,
  } = useRealtimeSupportChat(selectedTicket?.id || null);

  const handleNewTicketSuccess = (ticketId: string) => {
    // Find the newly created ticket
    const newTicket = tickets?.find((t) => t.id === ticketId);
    if (newTicket) {
      setSelectedTicket(newTicket);
      setMode('chat');
    }
  };

  const handleTicketClick = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setMode('chat');
  };

  const handleBackToTickets = () => {
    setSelectedTicket(null);
    setMode('tickets');
  };

  const handleSendMessage = (message: string, attachments?: string[]) => {
    sendMessage(message, attachments);
  };

  return (
    <Card className={cn('flex flex-col overflow-hidden', fullPage ? 'h-[calc(100vh-120px)]' : 'h-[600px]')}>
      {/* Notification Permission Banner */}
      <NotificationPermissionBanner />

      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === 'chat' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToTickets}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <MessageCircle className="h-5 w-5" />
            <h2 className="font-semibold">
              {mode === 'chat' && selectedTicket
                ? `${formatTicketNumber(selectedTicket.ticket_number)}`
                : 'Customer Support'}
            </h2>
          </div>

          {tickets && tickets.length > 0 && (
            <Badge variant="secondary">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</Badge>
          )}
        </div>

        {/* Mode tabs (hide when in chat mode) */}
        {mode !== 'chat' && (
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'new' | 'tickets')} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tickets">My Tickets</TabsTrigger>
              <TabsTrigger value="new">New Request</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {mode === 'new' && (
          <div className="p-4 overflow-y-auto">
            <NewTicketForm onSuccess={handleNewTicketSuccess} />
          </div>
        )}

        {mode === 'tickets' && (
          <div className="p-4 overflow-y-auto">
            <TicketsList
              tickets={tickets || []}
              isLoading={ticketsLoading}
              onTicketClick={handleTicketClick}
            />
          </div>
        )}

        {mode === 'chat' && selectedTicket && (
          <>
            <ChatMessages
              messages={messages}
              isLoading={messagesLoading}
              isTyping={typingUsers.some(u => u.user_role === 'support')}
            />
            <TicketStatusManager ticket={selectedTicket} />
            <MessageInput
              onSend={handleSendMessage}
              onTypingStart={startTyping}
              onTypingStop={stopTyping}
              disabled={isSending}
              placeholder="Type your message..."
            />
          </>
        )}
      </div>
    </Card>
  );
};
