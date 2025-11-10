import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, Loader2, Check } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  isReady: boolean;
  pullThreshold?: number;
}

export const PullToRefreshIndicator = ({
  isPulling,
  isRefreshing,
  pullDistance,
  isReady,
  pullThreshold = 80,
}: PullToRefreshIndicatorProps) => {
  const isVisible = isPulling || isRefreshing;
  const progress = Math.min(pullDistance / pullThreshold, 1);
  const rotation = progress * 180;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            transform: `translateY(${Math.min(pullDistance, pullThreshold)}px)`,
          }}
        >
          <div className="mt-4 bg-background/95 backdrop-blur-sm border border-border rounded-full p-3 shadow-lg">
            {isRefreshing ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : isReady ? (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <ArrowDown 
                  className="h-5 w-5 text-primary" 
                  style={{ transform: 'rotate(180deg)' }}
                />
              </motion.div>
            ) : (
              <ArrowDown 
                className="h-5 w-5 text-muted-foreground transition-transform duration-200" 
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
