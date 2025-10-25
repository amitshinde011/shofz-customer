import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

type AspectRatio = 'square' | 'product' | 'banner' | 'wide' | 'portrait';

interface AmazonImageProps {
  src: string;
  alt: string;
  aspectRatio?: AspectRatio;
  className?: string;
  containerClassName?: string;
  onClick?: () => void;
  loading?: 'eager' | 'lazy';
  fallback?: string;
  objectFit?: 'contain' | 'cover';
}

const aspectRatioClasses: Record<AspectRatio, string> = {
  square: 'aspect-square', // 1:1 - All images use this now
  product: 'aspect-square', // 1:1 - Changed from 3:4
  banner: 'aspect-square', // 1:1 - Changed from 21:9
  wide: 'aspect-square', // 1:1 - Changed from 16:9
  portrait: 'aspect-square', // 1:1 - Changed from 4:5
};

export default function AmazonImage({
  src,
  alt,
  aspectRatio = 'square',
  className = '',
  containerClassName = '',
  onClick,
  loading = 'lazy',
  fallback = '/placeholder.svg',
  objectFit = 'contain',
}: AmazonImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState(src);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
    if (fallback) {
      setImageUrl(fallback);
    }
  };

  const aspectClass = aspectRatioClasses[aspectRatio];
  const cursorClass = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`relative w-full ${aspectClass} bg-white rounded-lg overflow-hidden flex items-center justify-center ${cursorClass} ${containerClassName}`}
      onClick={onClick}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="absolute inset-0 w-full h-full" />
        </div>
      )}

      <img
        src={imageUrl}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        draggable={false}
        style={{ objectPosition: 'center' }}
      />

      {error && !fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
          <div className="text-center p-4">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Image unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Preset components - All use 1:1 square ratio with centered contain
export function ProductImage(props: Omit<AmazonImageProps, 'aspectRatio' | 'objectFit'>) {
  return <AmazonImage {...props} aspectRatio="square" objectFit="contain" />;
}

export function ProductThumbnail(props: Omit<AmazonImageProps, 'aspectRatio' | 'objectFit'>) {
  return <AmazonImage {...props} aspectRatio="square" objectFit="contain" />;
}

export function BannerImage(props: Omit<AmazonImageProps, 'aspectRatio' | 'objectFit'>) {
  return <AmazonImage {...props} aspectRatio="square" objectFit="contain" />;
}

export function ShopImage(props: Omit<AmazonImageProps, 'aspectRatio' | 'objectFit'>) {
  return <AmazonImage {...props} aspectRatio="square" objectFit="contain" />;
}
