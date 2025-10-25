import React, { useState, useCallback } from 'react';
import { Paperclip, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { uploadImage, ImageUploadOptions } from '@/lib/imageUpload';

interface AttachmentUploadProps {
  onAttachmentUploaded: (path: string) => void;
  onAttachmentRemoved: (path?: string) => void;
  inquiryId: string;
  disabled?: boolean;
}

interface Attachment {
  url: string;
  name: string;
  size: number;
  path: string;
}

export function AttachmentUpload({
  onAttachmentUploaded,
  onAttachmentRemoved,
  inquiryId,
  disabled = false,
}: AttachmentUploadProps) {
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadOptions: ImageUploadOptions = {
    bucket: 'customer-uploads',
    folder: 'inquiries',
    inquiryId: inquiryId,
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    format: 'webp',
  };

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (disabled || isUploading) return;

    const file = files[0]; // Only handle first file (single attachment)
    if (!file) return;

    console.log('[AttachmentUpload] File selected:', file.name, file.size, file.type);
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    // Only handle images
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Only image files are supported",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    console.log('[AttachmentUpload] Starting upload with options:', uploadOptions);

    try {
      const { url: uploadedUrl, path: uploadedPath } = await uploadImage(file, uploadOptions);
      console.log('[AttachmentUpload] Upload successful:', uploadedUrl, 'Path:', uploadedPath);

      const newAttachment: Attachment = {
        url: uploadedUrl,
        name: file.name,
        size: file.size,
        path: uploadedPath,
      };

      setAttachment(newAttachment);
      onAttachmentUploaded(uploadedPath);

      toast({
        title: "Image uploaded",
        description: "Your image has been attached successfully",
      });
    } catch (error) {
      console.error('[AttachmentUpload] Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [disabled, isUploading, uploadOptions, onAttachmentUploaded, toast]);

  const removeAttachment = () => {
    console.log('[AttachmentUpload] Removing attachment');
    const pathToRemove = attachment?.path;
    setAttachment(null);
    onAttachmentRemoved(pathToRemove);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex items-center gap-3">
      {/* Attachment Preview */}
      {attachment && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg flex-1">
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-10 h-10 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.size)}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={removeAttachment}
            className="h-8 w-8 shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Upload Button */}
      {!attachment && (
        <>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
            id={`attachment-upload-${inquiryId}`}
            disabled={disabled || isUploading}
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(`attachment-upload-${inquiryId}`)?.click()}
            disabled={disabled || isUploading}
            className="gap-2"
          >
            <Paperclip className="w-4 h-4" />
            {isUploading ? 'Uploading...' : 'Attach image'}
          </Button>
        </>
      )}
    </div>
  );
}