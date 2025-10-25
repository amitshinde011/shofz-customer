import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeaturedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FeaturedBadge = ({ size = 'sm', className }: FeaturedBadgeProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-full",
        {
          'text-[10px] px-0.5 py-0.5': size === 'sm',
          'text-xs px-1 py-1': size === 'md',
          'text-sm px-1.5 py-1.5': size === 'lg',
        },
        className
      )}
    >
      <Star className={cn(
        "fill-white",
        {
          'w-2.5 h-2.5': size === 'sm',
          'w-3 h-3': size === 'md',
          'w-4 h-4': size === 'lg',
        }
      )} />
    </div>
  );
};
