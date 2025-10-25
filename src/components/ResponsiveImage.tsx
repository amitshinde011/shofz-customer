import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

type ImageSize = 'thumbnail' | 'card' | 'detail' | 'gallery' | 'profile' | 'profile-sm' | 'profile-xs' | 'banner' | 'square' | 'portrait' | 'landscape';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  size?: ImageSize;
  className?: string;
  onClick?: () => void;
  loading?: 'eager' | 'lazy';
  fallback?: string;
  gradientOverlay?: boolean;
  objectFit?: 'cover' | 'contain';
  profileRing?: boolean;
}

const sizeClasses: Record<ImageSize, string> = {
  thumbnail: 'relative w-20 h-20 aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center',
  card: 'relative w-full aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center',
  detail: 'relative w-full aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center max-w-2xl',
  gallery: 'relative w-full aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center',
  profile: 'relative w-full aspect-square bg-white rounded-full overflow-hidden flex items-center justify-center',
  'profile-sm': 'relative w-12 h-12 aspect-square bg-white rounded-full overflow-hidden flex items-center justify-center',
  'profile-xs': 'relative w-8 h-8 aspect-square bg-white rounded-full overflow-hidden flex items-center justify-center',
  banner: 'relative w-full aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center',
  square: 'relative w-full aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center',
  portrait: 'relative w-full aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center',
  landscape: 'relative w-full aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center',
};

export const ResponsiveImage = ({
  src,
  alt,
  size = 'card',
  className = '',
  onClick,
  loading = 'lazy',
  fallback = '/placeholder.svg',
  gradientOverlay = false,
  objectFit = 'contain',
  profileRing = false,
}: ResponsiveImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState(src);

  // Sync imageUrl with src prop changes
  useEffect(() => {
    setImageUrl(src);
    setIsLoading(true);
    setError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
    setImageUrl(fallback);
  };

  let containerClass = sizeClasses[size];

  // Add profile ring if requested
  if (profileRing && size.startsWith('profile')) {
    containerClass = containerClass.replace('img-container-profile', 'img-container-profile-ring');
  }

  const cursorClass = onClick ? 'cursor-pointer' : '';
  const combinedClassName = `${containerClass} ${cursorClass} ${className}`.trim();

  const handleClick = onClick ? (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  } : undefined;

  return (
    <div className={combinedClassName} onClick={handleClick}>
      {isLoading && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      <img
        src={imageUrl}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`max-w-full max-h-full w-auto h-auto transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ objectFit, objectPosition: 'center' }}
      />
      {gradientOverlay && !isLoading && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      )}
    </div>
  );
};
