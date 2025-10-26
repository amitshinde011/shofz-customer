import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from '@/components/ImageUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function ProfilePictureUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleImageUploaded = async (url: string, path: string) => {
    if (!user) return;

    try {
      setIsUpdating(true);
      
      // Update user profile with new image URL
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: url })
        .eq('id', user.id);

      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Error",
        description: "Failed to update profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageDeleted = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Please log in to manage your profile picture
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>Profile Picture</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4 p-6">
          <ImageUpload
            currentImageUrl={user.avatar_url || ''}
            onImageUploaded={handleImageUploaded}
            onImageDeleted={handleImageDeleted}
            uploadOptions={{
              bucket: 'profile-images',
              folder: user.id,
              maxWidth: 400,
              maxHeight: 400,
              quality: 0.9,
              format: 'webp',
            }}
            size="lg"
            shape="circle"
            placeholder="Upload profile picture"
            disabled={isUpdating}
          />

        </CardContent>
      </Card>
    </motion.div>
  );
}