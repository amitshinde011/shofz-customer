import type { Database } from '@/integrations/supabase/types';

export type SupportCategory = Database['public']['Enums']['support_ticket_category'];
export type SupportPriority = Database['public']['Enums']['support_ticket_priority'];
export type SupportStatus = Database['public']['Enums']['support_ticket_status'];

/**
 * Generate unique ticket number
 */
export const generateTicketNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `TICKET-${timestamp}-${random}`;
};

/**
 * Auto-detect category from text using keyword matching
 */
export const detectCategory = (text: string): SupportCategory => {
  const lowerText = text.toLowerCase();
  
  if (/payment|pay|money|upi|transaction|refund/.test(lowerText)) {
    if (/refund|dispute|complaint|return/.test(lowerText)) {
      return 'refunds_disputes';
    }
    return 'payment_issues';
  }
  
  if (/technical|bug|error|crash|not working|broken|issue|problem/.test(lowerText)) {
    return 'technical_issues';
  }
  
  if (/account|verify|verification|login|password|access/.test(lowerText)) {
    return 'account_verification';
  }
  
  if (/shop|store|business|product listing|inventory|dashboard/.test(lowerText)) {
    return 'shop_management';
  }
  
  if (/product|item|quality|defect|wrong|damaged/.test(lowerText)) {
    return 'product_issues';
  }
  
  return 'general_inquiry';
};

/**
 * Get human-readable category label
 */
export const getCategoryLabel = (category: SupportCategory): string => {
  const labels: Record<SupportCategory, string> = {
    payment_issues: 'Payment Issues',
    technical_issues: 'Technical Issues',
    account_verification: 'Account Verification',
    refunds_disputes: 'Refunds & Disputes',
    general_inquiry: 'General Inquiry',
    shop_management: 'Shop Management',
    product_issues: 'Product Issues',
  };
  return labels[category];
};

/**
 * Get priority color classes
 */
export const getPriorityColor = (priority: SupportPriority): string => {
  const colors: Record<SupportPriority, string> = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return colors[priority];
};

/**
 * Get status color classes
 */
export const getStatusColor = (status: SupportStatus): string => {
  const colors: Record<SupportStatus, string> = {
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };
  return colors[status];
};

/**
 * Get status label
 */
export const getStatusLabel = (status: SupportStatus): string => {
  const labels: Record<SupportStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return labels[status];
};

/**
 * Format ticket number for display
 */
export const formatTicketNumber = (num: string): string => {
  return num.replace('TICKET-', '#');
};

/**
 * Time ago helper
 */
export const timeAgo = (date: string): string => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'just now';
};
