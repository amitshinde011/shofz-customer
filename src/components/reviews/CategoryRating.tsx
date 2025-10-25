import { StarRating } from "./StarRating";

interface CategoryRatingProps {
  label: string;
  rating: number;
  onRatingChange: (rating: number) => void;
}

export function CategoryRating({ label, rating, onRatingChange }: CategoryRatingProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <StarRating rating={rating} onRatingChange={onRatingChange} size="small" />
    </div>
  );
}