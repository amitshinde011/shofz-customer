import { useState, useEffect } from 'react';

export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [prevScrollY, setPrevScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Only update if scroll is more than 10px to avoid jitter
          if (Math.abs(currentScrollY - prevScrollY) > 10) {
            if (currentScrollY > prevScrollY && currentScrollY > 80) {
              // Scrolling down and past threshold
              setScrollDirection('down');
            } else if (currentScrollY < prevScrollY) {
              // Scrolling up
              setScrollDirection('up');
            }
            
            setPrevScrollY(currentScrollY);
          }
          
          ticking = false;
        });
        
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [prevScrollY]);

  return scrollDirection;
}
