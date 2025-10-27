import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type SupportTicket = Database['public']['Tables']['support_tickets']['Row'];
type SupportTicketInsert = Database['public']['Tables']['support_tickets']['Insert'];
type SupportMessage = Database['public']['Tables']['support_messages']['Row'];
type SupportMessageInsert = Database['public']['Tables']['support_messages']['Insert'];

export interface CreateTicketData {
  subject: string;
  description: string;
  category: Database['public']['Enums']['support_ticket_category'];
  priority?: Database['public']['Enums']['support_ticket_priority'];
  attachments?: string[];
}

export interface SendMessageData {
  ticketId: string;
  message: string;
  attachments?: string[];
}

/**
 * Create a new support ticket
 */
export const createTicket = async (data: CreateTicketData): Promise<SupportTicket> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to create a ticket');
  }

  const ticketNumber = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  const ticketData: SupportTicketInsert = {
    ticket_number: ticketNumber,
    user_id: user.id,
    subject: data.subject,
    description: data.description,
    category: data.category,
    priority: data.priority || 'medium',
    status: 'open',
  };

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert(ticketData)
    .select()
    .single();

  if (ticketError) throw ticketError;
  if (!ticket) throw new Error('Failed to create ticket');

  // Create the first message with the description
  const messageData: SupportMessageInsert = {
    ticket_id: ticket.id,
    sender_id: user.id,
    message: data.description,
    attachments: data.attachments || null,
    is_internal_note: false,
  };

  const { error: messageError } = await supabase
    .from('support_messages')
    .insert(messageData);

  if (messageError) {
    console.error('Failed to create initial message:', messageError);
  }

  return ticket;
};

/**
 * Get all tickets for current user
 */
export const getCustomerTickets = async (): Promise<SupportTicket[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Get a single ticket by ID
 */
export const getTicketById = async (ticketId: string): Promise<SupportTicket | null> => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get all messages for a ticket
 */
export const getTicketMessages = async (ticketId: string): Promise<SupportMessage[]> => {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('is_internal_note', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Send a message to a ticket
 */
export const sendMessage = async (data: SendMessageData): Promise<SupportMessage> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const messageData: SupportMessageInsert = {
    ticket_id: data.ticketId,
    sender_id: user.id,
    message: data.message,
    attachments: data.attachments || null,
    is_internal_note: false,
  };

  const { data: message, error } = await supabase
    .from('support_messages')
    .insert(messageData)
    .select()
    .single();

  if (error) throw error;
  if (!message) throw new Error('Failed to send message');

  // If ticket is resolved, reopen it when customer sends a new message
  const { error: updateError } = await supabase
    .from('support_tickets')
    .update({ status: 'in_progress' })
    .eq('id', data.ticketId)
    .in('status', ['resolved', 'closed']);

  if (updateError) {
    console.error('Failed to reopen ticket:', updateError);
  }

  return message;
};

/**
 * Update ticket status
 */
export const updateTicketStatus = async (
  ticketId: string,
  status: Database['public']['Enums']['support_ticket_status']
): Promise<void> => {
  const updateData: any = { status };
  
  if (status === 'resolved') {
    updateData.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('support_tickets')
    .update(updateData)
    .eq('id', ticketId);

  if (error) throw error;
};
