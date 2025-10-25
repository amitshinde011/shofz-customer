import { useEffect, useRef } from 'react';
import { analyticsService } from '@/services/analyticsService';

interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
}

/**
 * Hook to monitor and report performance metrics
 */
export function usePerformanceMonitor(pageName: string) {
  const hasReported = useRef(false);

  useEffect(() => {
    if (hasReported.current) return;

    const reportPerformanceMetrics = () => {
      try {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          // Page Load Time
          const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
          analyticsService.trackPerformance(`${pageName}_page_load`, pageLoadTime, 'ms');

          // DOM Content Loaded
          const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
          analyticsService.trackPerformance(`${pageName}_dom_content_loaded`, domContentLoaded, 'ms');
        }

        // First Contentful Paint (FCP)
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcp) {
          analyticsService.trackPerformance(`${pageName}_fcp`, fcp.startTime, 'ms');
        }

        // Largest Contentful Paint (LCP)
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            analyticsService.trackPerformance(`${pageName}_lcp`, lastEntry.startTime, 'ms');
          }
        });

        try {
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // LCP not supported
        }

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.processingStart && entry.startTime) {
              const fid = entry.processingStart - entry.startTime;
              analyticsService.trackPerformance(`${pageName}_fid`, fid, 'ms');
            }
          });
        });

        try {
          fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (e) {
          // FID not supported
        }

        // Cumulative Layout Shift (CLS)
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
            }
          });
          analyticsService.trackPerformance(`${pageName}_cls`, clsScore, 'score');
        });

        try {
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          // CLS not supported
        }

        hasReported.current = true;
      } catch (error) {
        console.debug('Performance monitoring error:', error);
      }
    };

    // Report after page is fully loaded
    if (document.readyState === 'complete') {
      setTimeout(reportPerformanceMetrics, 0);
    } else {
      window.addEventListener('load', reportPerformanceMetrics);
      return () => window.removeEventListener('load', reportPerformanceMetrics);
    }
  }, [pageName]);
}

/**
 * Hook to measure custom timing
 */
export function useTimingMeasure(name: string) {
  const startTimeRef = useRef<number>(0);

  const start = () => {
    startTimeRef.current = performance.now();
  };

  const end = () => {
    if (startTimeRef.current > 0) {
      const duration = performance.now() - startTimeRef.current;
      analyticsService.trackPerformance(name, duration, 'ms');
      startTimeRef.current = 0;
      return duration;
    }
    return 0;
  };

  return { start, end };
}
