import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ChatInterface } from './ChatInterface';
import { useCustomerTickets } from '@/hooks/useSupportTickets';
import { useUnreadSupportMessages } from '@/hooks/useUnreadSupportMessages';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: tickets } = useCustomerTickets();
  const { unreadCount } = useUnreadSupportMessages();
  const location = useLocation();

  // Hide widget on support page
  if (location.pathname === '/support') {
    return null;
  }

  const activeTickets = tickets?.filter(
    (t) => t.status === 'open' || t.status === 'in_progress'
  ).length || 0;

  // Show unread count or active tickets
  const badgeCount = unreadCount > 0 ? unreadCount : activeTickets;

  return (
    <>
      {/* Floating Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-20 right-4 z-50 md:bottom-4"
      >
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full h-14 w-14 shadow-lg relative"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              <MessageCircle className="h-6 w-6" />
              {badgeCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {badgeCount > 9 ? '9+' : badgeCount}
                </Badge>
              )}
            </>
          )}
        </Button>
      </motion.div>

      {/* Chat Interface Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-36 right-4 z-50 md:bottom-20 w-[calc(100vw-2rem)] md:w-[400px] shadow-2xl"
          >
            <ChatInterface />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
