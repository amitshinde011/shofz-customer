import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageAttachment {
  url: string;
  name?: string;
  type?: string;
}

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
  isCurrentUser: boolean;
}

export function MessageAttachments({ attachments, isCurrentUser }: MessageAttachmentsProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className={`grid gap-1 mt-2 ${
        attachments.length === 1 ? 'grid-cols-1' :
        attachments.length === 2 ? 'grid-cols-2' :
        'grid-cols-2'
      }`}>
        {attachments.map((attachment, index) => (
          <div
            key={index}
            className="relative rounded overflow-hidden border border-border/50 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setSelectedImage(attachment.url)}
          >
            <img
              src={attachment.url}
              alt={attachment.name || `Image ${index + 1}`}
              className="w-full h-32 object-cover"
            />
          </div>
        ))}
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-4 h-4 text-white" />
            </Button>
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Full size"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
