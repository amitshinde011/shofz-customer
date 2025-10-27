import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Headphones, Image as ImageIcon, File } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

type SupportMessage = Database['public']['Tables']['support_messages']['Row'];

interface MessageBubbleProps {
  message: SupportMessage;
  isOwnMessage: boolean;
  showSender?: boolean;
}

export const MessageBubble = ({ message, isOwnMessage, showSender = true }: MessageBubbleProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const attachments = message.attachments as string[] | null;
  const hasAttachments = attachments && attachments.length > 0;

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  return (
    <>
      <div
        className={cn(
          'flex gap-2 mb-4 animate-in fade-in slide-in-from-bottom-2',
          isOwnMessage ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        {showSender && (
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className={isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
              {isOwnMessage ? <User className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={cn('flex flex-col max-w-[80%]', isOwnMessage ? 'items-end' : 'items-start')}>
          {showSender && !isOwnMessage && (
            <Badge variant="secondary" className="mb-1 text-xs">
              Support Team
            </Badge>
          )}

          <div
            className={cn(
              'rounded-lg px-4 py-2',
              isOwnMessage
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            )}
          >
            <p className="whitespace-pre-wrap break-words text-sm">{message.message}</p>

            {hasAttachments && (
              <div className="mt-2 space-y-2">
                {attachments.map((url, index) => (
                  <div key={index}>
                    {isImage(url) ? (
                      <button
                        onClick={() => setSelectedImage(url)}
                        className="block rounded overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={url}
                          alt={`Attachment ${index + 1}`}
                          className="max-w-full h-auto max-h-48 rounded"
                        />
                      </button>
                    ) : (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'flex items-center gap-2 p-2 rounded hover:opacity-80 transition-opacity',
                          isOwnMessage ? 'bg-primary-foreground/10' : 'bg-background'
                        )}
                      >
                        <File className="h-4 w-4" />
                        <span className="text-sm truncate">Attachment {index + 1}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <span className="text-xs text-muted-foreground mt-1">
            {message.created_at && formatTime(message.created_at)}
          </span>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <img src={selectedImage} alt="Full size" className="w-full h-auto" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
