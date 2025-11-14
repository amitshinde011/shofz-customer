import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Offer } from "@/hooks/useOffers";
import UniversalImage from "./UniversalImage";
import { supabase } from "@/integrations/supabase/client";

interface OfferStoriesViewerProps {
  offers: Offer[];
  initialIndex: number;
  isVisible: boolean;
  onClose: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

export default function OfferStoriesViewer({
  offers,
  initialIndex,
  isVisible,
  onClose,
}: OfferStoriesViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentOffer = offers[currentIndex];

  // Track view for current offer
  useEffect(() => {
    if (!isVisible || !currentOffer?.id) return;

    const trackOfferView = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Get or create session ID
        let sessionId = sessionStorage.getItem('view_session_id');
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem('view_session_id', sessionId);
        }

        // Prepare device info
        const deviceInfo = {
          user_agent: navigator.userAgent,
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          viewport_size: `${window.innerWidth}x${window.innerHeight}`,
          platform: navigator.platform,
          language: navigator.language,
        };

        // Insert view analytics
        const { error } = await supabase.from('viewanalytics' as any).insert({
          entity_type: 'offer',
          entity_id: currentOffer.id,
          viewer_id: user?.id || null,
          viewer_type: user ? 'customer' : 'guest',
          session_id: sessionId,
          device_info: deviceInfo,
        });

        if (error) throw error;

        console.log(`Successfully tracked offer view in carousel:`, currentOffer.id);
      } catch (error) {
        console.log('Carousel view tracking error:', error);
      }
    };

    trackOfferView();
  }, [currentIndex, isVisible, currentOffer?.id]);

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

    // Cleanup: show nav on unmount
    return () => {
      if (navElement) {
        (navElement as HTMLElement).style.display = '';
      }
    };
  }, [isVisible]);

  // Use functional setState to avoid stale closure
  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex < offers.length - 1) {
        return prevIndex + 1;
      } else {
        // Close viewer after last story completes
        setTimeout(() => onClose(), 0);
        return prevIndex;
      }
    });
  }, [offers.length, onClose]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex > 0) {
        return prevIndex - 1;
      }
      return prevIndex;
    });
  }, []);

  const handleGoToOffer = () => {
    onClose();
    navigate(`/offers/${currentOffer.id}`);
  };

  // Auto-advance timer - Uses useCallback to prevent stale closures
  useEffect(() => {
    if (!isVisible || isPaused) {
      // Clear timer if paused or not visible
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Clear any existing timer before starting new one
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Start new timer for current story
    timerRef.current = setTimeout(() => {
      handleNext();
    }, STORY_DURATION);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentIndex, isVisible, isPaused, handleNext]);

  // Reset index when viewer opens
  useEffect(() => {
    if (isVisible) {
      setCurrentIndex(initialIndex);
    }
  }, [isVisible, initialIndex]);

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

  if (!isVisible || !currentOffer) return null;

  const shopLogo = currentOffer.shops?.logo_url;
  const shopName = currentOffer.shops?.name || "Shop";
  const offerImage = currentOffer.image_url || "/placeholder.svg";

  const getDiscountText = () => {
    if (currentOffer.offer_type === "promotion") {
      return "PROMO";
    }
    if (currentOffer.discount_type === "percentage") {
      return `${currentOffer.discount_value}% OFF`;
    } else if (currentOffer.discount_type === "fixed") {
      return `₹${currentOffer.discount_value} OFF`;
    }
    return `${currentOffer.discount_value} OFF`;
  };

  const getValidUntilText = () => {
    if (!currentOffer.valid_until) return "Limited time offer";

    const date = new Date(currentOffer.valid_until);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Correct type assignment for toLocaleDateString options
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit', // This is a valid literal string
        month: 'short'  // This is a valid literal string
    };
    
    if (diffDays < 1) return "Expires today";
    if (diffDays === 1) return "Expires tomorrow";
    if (diffDays <= 7) return `${diffDays} days left`;
    
    return `Valid ${new Date(currentOffer.valid_from).toLocaleDateString('en-GB', options)} - ${date.toLocaleDateString('en-GB', options)}`;
  };

  return (
    <AnimatePresence>
      <motion.div
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
      >
        {/* Background Image */}
        <div
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
          <UniversalImage
            src={offerImage}
            alt={currentOffer.title}
            size="fullscreen"
            containerStyle={{
              width: "100%",
              height: "100%",
              borderRadius: 0,
            }}
            style={{
              objectFit: "contain",
            }}
            loading="eager"
          />
        </div>

        {/* Removed dark overlay for brighter viewing */}

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
              isActive={index === currentIndex}
              isCompleted={index < currentIndex}
              duration={STORY_DURATION}
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

          <button
            onClick={onClose}
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
              cursor: "pointer",
              zIndex: 20,
              flexShrink: 0,
            }}
          >
            <X color="white" size={20} strokeWidth={3} />
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

        {/* Touch/Click Areas for Navigation - MAXIMIZED */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrevious}
            style={{
              position: "absolute",
              left: 0,
              top: "100px",
              bottom: "100px",
              width: "40%",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              paddingLeft: "16px",
            }}
            onMouseEnter={(e) => {
              const icon = e.currentTarget.querySelector("div");
              if (icon) (icon as HTMLElement).style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              const icon = e.currentTarget.querySelector("div");
              if (icon) (icon as HTMLElement).style.opacity = "0";
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0,
                transition: "opacity 0.2s ease",
              }}
            >
              <ChevronLeft color="white" size={24} />
            </div>
          </button>
        )}

        {currentIndex < offers.length - 1 && (
          <button
            onClick={handleNext}
            style={{
              position: "absolute",
              right: 0,
              top: "100px",
              bottom: "100px",
              width: "40%",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: "16px",
            }}
            onMouseEnter={(e) => {
              const icon = e.currentTarget.querySelector("div");
              if (icon) (icon as HTMLElement).style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              const icon = e.currentTarget.querySelector("div");
              if (icon) (icon as HTMLElement).style.opacity = "0";
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0,
                transition: "opacity 0.2s ease",
              }}
            >
              <ChevronRight color="white" size={24} />
            </div>
          </button>
        )}

        {/* Pause on hover (desktop) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        />
      </motion.div>
    </AnimatePresence>
  );
}

// Progress Bar Component - Fixed to sync with timer
function ProgressBar({
  isActive,
  isCompleted,
  duration,
}: {
  isActive: boolean;
  isCompleted: boolean;
  duration: number;
}) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isActive) {
      setProgress(isCompleted ? 100 : 0);
      return;
    }

    // Reset progress to 0 immediately when becoming active
    setProgress(0);

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 16); // ~60fps

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isCompleted, duration]);

  return (
    <div
      style={{
        flex: 1,
        height: "3px",
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        borderRadius: "2px",
        overflow: "hidden",
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