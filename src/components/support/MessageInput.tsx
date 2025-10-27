import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MessageInputProps {
  onSend: (message: string, attachments?: string[]) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput = ({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = 'Type your message...',
}: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (onTypingStop) {
        onTypingStop();
      }
    };
  }, [onTypingStop]);

  const handleTyping = (value: string) => {
    setMessage(value);
    
    // Trigger typing start
    if (value.trim() && onTypingStart) {
      onTypingStart();
    }
    
    // Reset timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      if (onTypingStop) {
        onTypingStop();
      }
    }, 2000);
  };

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return;
    if (disabled || isUploading) return;

    // Stop typing indicator when sending
    if (onTypingStop) {
      onTypingStop();
    }

    try {
      let attachmentUrls: string[] = [];

      // Upload attachments if any
      if (attachments.length > 0) {
        setIsUploading(true);
        attachmentUrls = await uploadAttachments(attachments);
      }

      onSend(message, attachmentUrls.length > 0 ? attachmentUrls : undefined);
      setMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadAttachments = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `customer-uploads/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('customer-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('customer-uploads')
        .getPublicUrl(filePath);

      urls.push(publicUrl);
    }

    return urls;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file size (max 5MB per file)
    const validFiles = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 5MB`);
        return false;
      }
      return true;
    });

    setAttachments((prev) => [...prev, ...validFiles].slice(0, 3)); // Max 3 files
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background p-4">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm"
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading || attachments.length >= 3}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isUploading}
          className="min-h-[44px] max-h-[120px] resize-none"
          rows={1}
        />

        <Button
          onClick={handleSend}
          disabled={(!message.trim() && attachments.length === 0) || disabled || isUploading}
          size="icon"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};
