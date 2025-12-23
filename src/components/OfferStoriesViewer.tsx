import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Offer } from "@/hooks/useOffers";
import UniversalImage from "./UniversalImage";
import { getOfferDiscountText } from "@/lib/offerUtils";
import { useMarkOfferViewed } from "@/hooks/useSmartOffers";

interface OfferStoriesViewerProps {
  offers: Offer[];
  initialIndex: number;
  isVisible: boolean;
  onClose: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story
const HOLD_TO_PAUSE_DELAY = 150; // ms to hold before pausing
const SWIPE_THRESHOLD = 50; // minimum px for swipe detection
const SWIPE_DOWN_THRESHOLD = 100; // minimum px for swipe down to close
const VIEW_TRACKING_THRESHOLD = 0.5; // 50% progress to mark as viewed

export default function OfferStoriesViewer({
  offers,
  initialIndex,
  isVisible,
  onClose,
}: OfferStoriesViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [storyStartTime, setStoryStartTime] = useState<number>(Date.now());
  const [navigationDirection, setNavigationDirection] = useState<'left' | 'right' | null>(null);
  const [showTapFeedback, setShowTapFeedback] = useState<'left' | 'right' | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0); // State for real-time sync
  
  // Sync currentIndex with initialIndex when viewer opens
  useEffect(() => {
    if (isVisible) {
      setCurrentIndex(initialIndex);
    }
  }, [isVisible, initialIndex]);
  
  const navigate = useNavigate();
  const markOfferViewed = useMarkOfferViewed();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pause tracking refs
  const pauseStartRef = useRef<number | null>(null);
  const accumulatedPauseRef = useRef<number>(0);
  
  // View tracking ref - to mark as viewed only once per story
  const viewedCurrentRef = useRef(false);
  
  // Touch gesture refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  
  // Desktop mouse hold refs
  const mouseHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseHoldingRef = useRef(false);
  
  // Preload refs
  const preloadedImagesRef = useRef<Set<string>>(new Set());

  const currentOffer = offers[currentIndex];
  const nextOffer = offers[currentIndex + 1];

  // Preload next image for smooth transitions
  useEffect(() => {
    if (nextOffer?.image_url && !preloadedImagesRef.current.has(nextOffer.image_url)) {
      const img = new Image();
      img.src = nextOffer.image_url;
      img.onload = () => {
        preloadedImagesRef.current.add(nextOffer.image_url!);
      };
    }
  }, [nextOffer?.image_url]);

  // Hide bottom navigation when viewer is open
  useEffect(() => {
    const navElement = document.querySelector('.nav-bottom-enhanced');
    if (navElement) {
      if (isVisible) {
        (navElement as HTMLElement).style.display = 'none';
      } else {
        (navElement as HTMLElement).style.display = '';
      }
    }

    return () => {
      if (navElement) {
        (navElement as HTMLElement).style.display = '';
      }
    };
  }, [isVisible]);

  // Track pause duration for timer compensation - updates state for real-time sync
  useEffect(() => {
    if (isPaused) {
      pauseStartRef.current = Date.now();
    } else if (pauseStartRef.current !== null) {
      // Add the pause duration to accumulated time
      const pauseDuration = Date.now() - pauseStartRef.current;
      accumulatedPauseRef.current += pauseDuration;
      setTotalPausedTime(accumulatedPauseRef.current); // Trigger state update for ProgressBar
      pauseStartRef.current = null;
    }
  }, [isPaused]);

  // Navigation with direction tracking
  const handleNext = useCallback(() => {
    setNavigationDirection('right');
    setCurrentIndex((prevIndex) => {
      if (prevIndex < offers.length - 1) {
        return prevIndex + 1;
      } else {
        setTimeout(() => onClose(), 0);
        return prevIndex;
      }
    });
  }, [offers.length, onClose]);

  const handlePrevious = useCallback(() => {
    setNavigationDirection('left');
    setCurrentIndex((prevIndex) => {
      if (prevIndex > 0) {
        return prevIndex - 1;
      }
      return prevIndex;
    });
  }, []);

