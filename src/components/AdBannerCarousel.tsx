import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAdvertisements } from "@/hooks/useAdvertisements";
import { advertisementService } from "@/services/advertisementService";
import Autoplay from "embla-carousel-autoplay";

interface AdBannerCarouselProps {
  placement?: string;
}

export const AdBannerCarousel = ({ placement = 'home-top' }: AdBannerCarouselProps) => {
  const { data: adsResponse } = useAdvertisements('carousel', placement);
  const ads = adsResponse?.data || [];
  const [trackedImpressions, setTrackedImpressions] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Track impressions for all visible ads (once per session)
    ads.forEach(ad => {
      if (!trackedImpressions.has(ad.id)) {
        advertisementService.trackImpression(ad.id);
        setTrackedImpressions(prev => new Set([...prev, ad.id]));
      }
    });
  }, [ads]);

  const handleAdClick = (ad: any) => {
    advertisementService.trackClick(ad.id);
    if (ad.link_url) {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!ads || ads.length === 0) return null;

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 py-4">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 4000,
            stopOnInteraction: true,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent>
          {ads.map((ad) => (
            <CarouselItem key={ad.id}>
              <div
                className={`relative aspect-[16/6] sm:aspect-[21/6] rounded-lg overflow-hidden ${
                  ad.link_url ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''
                }`}
                onClick={() => handleAdClick(ad)}
              >
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />
                {ad.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <h3 className="text-white font-semibold text-lg">{ad.title}</h3>
                    {ad.description && (
                      <p className="text-white/90 text-sm mt-1">{ad.description}</p>
                    )}
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {ads.length > 1 && (
          <>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </>
        )}
      </Carousel>
    </div>
  );
};
