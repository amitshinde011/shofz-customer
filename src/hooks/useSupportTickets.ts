import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createTicket,
  getCustomerTickets,
  getTicketById,
  updateTicketStatus,
  type CreateTicketData,
} from '@/services/supportService';

/**
 * Fetch all tickets for current user
 */
export const useCustomerTickets = () => {
  return useQuery({
    queryKey: ['support-tickets'],
    queryFn: getCustomerTickets,
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Fetch single ticket by ID
 */
export const useTicketById = (ticketId: string | null) => {
  return useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: () => ticketId ? getTicketById(ticketId) : null,
    enabled: !!ticketId,
  });
};

/**
 * Create new support ticket
 */
export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Support ticket created successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to create ticket:', error);
      toast.error('Failed to create ticket. Please try again.');
    },
  });
};

/**
 * Update ticket status
 */
export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, status }: { 
      ticketId: string; 
      status: 'open' | 'in_progress' | 'resolved' | 'closed' 
    }) => updateTicketStatus(ticketId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', variables.ticketId] });
      toast.success('Ticket status updated');
    },
    onError: (error: Error) => {
      console.error('Failed to update ticket status:', error);
      toast.error('Failed to update ticket status');
    },
  });
};
