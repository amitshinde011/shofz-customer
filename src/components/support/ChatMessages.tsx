import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from '@/components/TypingIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

type SupportMessage = Database['public']['Tables']['support_messages']['Row'];

interface ChatMessagesProps {
  messages: SupportMessage[];
  isLoading?: boolean;
  isTyping?: boolean;
}

export const ChatMessages = ({ messages, isLoading = false, isTyping = false }: ChatMessagesProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && !showScrollButton) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, showScrollButton]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isScrolledToBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    setShowScrollButton(!isScrolledToBottom);
  };

  const scrollToBottom = () => {
    const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: 'smooth',
      });
    }
    setShowScrollButton(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-16 w-3/4 ml-auto" />
        <Skeleton className="h-16 w-3/4" />
      </div>
    );
  }

  if (messages.length === 0 && !isTyping) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <p>No messages yet</p>
          <p className="text-sm mt-2">Start the conversation with the support team</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <ScrollArea ref={scrollRef} className="h-full" onScrollCapture={handleScroll}>
        <div className="p-4">
          {messages.map((message, index) => {
            const isOwnMessage = currentUserId === message.sender_id;
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showSender = !prevMessage || prevMessage.sender_id !== message.sender_id;

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={isOwnMessage}
                showSender={showSender}
              />
            );
          })}

          {isTyping && <TypingIndicator userName="Support Team" />}
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-4 right-4 rounded-full shadow-lg"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
