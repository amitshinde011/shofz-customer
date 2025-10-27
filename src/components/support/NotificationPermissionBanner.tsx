import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationPermissionBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const shouldShow = 
      'Notification' in window &&
      Notification.permission === 'default' &&
      !localStorage.getItem('notification_permission_dismissed');
    
    setShow(shouldShow);
  }, []);

  const handleEnable = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification_permission_dismissed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="p-3"
      >
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2 ml-6">
            <span className="text-sm">Enable notifications for instant updates</span>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={handleEnable}>
                Enable
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
};
