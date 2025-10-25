import { useState } from "react";
import { motion } from "framer-motion";

export type ImageSize = "thumbnail" | "story" | "card" | "banner" | "fullscreen";

interface UniversalImageProps {
  src: string;
  alt: string;
  size?: ImageSize;
  className?: string;
  style?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  onClick?: () => void;
  loading?: "lazy" | "eager";
}

// Size definitions for different contexts
const SIZE_DIMENSIONS: Record<
  ImageSize,
  {
    mobile: { width: string; height: string };
    tablet: { width: string; height: string };
    desktop: { width: string; height: string };
  }
> = {
  thumbnail: {
    mobile: { width: "60px", height: "60px" },
    tablet: { width: "80px", height: "80px" },
    desktop: { width: "100px", height: "100px" },
  },
  story: {
    mobile: { width: "68px", height: "68px" },
    tablet: { width: "85px", height: "85px" },
    desktop: { width: "100px", height: "100px" },
  },
  card: {
    mobile: { width: "100%", height: "200px" },
    tablet: { width: "100%", height: "240px" },
    desktop: { width: "100%", height: "300px" },
  },
  banner: {
    mobile: { width: "100%", height: "120px" },
    tablet: { width: "100%", height: "160px" },
    desktop: { width: "100%", height: "200px" },
  },
  fullscreen: {
    mobile: { width: "100vw", height: "100vh" },
    tablet: { width: "100vw", height: "100vh" },
    desktop: { width: "100vw", height: "100vh" },
  },
};

export default function UniversalImage({
  src,
  alt,
  size = "card",
  className = "",
  style = {},
  containerStyle = {},
  onClick,
  loading = "lazy",
}: UniversalImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const dimensions = SIZE_DIMENSIONS[size];

  // Base container styles
  const baseContainerStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    borderRadius: size === "story" || size === "thumbnail" ? "50%" : "8px",
    ...containerStyle,
  };

  // Base image styles - object-fit: contain ensures full visibility
  const baseImageStyle: React.CSSProperties = {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    opacity: isLoaded ? 1 : 0,
    transition: "opacity 0.3s ease",
    ...style,
  };

  // Skeleton loader styles
  const skeletonStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  };

  // Error placeholder styles
  const errorStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0e0e0",
    color: "#999",
    fontSize: "12px",
    fontWeight: 500,
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }

          .universal-image-container {
            width: ${dimensions.mobile.width};
            height: ${dimensions.mobile.height};
          }

          @media (min-width: 600px) {
            .universal-image-container {
              width: ${dimensions.tablet.width};
              height: ${dimensions.tablet.height};
            }
          }

          @media (min-width: 1024px) {
            .universal-image-container {
              width: ${dimensions.desktop.width};
              height: ${dimensions.desktop.height};
            }
          }
        `}
      </style>

      <motion.div
        className={`universal-image-container ${className}`}
        style={baseContainerStyle}
        onClick={onClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Skeleton Loader */}
        {!isLoaded && !hasError && <div style={skeletonStyle} />}

        {/* Error State */}
        {hasError && (
          <div style={errorStyle}>
            <span>Image unavailable</span>
          </div>
        )}

        {/* Actual Image */}
        {!hasError && (
          <img
            src={src}
            alt={alt}
            style={baseImageStyle}
            onLoad={handleLoad}
            onError={handleError}
            loading={loading}
            draggable={false}
          />
        )}
      </motion.div>
    </>
  );
}

// Export responsive image wrapper with custom dimensions
export function ResponsiveImageContainer({
  children,
  width,
  height,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  width?: { mobile?: string; tablet?: string; desktop?: string };
  height?: { mobile?: string; tablet?: string; desktop?: string };
  className?: string;
  style?: React.CSSProperties;
}) {
  const containerStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    ...style,
  };

  return (
    <>
      <style>
        {`
          .responsive-image-wrapper {
            ${width?.mobile ? `width: ${width.mobile};` : ""}
            ${height?.mobile ? `height: ${height.mobile};` : ""}
          }

          @media (min-width: 600px) {
            .responsive-image-wrapper {
              ${width?.tablet ? `width: ${width.tablet};` : ""}
              ${height?.tablet ? `height: ${height.tablet};` : ""}
            }
          }

          @media (min-width: 1024px) {
            .responsive-image-wrapper {
              ${width?.desktop ? `width: ${width.desktop};` : ""}
              ${height?.desktop ? `height: ${height.desktop};` : ""}
            }
          }
        `}
      </style>

      <div className={`responsive-image-wrapper ${className}`} style={containerStyle}>
        {children}
      </div>
    </>
  );
}