  const handleGoToOffer = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tap zone conflict
    onClose();
    navigate(`/offers/${currentOffer.id}`);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tap zone conflict
    onClose();
  };

  // Reset state when story changes
  useEffect(() => {
    if (isVisible) {
      setIsImageLoaded(false);
      accumulatedPauseRef.current = 0;
      setTotalPausedTime(0);
      pauseStartRef.current = null;
      viewedCurrentRef.current = false;
    }
  }, [currentIndex, isVisible]);

  // Start timer only after image loads
  useEffect(() => {
    if (isVisible && isImageLoaded) {
      setStoryStartTime(Date.now());
    }
  }, [currentIndex, isVisible, isImageLoaded]);

  // Track view at 50% progress
  useEffect(() => {
    if (!isVisible || !isImageLoaded || isPaused || viewedCurrentRef.current) return;

    const checkViewProgress = () => {
      const elapsed = Date.now() - storyStartTime - accumulatedPauseRef.current;
      const progress = elapsed / STORY_DURATION;
      
      if (progress >= VIEW_TRACKING_THRESHOLD && !viewedCurrentRef.current) {
        viewedCurrentRef.current = true;
        markOfferViewed(currentOffer.id);
      }
    };

    const intervalId = setInterval(checkViewProgress, 100);
    return () => clearInterval(intervalId);
  }, [isVisible, isImageLoaded, isPaused, storyStartTime, currentOffer?.id, markOfferViewed]);

  // Auto-advance timer with pause compensation
  useEffect(() => {
    if (!isVisible || isPaused || !isImageLoaded) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Calculate remaining time accounting for pauses
    const elapsed = Date.now() - storyStartTime - accumulatedPauseRef.current;
    const remaining = Math.max(STORY_DURATION - elapsed, 0);

    timerRef.current = setTimeout(() => {
      handleNext();
    }, remaining);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentIndex, isVisible, isPaused, isImageLoaded, storyStartTime, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, handleNext, handlePrevious, onClose]);

  // Touch gesture handlers for Instagram-style navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isHoldingRef.current = false;
    
    // Start hold-to-pause timer
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      setIsPaused(true);
    }, HOLD_TO_PAUSE_DELAY);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // If user moves finger, cancel the hold
    if (touchStartRef.current && holdTimerRef.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear hold timer
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // If was holding (paused), just resume
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setIsPaused(false);
      return;
    }

    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const timeDelta = Date.now() - touchStartRef.current.time;
    const screenWidth = window.innerWidth;

    // Check for swipe down to close
    if (deltaY > SWIPE_DOWN_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX) && timeDelta < 400) {
      onClose();
      touchStartRef.current = null;
      return;
    }

    // Check if it's a horizontal swipe
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) && timeDelta < 300) {
      if (deltaX < 0) {
        // Swipe left = next
        handleNext();
      } else {
        // Swipe right = previous
        handlePrevious();
      }
    } else if (timeDelta < 200 && Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
      // It's a tap - determine left or right side (exclude middle for buttons)
      const tapX = touchStartRef.current.x;
      
      if (tapX < screenWidth * 0.25) {
        // Tap on left 25% = previous
        setShowTapFeedback('left');
        setTimeout(() => setShowTapFeedback(null), 150);
        handlePrevious();
      } else if (tapX > screenWidth * 0.75) {
        // Tap on right 25% = next
        setShowTapFeedback('right');
        setTimeout(() => setShowTapFeedback(null), 150);
        handleNext();
      }
      // Middle 50% - no action (allow tapping on buttons like close)
    }

    touchStartRef.current = null;
  }, [handleNext, handlePrevious, onClose]);

  // Desktop mouse hold-to-pause handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only apply to direct clicks on the viewer, not on buttons
    if ((e.target as HTMLElement).closest('button')) return;
    
    isMouseHoldingRef.current = false;
    mouseHoldTimerRef.current = setTimeout(() => {
      isMouseHoldingRef.current = true;
      setIsPaused(true);
    }, HOLD_TO_PAUSE_DELAY);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (mouseHoldTimerRef.current) {
      clearTimeout(mouseHoldTimerRef.current);
      mouseHoldTimerRef.current = null;
    }
    
    if (isMouseHoldingRef.current) {
      isMouseHoldingRef.current = false;
      setIsPaused(false);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Resume if mouse leaves while holding
    if (mouseHoldTimerRef.current) {
      clearTimeout(mouseHoldTimerRef.current);
      mouseHoldTimerRef.current = null;
    }
    if (isMouseHoldingRef.current) {
      isMouseHoldingRef.current = false;
      setIsPaused(false);
    }
  }, []);

  // Image load handler
  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (mouseHoldTimerRef.current) clearTimeout(mouseHoldTimerRef.current);
    };
  }, []);

  const shopLogo = currentOffer?.shops?.logo_url;
  const shopName = currentOffer?.shops?.name || "Shop";
  const offerImage = currentOffer?.image_url || "/placeholder.svg";

  const getDiscountText = () => currentOffer ? getOfferDiscountText(currentOffer) : "";

  const getValidUntilText = () => {
    if (!currentOffer?.valid_until) return "Limited time offer";

    const date = new Date(currentOffer.valid_until);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short'
    };
    
    if (diffDays < 1) return "Expires today";
    if (diffDays === 1) return "Expires tomorrow";
    if (diffDays <= 7) return `${diffDays} days left`;
    
    return `Valid ${new Date(currentOffer.valid_from).toLocaleDateString('en-GB', options)} - ${date.toLocaleDateString('en-GB', options)}`;
  };

  // Slide animation variants
  const slideVariants = {
    enter: (direction: 'left' | 'right' | null) => ({
      x: direction === 'right' ? 100 : direction === 'left' ? -100 : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'left' | 'right' | null) => ({
      x: direction === 'right' ? -100 : direction === 'left' ? 100 : 0,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && currentOffer && (
        <motion.div
          key="story-viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: "black",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Tap Feedback Overlays */}
          <AnimatePresence>
            {showTapFeedback === 'left' && (
              <motion.div
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "25%",
                  background: "radial-gradient(circle at left center, rgba(255,255,255,0.2) 0%, transparent 70%)",
                  zIndex: 2,
                  pointerEvents: "none",
                }}
              />
            )}
            {showTapFeedback === 'right' && (
              <motion.div
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: "25%",
                  background: "radial-gradient(circle at right center, rgba(255,255,255,0.2) 0%, transparent 70%)",
                  zIndex: 2,
                  pointerEvents: "none",
                }}
              />
            )}
          </AnimatePresence>

          {/* Story Image with Transition */}
          <AnimatePresence mode="wait" custom={navigationDirection}>
            <motion.div
              key={currentOffer.id}
              custom={navigationDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#000",
              }}
            >
              {/* Loading state */}
              {!isImageLoaded && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 3,
                  }}
                >
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              
              <img
                src={offerImage}
                alt={currentOffer.title}
                onLoad={handleImageLoad}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  opacity: isImageLoaded ? 1 : 0,
                  transition: "opacity 0.2s ease",
                }}
                loading="eager"
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>

          {/* Progress Bars */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              display: "flex",
              gap: "4px",
              padding: "12px 16px",
              zIndex: 10,
            }}
          >
            {offers.map((_, index) => (
              <ProgressBar
                key={index}
                isActive={index === currentIndex && isImageLoaded}
                isCompleted={index < currentIndex}
                duration={STORY_DURATION}
                isPaused={isPaused}
                startTime={index === currentIndex ? storyStartTime : undefined}
                totalPausedTime={index === currentIndex ? totalPausedTime : 0}
              />
            ))}
          </div>

          {/* Header */}
          <div
            style={{
              position: "absolute",
              top: "48px",
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 16px",
              zIndex: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {shopLogo && (
                <UniversalImage
                  src={shopLogo}
                  alt={shopName}
                  size="thumbnail"
                  containerStyle={{
                    width: "40px",
                    height: "40px",
                    border: "2px solid white",
                  }}
                  style={{
                    objectFit: "cover",
                  }}
                />
              )}
              <div>
                <p
                  style={{
                    color: "white",
                    fontSize: "14px",
                    fontWeight: 600,
                    margin: 0,
                    textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {shopName}
                </p>
              </div>
            </div>

            {/* Close button with larger tap zone and stopPropagation */}
            <button
              onClick={handleClose}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "transparent",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 30,
                flexShrink: 0,
                padding: 0,
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                  backdropFilter: "blur(8px)",
                  border: "2px solid rgba(255, 255, 255, 0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X color="white" size={20} strokeWidth={3} />
              </div>
            </button>
          </div>

          {/* Glassmorphic Details Overlay */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "12px",
              paddingBottom: "16px",
              zIndex: 10,
            }}
          >
            <div
              style={{
                background: "rgba(128, 128, 128, 0.5)",
                borderRadius: "16px",
                padding: "16px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              }}
            >
              <h2
                style={{
                  color: "white",
                  fontSize: "20px",
                  fontWeight: 800,
                  margin: "0 0 6px 0",
                  textShadow: "0 2px 6px rgba(0,0,0,0.8)",
                  letterSpacing: "0.01em",
                  lineHeight: "1.2",
                }}
              >
                {currentOffer.title}
              </h2>

              {currentOffer.description && (
                <p
                  style={{
                    color: "white",
                    fontSize: "13px",
                    margin: "0 0 10px 0",
                    lineHeight: "1.4",
                    textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {currentOffer.description}
                </p>
              )}

              <div style={{ marginBottom: "12px" }}>
                <p
                  style={{
                    color: "white",
                    fontSize: "28px",
                    fontWeight: 900,
                    margin: "0 0 2px 0",
                    textShadow: "0 2px 6px rgba(0,0,0,0.8)",
                  }}
                >
                  {getDiscountText()}
                </p>
                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    fontSize: "12px",
                    margin: 0,
                    textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                  }}
                >
                  {getValidUntilText()}
                </p>
              </div>

              <button
                onClick={handleGoToOffer}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255, 255, 255, 0.25)",
                  border: "2px solid white",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.35)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                View Offer Details
                <ExternalLink size={16} />
              </button>
            </div>
          </motion.div>

          {/* Desktop Navigation Buttons (hidden on mobile) */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrevious}
              className="hidden md:flex"
              style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                border: "none",
                cursor: "pointer",
                zIndex: 15,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft color="white" size={24} />
            </button>
          )}

          {currentIndex < offers.length - 1 && (
            <button
              onClick={handleNext}
              className="hidden md:flex"
              style={{
                position: "absolute",
                right: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                border: "none",
                cursor: "pointer",
                zIndex: 15,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronRight color="white" size={24} />
            </button>
          )}

          {/* Paused Indicator */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                  borderRadius: "50%",
                  width: "60px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 15,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: "12px",
                    height: "24px",
                    display: "flex",
                    gap: "4px",
                  }}
                >
                  <div style={{ width: "4px", height: "100%", backgroundColor: "white", borderRadius: "2px" }} />
                  <div style={{ width: "4px", height: "100%", backgroundColor: "white", borderRadius: "2px" }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Progress Bar Component - Synced with parent timer including pause compensation
function ProgressBar({
  isActive,
  isCompleted,
  duration,
  isPaused,
  startTime,
  totalPausedTime = 0,
}: {
  isActive: boolean;
  isCompleted: boolean;
  duration: number;
  isPaused: boolean;
  startTime?: number;
  totalPausedTime?: number;
}) {
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (!isActive || !startTime) {
      setProgress(isCompleted ? 100 : 0);
      return;
    }

    if (isPaused) {
      // Keep current progress, don't animate
      return;
    }

    const animate = () => {
      const elapsed = Date.now() - startTime - totalPausedTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isActive, isCompleted, duration, isPaused, startTime, totalPausedTime]);

  return (
    <div
      style={{
        flex: 1,
        height: "3px",
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        borderRadius: "2px",
        overflow: "hidden",
        // Visual pause indicator - subtle opacity change
        opacity: isPaused && isActive ? 0.7 : 1,
        transition: "opacity 0.15s ease",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: "white",
          borderRadius: "2px",
          transition: isActive ? "none" : "width 0.2s ease",
        }}
      />
    </div>
  );
}
