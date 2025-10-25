import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OfflineQueueItem {
  id: string;
  action: () => Promise<any>;
  retryCount: number;
  timestamp: number;
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Your connection has been restored.",
      });
      
      // Process offline queue
      processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're Offline",
        description: "Some features may be limited. Changes will sync when you're back online.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const addToOfflineQueue = (action: () => Promise<any>) => {
    const item: OfflineQueueItem = {
      id: crypto.randomUUID(),
      action,
      retryCount: 0,
      timestamp: Date.now(),
    };
    
    setOfflineQueue(prev => [...prev, item]);
    
    // Store in localStorage for persistence
    const stored = localStorage.getItem('offlineQueue');
    const queue = stored ? JSON.parse(stored) : [];
    queue.push({ ...item, action: item.action.toString() });
    localStorage.setItem('offlineQueue', JSON.stringify(queue));
  };

  const processOfflineQueue = async () => {
    if (!isOnline || offlineQueue.length === 0) return;

    const queue = [...offlineQueue];
    setOfflineQueue([]);

    for (const item of queue) {
      try {
        await item.action();
        // Remove from localStorage
        const stored = localStorage.getItem('offlineQueue');
        if (stored) {
          const parsedQueue = JSON.parse(stored);
          const filtered = parsedQueue.filter((q: any) => q.id !== item.id);
          localStorage.setItem('offlineQueue', JSON.stringify(filtered));
        }
      } catch (error) {
        console.error('Failed to process offline action:', error);
        
        // Retry logic
        if (item.retryCount < 3) {
          setOfflineQueue(prev => [...prev, { ...item, retryCount: item.retryCount + 1 }]);
        } else {
          toast({
            title: "Sync Failed",
            description: "Some changes couldn't be synced. Please try again manually.",
            variant: "destructive",
          });
        }
      }
    }
  };

  return {
    isOnline,
    offlineQueue,
    addToOfflineQueue,
    processOfflineQueue,
  };
}
