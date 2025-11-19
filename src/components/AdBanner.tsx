import { useEffect, useState } from "react";
import { useAdvertisements } from "@/hooks/useAdvertisements";
import { advertisementService } from "@/services/advertisementService";

interface AdBannerProps {
  placement: string;
  className?: string;
}

export const AdBanner = ({ placement, className = "" }: AdBannerProps) => {
  const { data: adsResponse } = useAdvertisements('banner', placement);
  const ads = adsResponse?.data || [];
  const [trackedImpressions, setTrackedImpressions] = useState<Set<string>>(new Set());

  // Pick the highest priority ad
  const ad = ads.length > 0 ? ads[0] : null;

  useEffect(() => {
    if (ad && !trackedImpressions.has(ad.id)) {
      advertisementService.trackImpression(ad.id);
      setTrackedImpressions(prev => new Set([...prev, ad.id]));
    }
  }, [ad]);

  const handleAdClick = () => {
    if (ad) {
      advertisementService.trackClick(ad.id);
      if (ad.link_url) {
        window.open(ad.link_url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  if (!ad) return null;

  return (
    <div className={`w-full max-w-screen-xl mx-auto px-1 ${className}`}>
      <div
        className={`relative aspect-[16/6] sm:aspect-[21/6] rounded-lg overflow-hidden ${
          ad.link_url ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''
        }`}
        onClick={handleAdClick}
      >
        {/* Blurred background layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center blur-xl scale-110"
          style={{ 
            backgroundImage: `url(${ad.image_url})`,
            filter: 'blur(20px) brightness(0.7)'
          }}
        />
        
        {/* Main image on top */}
        <img
          src={ad.image_url}
          alt={ad.title}
          className="relative w-full h-full object-contain z-10"
        />
        
        {ad.title && (
          <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
            <h3 className="text-white font-semibold">{ad.title}</h3>
            {ad.description && (
              <p className="text-white/90 text-sm">{ad.description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
