import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
  readonly?: boolean;
}

export function StarRating({ 
  rating, 
  onRatingChange, 
  size = 'medium', 
  readonly = false 
}: StarRatingProps) {
  const starSize = size === 'large' ? 'w-8 h-8' : size === 'small' ? 'w-3 h-3' : 'w-5 h-5';

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onRatingChange?.(star)}
          className={`${starSize} ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } transition-transform`}
          disabled={readonly}
        >
          <Star
            className={`w-full h-full ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}