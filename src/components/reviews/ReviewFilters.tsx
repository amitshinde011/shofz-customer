import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";

interface ReviewFiltersProps {
  filters: {
    rating: string;
    sort: string;
    verified_only: boolean;
    with_photos: boolean;
  };
  onFilterChange: (key: string, value: any) => void;
}

export function ReviewFilters({ filters, onFilterChange }: ReviewFiltersProps) {
  return (
    <div className="flex items-center space-x-2 flex-wrap gap-2">
      <Select value={filters.rating} onValueChange={(value) => onFilterChange('rating', value)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Ratings</SelectItem>
          <SelectItem value="5">5 Stars</SelectItem>
          <SelectItem value="4">4 Stars</SelectItem>
          <SelectItem value="3">3 Stars</SelectItem>
          <SelectItem value="2">2 Stars</SelectItem>
          <SelectItem value="1">1 Star</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.sort} onValueChange={(value) => onFilterChange('sort', value)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="highest_rated">Highest Rated</SelectItem>
          <SelectItem value="lowest_rated">Lowest Rated</SelectItem>
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-1" />
            Filters
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            checked={filters.verified_only}
            onCheckedChange={(checked) => onFilterChange('verified_only', checked)}
          >
            Verified Purchases Only
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filters.with_photos}
            onCheckedChange={(checked) => onFilterChange('with_photos', checked)}
          >
            Reviews with Photos
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}