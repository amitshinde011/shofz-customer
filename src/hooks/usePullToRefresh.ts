import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  enabled?: boolean;
  pullThreshold?: number;
  maxPullDistance?: number;
  resistance?: number;
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  isReady: boolean;
}

const SCROLL_TOP_THRESHOLD = 0; // Only trigger when exactly at top

export const usePullToRefresh = ({
  onRefresh,
  enabled = true,
  pullThreshold = 80,
  maxPullDistance = 120,
  resistance = 0.5,
}: UsePullToRefreshOptions) => {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    isReady: false,
  });

  const touchStartY = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastRefreshTime = useRef<number>(0);
  const isNative = Capacitor.isNativePlatform();

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isNative || state.isRefreshing) return;
    
    // Check window scroll position instead of container
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, [enabled, isNative, state.isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || isNative || state.isRefreshing || touchStartY.current === 0) return;

    // Exit if user has scrolled away from top
    if (window.scrollY > 0) {
      // Reset touch tracking if user scrolled away
      touchStartY.current = 0;
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        isReady: false,
      });
      return;
    }

    const touchY = e.touches[0].clientY;
    const delta = touchY - touchStartY.current;

    // Additional safety check: only proceed if truly at the top
    if (window.scrollY > 0) {
      touchStartY.current = 0;
      return;
    }

    if (delta > 0) {
      // Prevent default browser pull-to-refresh
      e.preventDefault();

      // Apply resistance to pull distance
      const pullDistance = Math.min(
        delta * resistance,
        maxPullDistance
      );

      setState({
        isPulling: true,
        isRefreshing: false,
        pullDistance,
        isReady: pullDistance >= pullThreshold,
      });
    }
  }, [enabled, isNative, state.isRefreshing, pullThreshold, maxPullDistance, resistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || isNative || state.isRefreshing) return;

    touchStartY.current = 0;

    if (state.isReady) {
      // Debounce: prevent multiple refreshes within 2 seconds
      const now = Date.now();
      if (now - lastRefreshTime.current < 2000) {
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
          isReady: false,
        });
        return;
      }

      lastRefreshTime.current = now;

      setState({
        isPulling: false,
        isRefreshing: true,
        pullDistance: pullThreshold,
        isReady: false,
      });

      try {
        // Haptic feedback on mobile
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

        await onRefresh();

        // Show complete state briefly
        setState(prev => ({ ...prev, isRefreshing: false }));
      } catch (error) {
        console.error('Refresh failed:', error);
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
          isReady: false,
        });
      }
    } else {
      // Reset if threshold not met
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        isReady: false,
      });
    }
  }, [enabled, isNative, state.isRefreshing, state.isReady, onRefresh, pullThreshold]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !enabled || isNative) return;

    // Use passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enabled, isNative]);

  return {
    ...state,
    scrollContainerRef,
    isEnabled: enabled && !isNative,
  };
};
