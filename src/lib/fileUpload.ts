import { supabase } from '@/integrations/supabase/client';
import { optimizeImage } from './imageUpload';

export interface FileUploadOptions {
  bucket: string;
  folder?: string;
  inquiryId?: string;
  maxWidth?: number;  // For images only
  maxHeight?: number; // For images only
  quality?: number;   // For images only
}

export interface UploadedFile {
  url: string;
  path: string;
  name: string;
  type: string;
  size: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function generateUniqueFileName(originalName: string, inquiryId?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const prefix = inquiryId ? `${inquiryId}_` : '';
  return `${prefix}${timestamp}_${random}.${extension}`;
}

export async function uploadFile(
  file: File,
  options: FileUploadOptions
): Promise<UploadedFile> {
  console.log('[FileUpload] Starting upload:', { 
    fileName: file.name, 
    fileType: file.type, 
    fileSize: file.size 
  });

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  try {
    let fileToUpload: Blob | File = file;
    let fileName: string;
    
    // Optimize images, upload other files as-is
    if (isImageFile(file)) {
      console.log('[FileUpload] Optimizing image...');
      fileToUpload = await optimizeImage(file, {
        maxWidth: options.maxWidth || 1920,
        maxHeight: options.maxHeight || 1920,
        quality: options.quality || 0.85,
        format: 'webp'
      });
      
      // Generate filename with webp extension for images
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      const prefix = options.inquiryId ? `${options.inquiryId}_` : '';
      fileName = `${prefix}${timestamp}_${random}.webp`;
    } else {
      console.log('[FileUpload] Uploading non-image file as-is...');
      fileName = generateUniqueFileName(file.name, options.inquiryId);
    }

    // Construct file path
    const folder = options.folder || 'files';
    const filePath = `${folder}/${fileName}`;

    console.log('[FileUpload] Uploading to:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(options.bucket)
      .upload(filePath, fileToUpload, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[FileUpload] Upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('[FileUpload] Upload successful:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(options.bucket)
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
      name: file.name,
      type: file.type,
      size: file.size,
    };
  } catch (error) {
    console.error('[FileUpload] Error:', error);
    throw error instanceof Error ? error : new Error('Upload failed');
  }
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error('[FileUpload] Delete error:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
}

export function getFileIcon(type: string): string {
  if (type.startsWith('image/')) return 'image';
  if (type.includes('pdf')) return 'pdf';
  if (type.startsWith('video/')) return 'video';
  if (type.includes('word') || type.includes('document')) return 'document';
  if (type.includes('sheet') || type.includes('excel')) return 'spreadsheet';
  if (type.includes('presentation') || type.includes('powerpoint')) return 'presentation';
  if (type.startsWith('audio/')) return 'audio';
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return 'archive';
  return 'file';
}

export function getFileTypeLabel(type: string): string {
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word') || type.includes('document')) return 'DOC';
  if (type.includes('sheet') || type.includes('excel')) return 'XLS';
  if (type.includes('presentation') || type.includes('powerpoint')) return 'PPT';
  if (type.startsWith('video/')) return 'VIDEO';
  if (type.startsWith('audio/')) return 'AUDIO';
  if (type.includes('zip')) return 'ZIP';
  if (type.includes('rar')) return 'RAR';
  if (type.startsWith('text/')) return 'TXT';
  return 'FILE';
}
