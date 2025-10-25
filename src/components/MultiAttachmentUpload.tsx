import React, { useCallback } from 'react';
import { Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { uploadFile, FileUploadOptions } from '@/lib/fileUpload';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MultiAttachmentUploadProps {
  value?: Attachment[];  // External state control
  onAttachmentsChange: (attachments: Attachment[]) => void;
  inquiryId: string;
  disabled?: boolean;
  maxAttachments?: number;
}

export interface Attachment {
  url: string;
  name: string;
  size: number;
  path: string;
  type: string;
}

export function MultiAttachmentUpload({
  value = [],  // Use external state
  onAttachmentsChange,
  inquiryId,
  disabled = false,
  maxAttachments = 5,
}: MultiAttachmentUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const { toast } = useToast();

  const uploadOptions: FileUploadOptions = {
    bucket: 'customer-uploads',
    folder: 'inquiries',
    inquiryId: inquiryId,
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
  };

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (disabled || isUploading) return;

    const fileArray = Array.from(files);
    
    // Check total attachments limit
    if (value.length + fileArray.length > maxAttachments) {
      toast({
        title: "Too many attachments",
        description: `Maximum ${maxAttachments} images allowed`,
        variant: "destructive",
      });
      return;
    }

    // Validate all files
    for (const file of fileArray) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 5MB limit`,
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Only image files are supported",
          variant: "destructive",
        });
        return;
      }
    }

    setIsUploading(true);
    const newAttachments: Attachment[] = [];

    try {
      for (const file of fileArray) {
        const uploadedFile = await uploadFile(file, uploadOptions);
        
        newAttachments.push({
          url: uploadedFile.url,
          name: uploadedFile.name,
          size: uploadedFile.size,
          path: uploadedFile.path,
          type: uploadedFile.type,
        });
      }

      const updatedAttachments = [...value, ...newAttachments];
      onAttachmentsChange(updatedAttachments);

      toast({
        title: "Images uploaded",
        description: `${newAttachments.length} image(s) attached successfully`,
      });
    } catch (error) {
      console.error('[MultiAttachmentUpload] Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [disabled, isUploading, value, maxAttachments, uploadOptions, onAttachmentsChange, toast]);

  const removeAttachment = (index: number) => {
    const updatedAttachments = value.filter((_, i) => i !== index);
    onAttachmentsChange(updatedAttachments);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {/* Attachments Grid */}
      {value.length > 0 && (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {value.map((attachment, index) => (
              <div
                key={index}
                className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted group"
              >
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={() => removeAttachment(index)}
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                  <p className="text-[10px] text-white truncate">{attachment.name}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Upload Button */}
      {value.length < maxAttachments && (
        <>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
            id={`multi-attachment-upload-${inquiryId}`}
            disabled={disabled || isUploading}
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(`multi-attachment-upload-${inquiryId}`)?.click()}
            disabled={disabled || isUploading}
            className="gap-2"
          >
            <Paperclip className="w-4 h-4" />
            {isUploading ? 'Uploading...' : `Attach images (${value.length}/${maxAttachments})`}
          </Button>
        </>
      )}
    </div>
  );
}
