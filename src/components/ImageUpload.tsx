import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { uploadImage, deleteImage, ImageUploadOptions } from '@/lib/imageUpload';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string, path: string) => void;
  onImageDeleted?: () => void;
  uploadOptions: ImageUploadOptions;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square' | 'rounded';
  placeholder?: string;
  showDeleteButton?: boolean;
  disabled?: boolean;
}

export function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  onImageDeleted,
  uploadOptions,
  className = '',
  size = 'md',
  shape = 'rounded',
  placeholder = 'Upload image',
  showDeleteButton = true,
  disabled = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled || isUploading) return;

    setIsUploading(true);
    try {
      const { url, path } = await uploadImage(file, uploadOptions);
      onImageUploaded(url, path);
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [disabled, isUploading, uploadOptions, onImageUploaded, toast]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    } else {
      toast({
        title: "Error",
        description: "Please drop an image file",
        variant: "destructive",
      });
    }
  }, [handleFileSelect, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDelete = async () => {
    if (!currentImageUrl || disabled) return;

    try {
      // Extract path from URL (assuming Supabase storage URL format)
      const urlParts = currentImageUrl.split('/');
      const path = urlParts.slice(-2).join('/'); // Gets folder/filename
      
      await deleteImage(uploadOptions.bucket, path);
      onImageDeleted?.();
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const openFileDialog = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      <motion.div
        className={`
          relative ${sizeClasses[size]} ${shapeClasses[shape]}
          border-2 border-dashed border-border
          flex flex-col items-center justify-center
          cursor-pointer transition-all duration-200
          hover:border-primary hover:bg-primary/5
          ${isDragging ? 'border-primary bg-primary/10' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${currentImageUrl ? 'border-solid border-border' : ''}
        `}
        onClick={openFileDialog}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        whileHover={!disabled ? { scale: 1.02 } : undefined}
        whileTap={!disabled ? { scale: 0.98 } : undefined}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-1" />
              <span className="text-xs text-muted-foreground">Uploading...</span>
            </motion.div>
          ) : currentImageUrl ? (
            <motion.div
              key="image"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full h-full"
            >
              <img
                src={currentImageUrl}
                alt="Uploaded"
                className={`w-full h-full object-cover ${shapeClasses[shape]}`}
              />
              
              {/* Delete button */}
              {showDeleteButton && !disabled && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center"
            >
              <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground px-2">
                {isDragging ? 'Drop here' : placeholder}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Upload hint */}
      {!currentImageUrl && !isUploading && (
        <div className="mt-2 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={openFileDialog}
            disabled={disabled}
            className="h-7 px-3 text-xs"
          >
            <Upload className="w-3 h-3 mr-1" />
            Choose File
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, JPG, WEBP up to 10MB
          </p>
        </div>
      )}
    </div>
  );
}